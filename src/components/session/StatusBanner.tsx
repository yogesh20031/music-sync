import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { GuestStatus } from "@/hooks/useGuestRoom";

export function StatusBanner({ status }: { status: GuestStatus }) {
  switch (status.kind) {
    case "connected":
      return null;
    case "connecting":
      return <Banner tone="blue" title="Connecting to the host…" />;
    case "reconnecting":
      return <Banner tone="orange" title={`Reconnecting (attempt ${status.attempt} of 3)…`} />;
    case "ended":
      return <Banner tone="gray" title="The host ended the session." />;
    case "error":
      return <Banner tone="red" title={status.message} />;
  }
}

function Banner({ tone, title }: { tone: "blue" | "orange" | "gray" | "red"; title: string }) {
  return (
    <Card className="gap-3 flex items-center">
      <Badge tone={tone}>{tone === "red" ? "Error" : "Status"}</Badge>
      <p className="text-subheadline text-label">{title}</p>
    </Card>
  );
}
