"use client";

import { Pause, Play, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { formatDuration } from "@/lib/format";
import type { PlaybackState } from "@/lib/protocol";

type PlaybackControlsProps = {
  status: PlaybackState["status"];
  positionMs: number;
  durationMs: number | null;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (positionMs: number) => void;
};

export function PlaybackControls({ status, positionMs, durationMs, onPlayPause, onStop, onSeek }: PlaybackControlsProps) {
  // Hold the thumb where the finger is while dragging; commit once on release.
  const [dragMs, setDragMs] = useState<number | null>(null);
  const shown = dragMs ?? Math.max(0, positionMs);
  const playing = status === "playing";

  return (
    <div className="gap-3 flex items-center">
      <Button size="md" className="w-11 shrink-0 px-0" onClick={onPlayPause} aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
      </Button>
      <div className="min-w-0 flex-1">
        {durationMs !== null ? (
          <Slider
            ariaLabel="Position"
            min={0}
            max={durationMs}
            step={500}
            value={Math.min(shown, durationMs)}
            onChange={setDragMs}
            onCommit={(value) => {
              setDragMs(null);
              onSeek(value);
            }}
          />
        ) : (
          <div className="h-7 flex items-center text-subheadline text-label-secondary">Seeking is not available for YouTube</div>
        )}
        <div className="flex justify-between text-caption1 tabular-nums text-label-secondary">
          <span>{formatDuration(shown)}</span>
          <span>{durationMs !== null ? formatDuration(durationMs) : ""}</span>
        </div>
      </div>
      <Button variant="gray" size="md" className="w-11 shrink-0 px-0" onClick={onStop} aria-label="Stop">
        <Square size={18} fill="currentColor" />
      </Button>
    </div>
  );
}
