"use client";

import { Music, MonitorPlay, Upload, Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { ListRow } from "@/components/ui/ListRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBytes, formatDuration } from "@/lib/format";
import type { TrackMeta } from "@/lib/protocol";
import { ACCEPT_ATTR, MAX_TRACK_BYTES } from "@/lib/transfer";
import { parseYouTubeId } from "@/lib/youtube-url";

export type SourceKind = "file" | "youtube";

const SOURCE_OPTIONS = [
  { value: "file", label: "Music file" },
  { value: "youtube", label: "YouTube link" },
] as const;

type SourcePickerProps = {
  kind: SourceKind;
  onKindChange: (kind: SourceKind) => void;
  track: TrackMeta | null;
  fileLoading: boolean;
  fileError: string | null;
  onPickFile: (file: File) => void;
  videoId: string | null;
  onVideoId: (id: string) => void;
  disabled: boolean;
};

export function SourcePicker({
  kind,
  onKindChange,
  track,
  fileLoading,
  fileError,
  onPickFile,
  videoId,
  onVideoId,
  disabled,
}: SourcePickerProps) {
  return (
    <InsetGroup
      header="Source"
      footer={
        kind === "file"
          ? `MP3, M4A, WAV, up to ${formatBytes(MAX_TRACK_BYTES)}. Sent directly to each phone, accurate to a few milliseconds.`
          : "YouTube playback lands within a few hundred milliseconds across devices. Good for watching together, not for stacking speakers."
      }
    >
      <div className="py-2 pr-4">
        <SegmentedControl options={SOURCE_OPTIONS} value={kind} onChange={onKindChange} ariaLabel="Source" />
      </div>
      {kind === "file" ? (
        <FileRow track={track} loading={fileLoading} error={fileError} onPick={onPickFile} disabled={disabled} />
      ) : (
        <YouTubeRow videoId={videoId} onVideoId={onVideoId} disabled={disabled} />
      )}
    </InsetGroup>
  );
}

type FileRowProps = {
  track: TrackMeta | null;
  loading: boolean;
  error: string | null;
  onPick: (file: File) => void;
  disabled: boolean;
};

function FileRow({ track, loading, error, onPick, disabled }: FileRowProps) {
  const label = loading ? "Decoding…" : track ? track.name : "Choose a music file";
  const detail = error ?? (track ? `${formatDuration(track.durationMs)} · ${formatBytes(track.size)}` : "Everyone downloads it before the start time");
  return (
    <ListRow
      leading={<Music size={22} />}
      label={label}
      detail={<span className={error ? "text-red" : undefined}>{detail}</span>}
      trailing={
        <label className={disabled ? "pointer-events-none opacity-40" : undefined}>
          <span className="gap-1.5 px-3.5 h-8 inline-flex items-center rounded-full bg-tint/15 text-subheadline font-semibold text-tint">
            <Upload size={16} />
            {track ? "Replace" : "Pick"}
          </span>
          <input
            type="file"
            accept={ACCEPT_ATTR}
            className="sr-only"
            disabled={disabled || loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPick(file);
              event.target.value = "";
            }}
          />
        </label>
      }
    />
  );
}

type YouTubeRowProps = { videoId: string | null; onVideoId: (id: string) => void; disabled: boolean };

function YouTubeRow({ videoId, onVideoId, disabled }: YouTubeRowProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const id = parseYouTubeId(input);
    if (!id) {
      setError("That does not look like a YouTube link.");
      return;
    }
    setError(null);
    onVideoId(id);
  };

  return (
    <ListRow
      leading={<MonitorPlay size={22} />}
      label={videoId ? "Video ready" : "Paste a YouTube link"}
      detail={<span className={error ? "text-red" : undefined}>{error ?? (videoId ? `youtu.be/${videoId}` : "Watch, Shorts and youtu.be links all work")}</span>}
      trailing={videoId ? <Badge tone="orange">Approximate</Badge> : undefined}
    >
      <form
        className="gap-2 flex"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field
          value={input}
          onChange={(event) => {
            const next = event.target.value;
            setInput(next);
            // Apply as soon as the pasted text parses so no extra tap is needed.
            const id = parseYouTubeId(next);
            if (id) {
              setError(null);
              onVideoId(id);
            }
          }}
          placeholder="https://youtu.be/…"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          disabled={disabled}
        />
        <Button type="submit" variant="tinted" size="md" disabled={disabled || input.trim() === ""}>
          <Link2 size={18} />
          Use
        </Button>
      </form>
    </ListRow>
  );
}
