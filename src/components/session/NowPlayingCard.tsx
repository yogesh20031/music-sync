import { Music, MonitorPlay } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDuration } from "@/lib/format";
import type { PlaybackState, Source } from "@/lib/protocol";
import { Countdown } from "./Countdown";

type NowPlayingCardProps = {
  source: Source;
  status: PlaybackState["status"];
  msUntilStart: number | null;
  positionMs: number | null;
};

export function NowPlayingCard({ source, status, msUntilStart, positionMs }: NowPlayingCardProps) {
  const scheduled = status === "playing" && msUntilStart !== null && msUntilStart > 0;
  const title = source.kind === "file" ? source.name : `YouTube · ${source.videoId}`;
  const duration = source.kind === "file" ? source.durationMs : null;

  return (
    <Card>
      <div className="gap-3 flex items-center">
        <div className="size-12 flex shrink-0 items-center justify-center rounded-control bg-tint/15 text-tint">
          {source.kind === "file" ? <Music size={24} /> : <MonitorPlay size={24} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-headline text-label">{title}</p>
          <p className="text-footnote text-label-secondary">
            {positionMs !== null && !scheduled ? formatDuration(positionMs) : "0:00"}
            {duration !== null && ` / ${formatDuration(duration)}`}
          </p>
        </div>
        <StatusBadge status={status} scheduled={scheduled} approximate={source.kind === "youtube"} />
      </div>
      {scheduled && msUntilStart !== null && <Countdown msUntilStart={msUntilStart} />}
    </Card>
  );
}

function StatusBadge({ status, scheduled, approximate }: { status: PlaybackState["status"]; scheduled: boolean; approximate: boolean }) {
  if (status === "paused") return <Badge tone="gray">Paused</Badge>;
  if (scheduled) return <Badge tone="blue">Scheduled</Badge>;
  if (status === "playing") return <Badge tone={approximate ? "orange" : "green"}>{approximate ? "Playing · approx" : "Playing"}</Badge>;
  return <Badge tone="gray">Idle</Badge>;
}
