import { formatCountdown } from "@/lib/format";

export function Countdown({ msUntilStart }: { msUntilStart: number }) {
  return (
    <div className="py-2 text-center">
      <p className="text-footnote uppercase tracking-wide text-label-secondary">Starting in</p>
      <p className="text-7xl font-bold tabular-nums tracking-tight text-tint">{formatCountdown(msUntilStart)}</p>
    </div>
  );
}
