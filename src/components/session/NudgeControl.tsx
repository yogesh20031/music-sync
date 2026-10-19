"use client";

import { ListRow } from "@/components/ui/ListRow";
import { Slider } from "@/components/ui/Slider";
import { formatSignedMs } from "@/lib/format";

type NudgeControlProps = { valueMs: number; onChange: (ms: number) => void };

// Lets a listener correct for speaker latency we cannot measure, such as a
// Bluetooth speaker hanging off this phone.
export function NudgeControl({ valueMs, onChange }: NudgeControlProps) {
  return (
    <ListRow label="Nudge" detail="Negative plays earlier, positive later" value={formatSignedMs(valueMs)}>
      <Slider ariaLabel="Nudge" min={-500} max={500} step={10} value={valueMs} onChange={onChange} />
    </ListRow>
  );
}
