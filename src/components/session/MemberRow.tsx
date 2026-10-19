import { Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import type { Member } from "@/hooks/useHostRoom";
import { syncQuality } from "@/lib/clock";

type MemberRowProps = { member: Member; currentTrackId: string | null };

export function MemberRow({ member, currentTrackId }: MemberRowProps) {
  const rtt = member.rttMs;
  const detail = rtt === null ? "Syncing clock…" : `${Math.round(rtt)} ms round trip · ${syncQuality(rtt)} sync`;
  return (
    <ListRow leading={<Smartphone size={22} />} label={member.name} detail={detail} trailing={<MemberBadge member={member} currentTrackId={currentTrackId} />} />
  );
}

function MemberBadge({ member, currentTrackId }: MemberRowProps) {
  if (currentTrackId && member.trackId !== currentTrackId) {
    const pct = Math.round(Math.max(member.sendProgress, member.progress) * 100);
    return <Badge tone="orange">Sending {pct}%</Badge>;
  }
  if (!member.ready) return <Badge tone="gray">Not ready</Badge>;
  return <Badge tone="green">Ready</Badge>;
}
