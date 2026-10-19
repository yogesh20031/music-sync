"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Field({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full px-3 rounded-control bg-fill-secondary text-body text-label placeholder:text-label-tertiary outline-none focus:ring-2 focus:ring-tint/40",
        className,
      )}
      {...props}
    />
  );
}
