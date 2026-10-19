"use client";

import { ListRow } from "@/components/ui/ListRow";
import { Slider } from "@/components/ui/Slider";

type VolumeControlProps = { value: number; onChange: (value: number) => void };

export function VolumeControl({ value, onChange }: VolumeControlProps) {
  return (
    <ListRow label="Volume" value={`${Math.round(value * 100)}%`}>
      <Slider ariaLabel="Volume" min={0} max={1} step={0.02} value={value} onChange={onChange} />
    </ListRow>
  );
}
