import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type InsetGroupProps = {
  header?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
};

// iOS inset grouped list. Rows carry a left margin so the dividers start at
// the text edge rather than the card edge.
export function InsetGroup({ header, footer, className, children }: InsetGroupProps) {
  return (
    <section className={cn("space-y-2", className)}>
      {header && (
        <h3 className="px-4 text-footnote uppercase tracking-wide text-label-secondary">{header}</h3>
      )}
      <div className="overflow-hidden rounded-card bg-bg-grouped-secondary divide-y divide-separator *:ml-4">
        {children}
      </div>
      {footer && <p className="px-4 text-footnote text-label-secondary">{footer}</p>}
    </section>
  );
}
