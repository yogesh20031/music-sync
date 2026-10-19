"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useGuestRoom } from "@/hooks/useGuestRoom";
import { useTicker } from "@/hooks/useTicker";
import { useVisibilityResync } from "@/hooks/useVisibilityResync";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useYouTubeSync } from "@/hooks/useYouTubeSync";
import { localToHost } from "@/lib/clock";
import { msUntilStart, positionAtHostTime, sourceOf } from "@/lib/playback-state";
import { BluetoothTip } from "./BluetoothTip";
import { NowPlayingCard } from "./NowPlayingCard";
import { NudgeControl } from "./NudgeControl";
import { ReadyGate } from "./ReadyGate";
import { StatusBanner } from "./StatusBanner";
import { SyncStatus } from "./SyncStatus";
import { VolumeControl } from "./VolumeControl";
import { YouTubePlayer } from "./YouTubePlayer";

type DecodedTrack = { trackId: string; audio: AudioBuffer };

export function GuestRoom({ code, name }: { code: string; name: string }) {
  const room = useGuestRoom(code, name);
  const { engine, unlocked, unlock, tryResume } = useAudioEngine();
  const wakeLock = useWakeLock();
  const [ready, setReady] = useState(false);
  const [decoded, setDecoded] = useState<DecodedTrack | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [nudgeMs, setNudgeMs] = useState(0);
  const [volume, setVolume] = useState(1);
  const youtubeRef = useRef<HTMLDivElement>(null);

  const { playback, track, clock, sendStatus } = room;
  const source = sourceOf(playback);
  const videoId = source?.kind === "youtube" ? source.videoId : null;

  // Decode once the whole file has arrived. Decoding is async, so this is a
  // real side effect rather than derived state.
  useEffect(() => {
    const data = track?.data;
    const trackId = track?.meta.id;
    if (!data || !trackId) return;
    let cancelled = false;
    engine
      .decode(data)
      .then((audio) => {
        if (cancelled) return;
        setDecoded({ trackId, audio });
        setDecodeError(null);
      })
      .catch(() => {
        if (!cancelled) setDecodeError("This phone cannot decode that file format.");
      });
    return () => {
      cancelled = true;
    };
  }, [engine, track]);

  const { resync } = useAudioPlayer({
    engine,
    buffer: decoded?.audio ?? null,
    bufferTrackId: decoded?.trackId ?? null,
    playback,
    offsetMs: clock.offsetMs,
    nudgeMs,
    unlocked,
  });
  const youtube = useYouTubeSync({
    containerRef: youtubeRef,
    videoId,
    playback,
    offsetMs: clock.offsetMs,
    nudgeMs,
  });
  useVisibilityResync(() => {
    void tryResume().then(resync);
  });

  // Keep the host's member list current.
  const offsetMs = clock.offsetMs;
  const rttMs = clock.estimate?.rttMs ?? null;
  const progress = track?.progress ?? 0;
  const decodedTrackId = decoded?.trackId ?? null;
  const connectionKind = room.status.kind;
  useEffect(() => {
    if (connectionKind !== "connected") return;
    sendStatus({ ready, trackId: decodedTrackId, progress, offsetMs, rttMs });
  }, [sendStatus, connectionKind, ready, decodedTrackId, progress, offsetMs, rttMs]);

  const now = useTicker(playback.status !== "idle");
  const hostNow = now === null ? null : localToHost(now, offsetMs ?? 0);
  const positionMs = hostNow === null ? null : positionAtHostTime(playback, hostNow);
  const countdownMs = hostNow === null ? null : msUntilStart(playback, hostNow);

  const becomeReady = async () => {
    await unlock();
    void wakeLock.request();
    youtube.arm();
    setReady(true);
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    engine.setVolume(value);
  };

  const needsGate = !ready || !unlocked;

  return (
    <Screen className="space-y-5">
      <LargeTitle title="Listening" subtitle={`Room ${code}`} back={{ href: "/", label: "Home" }} />
      <StatusBanner status={room.status} />
      {needsGate && <ReadyGate resume={ready} onReady={() => void becomeReady()} />}
      {source ? (
        <NowPlayingCard source={source} status={playback.status} msUntilStart={countdownMs} positionMs={positionMs} />
      ) : (
        <Card className="text-center">
          <p className="text-headline text-label">Waiting for the host</p>
          <p className="mt-1 text-footnote text-label-secondary">Playback starts here the moment the host schedules it.</p>
        </Card>
      )}
      {videoId && (
        <YouTubePlayer
          containerRef={youtubeRef}
          needsArm={ready && youtube.playerReady && !youtube.prewarmed && !youtube.isPlaying}
          onArm={youtube.arm}
          driftMs={youtube.driftMs}
        />
      )}
      <SyncStatus estimate={clock.estimate} download={track} decoded={decoded !== null && decoded.trackId === track?.meta.id} decodeError={decodeError} />
      <InsetGroup header="This device" footer="If this phone sounds early or late next to the others, slide Nudge until it lines up.">
        <NudgeControl valueMs={nudgeMs} onChange={setNudgeMs} />
        <VolumeControl value={volume} onChange={changeVolume} />
        <ListRow
          label="Resync now"
          detail={wakeLock.active ? "Screen will stay awake" : "Keep the screen on while listening"}
          trailing={<Button variant="tinted" size="sm" onClick={resync}>Resync</Button>}
        />
      </InsetGroup>
      <BluetoothTip />
    </Screen>
  );
}
