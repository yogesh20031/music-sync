import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Page shell: phone-width column, 16px gutters, room for the floating bar.
export function Screen({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto w-full max-w-lg px-4 pb-44 pt-[env(safe-area-inset-top)]", className)}>
      {children}
    </main>
  );
}
