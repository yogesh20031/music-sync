import type { ReactNode } from "react";

// Floating Liquid Glass bar pinned above the home indicator.
export function GlassBar({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))] fixed inset-x-0 bottom-0 z-20">
      <div className="glass mx-auto max-w-lg rounded-sheet p-4">{children}</div>
    </div>
  );
}
