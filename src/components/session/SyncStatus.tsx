import { Badge } from "@/components/ui/Badge";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { ListRow } from "@/components/ui/ListRow";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { TrackDownload } from "@/hooks/useGuestRoom";
import { syncQuality, type ClockEstimate } from "@/lib/clock";
import { formatSignedMs } from "@/lib/format";

type SyncStatusProps = {
  estimate: ClockEstimate | null;
  download: TrackDownload | null;
  decoded: boolean;
  decodeError: string | null;
};

export function SyncStatus({ estimate, download, decoded, decodeError }: SyncStatusProps) {
  const quality = estimate ? syncQuality(estimate.rttMs) : null;
  return (
    <InsetGroup header="Sync" footer="Clock offset is how far this phone's clock is from the host's. It is measured continuously.">
      <ListRow
        label="Clock offset"
        detail={estimate ? `${estimate.sampleCount} samples` : "Measuring…"}
        value={estimate ? formatSignedMs(estimate.offsetMs) : "—"}
      />
      <ListRow
        label="Round trip"
        value={estimate ? `${Math.round(estimate.rttMs)} ms` : "—"}
        trailing={quality && <Badge tone={quality === "good" ? "green" : quality === "fair" ? "orange" : "red"}>{quality}</Badge>}
      />
      <ListRow
        label="Track"
        detail={download ? downloadDetail(download, decoded, decodeError) : "Waiting for the host to pick a file"}
        trailing={download && <ProgressRing fraction={decoded ? 1 : download.progress} size={32} strokeWidth={3} />}
      />
    </InsetGroup>
  );
}

function downloadDetail(download: TrackDownload, decoded: boolean, decodeError: string | null) {
  if (decodeError) return decodeError;
  if (decoded) return `${download.meta.name} · ready`;
  if (download.data) return "Decoding…";
  return `${download.meta.name} · ${Math.round(download.progress * 100)}%`;
}
