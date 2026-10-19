import { useCallback, useEffect, useRef } from "react";
import type { AudioEngine } from "@/lib/audio-engine";
import { hostToLocal, localToHost } from "@/lib/clock";
import { positionAtHostTime } from "@/lib/playback-state";
import type { PlaybackState } from "@/lib/protocol";

type AudioPlayerOptions = {
  engine: AudioEngine;
  buffer: AudioBuffer | null;
  bufferTrackId: string | null;
  playback: PlaybackState;
  offsetMs: number | null;
  nudgeMs: number;
  unlocked: boolean;
};

type Applied = { anchorHostTime: number; anchorPositionMs: number; offsetMs: number; nudgeMs: number };

// Clock estimates wobble by a few ms between pings; restarting the source for
// that would be audible, so only reschedule past this threshold.
const RESCHEDULE_OFFSET_MS = 15;
const DRIFT_CHECK_MS = 30000;
const DRIFT_TOLERANCE_MS = 40;

export function useAudioPlayer({
  engine,
  buffer,
  bufferTrackId,
  playback,
  offsetMs,
  nudgeMs,
  unlocked,
}: AudioPlayerOptions) {
  const appliedRef = useRef<Applied | null>(null);

  const schedule = useCallback(
    (force: boolean) => {
      const playable =
        unlocked &&
        buffer !== null &&
        offsetMs !== null &&
        playback.status === "playing" &&
        playback.source.kind === "file" &&
        playback.source.trackId === bufferTrackId;
      if (!playable || playback.status !== "playing") {
        engine.stop();
        appliedRef.current = null;
        return;
      }
      const applied = appliedRef.current;
      const sameAnchor =
        applied !== null &&
        applied.anchorHostTime === playback.anchorHostTime &&
        applied.anchorPositionMs === playback.anchorPositionMs;
      const smallChange =
        applied !== null &&
        Math.abs(applied.offsetMs - offsetMs) < RESCHEDULE_OFFSET_MS &&
        applied.nudgeMs === nudgeMs;
      if (!force && sameAnchor && smallChange && engine.isPlaying) return;

      engine.play(buffer, hostToLocal(playback.anchorHostTime, offsetMs), playback.anchorPositionMs, nudgeMs);
      appliedRef.current = {
        anchorHostTime: playback.anchorHostTime,
        anchorPositionMs: playback.anchorPositionMs,
        offsetMs,
        nudgeMs,
      };
    },
    [engine, buffer, bufferTrackId, playback, offsetMs, nudgeMs, unlocked],
  );

  useEffect(() => {
    schedule(false);
  }, [schedule]);

  useEffect(() => () => engine.stop(), [engine]);

  // Device audio clocks drift from the host over long tracks; hard-correct
  // occasionally rather than let it accumulate.
  useEffect(() => {
    if (playback.status !== "playing" || offsetMs === null) return;
    const id = window.setInterval(() => {
      const actual = engine.currentPositionMs();
      if (actual === null) return;
      const expected = positionAtHostTime(playback, localToHost(performance.now(), offsetMs));
      if (expected !== null && Math.abs(expected - actual) > DRIFT_TOLERANCE_MS) schedule(true);
    }, DRIFT_CHECK_MS);
    return () => window.clearInterval(id);
  }, [engine, playback, offsetMs, schedule]);

  const resync = useCallback(() => schedule(true), [schedule]);

  return { resync };
}
