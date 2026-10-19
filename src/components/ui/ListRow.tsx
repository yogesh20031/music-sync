import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ListRowProps = {
  label: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function ListRow({ label, detail, value, leading, trailing, className, children }: ListRowProps) {
  return (
    <div className={cn("py-2.5 pr-4 min-h-11", className)}>
      <div className="gap-3 flex items-center">
        {leading && <span className="shrink-0 text-tint">{leading}</span>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-body text-label">{label}</div>
          {detail && <div className="truncate text-footnote text-label-secondary">{detail}</div>}
        </div>
        {value !== undefined && (
          <span className="shrink-0 text-body tabular-nums text-label-secondary">{value}</span>
        )}
        {trailing && <span className="shrink-0">{trailing}</span>}
      </div>
      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
