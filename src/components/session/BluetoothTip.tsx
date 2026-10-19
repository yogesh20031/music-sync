import { Bluetooth } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function BluetoothTip() {
  return (
    <Card className="gap-3 flex items-start">
      <div className="size-10 flex shrink-0 items-center justify-center rounded-control bg-tint/15 text-tint">
        <Bluetooth size={20} />
      </div>
      <div>
        <p className="text-headline text-label">Want a Bluetooth speaker?</p>
        <p className="mt-0.5 text-footnote text-label-secondary">
          Pair it to any phone in that phone&apos;s Bluetooth settings, then join the room from that phone.
          It stays in sync with everyone else. If the speaker lags, slide its phone&apos;s Nudge control.
        </p>
      </div>
    </Card>
  );
}
