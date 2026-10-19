import { InsetGroup } from "@/components/ui/InsetGroup";
import { ListRow } from "@/components/ui/ListRow";
import type { Member } from "@/hooks/useHostRoom";
import { MemberRow } from "./MemberRow";

type MemberListProps = { members: Member[]; currentTrackId: string | null };

export function MemberList({ members, currentTrackId }: MemberListProps) {
  const readyCount = members.filter((m) => m.ready).length;
  return (
    <InsetGroup header={`Devices · ${readyCount}/${members.length} ready`}>
      {members.length === 0 ? (
        <ListRow label="No one has joined yet" detail="Share the code or QR above." />
      ) : (
        members.map((member) => <MemberRow key={member.id} member={member} currentTrackId={currentTrackId} />)
      )}
    </InsetGroup>
  );
}
