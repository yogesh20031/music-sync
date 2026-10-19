import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "blue" | "green" | "orange" | "red" | "gray";

const TONE_CLASSES: Record<BadgeTone, string> = {
  blue: "bg-tint/15 text-tint",
  green: "bg-green/15 text-green",
  orange: "bg-orange/15 text-orange",
  red: "bg-red/15 text-red",
  gray: "bg-fill text-label-secondary",
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "gap-1 px-2.5 py-0.5 inline-flex items-center rounded-full text-caption1 font-semibold",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
