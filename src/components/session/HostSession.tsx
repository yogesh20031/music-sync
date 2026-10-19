"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlassBar } from "@/components/ui/GlassBar";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useHostRoom } from "@/hooks/useHostRoom";
import { useTicker } from "@/hooks/useTicker";
import { useVisibilityResync } from "@/hooks/useVisibilityResync";
import { useYouTubeSync } from "@/hooks/useYouTubeSync";
import { formatBytes } from "@/lib/format";
import { COMMAND_LEAD_MS, msUntilStart, pauseAt, playFrom, positionAtHostTime, stopped } from "@/lib/playback-state";
import type { Source, TrackMeta } from "@/lib/protocol";
import { randomId } from "@/lib/room-code";
import { MAX_TRACK_BYTES } from "@/lib/transfer";
import { BluetoothTip } from "./BluetoothTip";
import { MemberList } from "./MemberList";
import { NowPlayingCard } from "./NowPlayingCard";
import { NudgeControl } from "./NudgeControl";
import { PlaybackControls } from "./PlaybackControls";
import { RoomCodeCard } from "./RoomCodeCard";
import { SchedulePicker } from "./SchedulePicker";
import { SourcePicker, type SourceKind } from "./SourcePicker";
import { VolumeControl } from "./VolumeControl";
import { YouTubePlayer } from "./YouTubePlayer";

type HostTrack = { meta: TrackMeta; buffer: AudioBuffer };
type FileState = { loading: boolean; error: string | null };

// The host is its own clock, so its offset to itself is zero.
const HOST_OFFSET_MS = 0;

