import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4 rounded-card bg-bg-grouped-secondary", className)} {...props} />;
}