export function HostSession() {
  const room = useHostRoom();
  const { engine, unlocked, unlock, tryResume } = useAudioEngine();
  const [sourceKind, setSourceKind] = useState<SourceKind>("file");
  const [track, setTrack] = useState<HostTrack | null>(null);
  const [fileState, setFileState] = useState<FileState>({ loading: false, error: null });
  const [videoId, setVideoId] = useState<string | null>(null);
  const [nudgeMs, setNudgeMs] = useState(0);
  const [volume, setVolume] = useState(1);
  const youtubeRef = useRef<HTMLDivElement>(null);

  const { playback, setPlayback } = room;
  const activeVideoId = sourceKind === "youtube" ? videoId : null;

  const { resync } = useAudioPlayer({
    engine,
    buffer: track?.buffer ?? null,
    bufferTrackId: track?.meta.id ?? null,
    playback,
    offsetMs: HOST_OFFSET_MS,
    nudgeMs,
    unlocked,
  });
  const youtube = useYouTubeSync({
    containerRef: youtubeRef,
    videoId: activeVideoId,
    playback,
    offsetMs: HOST_OFFSET_MS,
    nudgeMs,
  });
  useVisibilityResync(() => {
    void tryResume().then(resync);
  });

  const now = useTicker(playback.status !== "idle");
  const positionMs = now === null ? null : positionAtHostTime(playback, now);
  const countdownMs = now === null ? null : msUntilStart(playback, now);

  const source: Source | null =
    sourceKind === "file"
      ? track && { kind: "file", trackId: track.meta.id, name: track.meta.name, durationMs: track.meta.durationMs }
      : activeVideoId
        ? { kind: "youtube", videoId: activeVideoId }
        : null;
  const playingSource = playback.status === "idle" ? null : playback.source;

  const changeKind = (kind: SourceKind) => {
    setSourceKind(kind);
    if (playback.status !== "idle") setPlayback(stopped());
  };

  const pickFile = async (file: File) => {
    if (file.size > MAX_TRACK_BYTES) {
      setFileState({ loading: false, error: `Files must be under ${formatBytes(MAX_TRACK_BYTES)}.` });
      return;
    }
    setFileState({ loading: true, error: null });
    try {
      await unlock();
      const data = await file.arrayBuffer();
      const buffer = await engine.decode(data);
      const meta: TrackMeta = {
        id: randomId(),
        name: file.name,
        size: file.size,
        mime: file.type,
        durationMs: buffer.duration * 1000,
      };
      setTrack({ meta, buffer });
      setPlayback(stopped());
      room.loadTrack({ meta, data });
      setFileState({ loading: false, error: null });
    } catch {
      setFileState({ loading: false, error: "Could not decode this file. Try an MP3, M4A or WAV." });
    }
  };

  const useVideo = (id: string) => {
    setVideoId(id);
    setPlayback(stopped());
  };

  const start = async (startAtHostTime: number) => {
    if (!source) return;
    await unlock();
    if (source.kind === "youtube") youtube.arm();
    setPlayback(playFrom(source, 0, startAtHostTime));
  };

  const playPause = () => {
    if (playback.status === "playing") {
      setPlayback(pauseAt(playback, performance.now()));
    } else if (playback.status === "paused") {
      setPlayback(playFrom(playback.source, playback.positionMs, performance.now() + COMMAND_LEAD_MS));
    }
  };

  const seek = (ms: number) => {
    if (playback.status === "playing") {
      setPlayback(playFrom(playback.source, ms, performance.now() + COMMAND_LEAD_MS));
    } else if (playback.status === "paused") {
      setPlayback({ status: "paused", source: playback.source, positionMs: ms });
    }
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    engine.setVolume(value);
  };

  const readyCount = room.members.filter((m) => m.ready).length;

  return (
    <Screen className="space-y-5">
      <LargeTitle title="Host" subtitle="Everyone who joins plays in sync with this device." back={{ href: "/", label: "Home" }} />
      <RoomCodeCard status={room.status} />
      <MemberList members={room.members} currentTrackId={sourceKind === "file" ? (track?.meta.id ?? null) : null} />
      <SourcePicker
        kind={sourceKind}
        onKindChange={changeKind}
        track={track?.meta ?? null}
        fileLoading={fileState.loading}
        fileError={fileState.error}
        onPickFile={(file) => void pickFile(file)}
        videoId={videoId}
        onVideoId={useVideo}
        disabled={room.status.kind !== "open"}
      />
      {activeVideoId && (
        <YouTubePlayer
          containerRef={youtubeRef}
          needsArm={youtube.playerReady && !youtube.prewarmed && !youtube.isPlaying && playback.status !== "idle"}
          onArm={youtube.arm}
          driftMs={youtube.driftMs}
        />
      )}
      {playingSource ? (
        <NowPlayingCard source={playingSource} status={playback.status} msUntilStart={countdownMs} positionMs={positionMs} />
      ) : (
        <SchedulePicker
          disabled={!source || room.status.kind !== "open"}
          readyCount={readyCount}
          memberCount={room.members.length}
          onStart={(at) => void start(at)}
        />
      )}
      <InsetGroup header="This device" footer="Nudge only moves this device. Use it if this phone's speaker is early or late compared to the others.">
        <NudgeControl valueMs={nudgeMs} onChange={setNudgeMs} />
        <VolumeControl value={volume} onChange={changeVolume} />
        <ListRow label="Resync this device" trailing={<Button variant="tinted" size="sm" onClick={resync}>Resync</Button>} />
      </InsetGroup>
      <BluetoothTip />
      {!unlocked && playback.status !== "idle" && (
        <Card className="text-center">
          <p className="text-subheadline text-label-secondary">Audio on this device is paused by the browser.</p>
          <Button variant="tinted" size="sm" className="mt-2" onClick={() => void unlock()}>Resume audio here</Button>
        </Card>
      )}
      {playingSource && (
        <GlassBar>
          <PlaybackControls
            status={playback.status}
            positionMs={positionMs ?? 0}
            durationMs={playingSource.kind === "file" ? playingSource.durationMs : null}
            onPlayPause={playPause}
            onStop={() => setPlayback(stopped())}
            onSeek={seek}
          />
        </GlassBar>
      )}
    </Screen>
  );
}
