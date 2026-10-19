import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "filled" | "tinted" | "gray" | "plain" | "destructive";
export type ButtonSize = "lg" | "md" | "sm";

type ButtonStyle = { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean };
type ButtonProps = ComponentProps<"button"> & ButtonStyle;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  filled: "bg-tint text-on-tint",
  tinted: "bg-tint/15 text-tint",
  gray: "bg-fill text-label",
  plain: "bg-transparent text-tint",
  destructive: "bg-red/15 text-red",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  lg: "h-12 px-6 text-headline",
  md: "h-11 px-5 text-headline",
  sm: "h-8 px-3.5 text-subheadline font-semibold",
};

// Shared so a next/link can look exactly like a button.
export function buttonClassName({ variant = "filled", size = "md", fullWidth = false }: ButtonStyle) {
  return cn(
    "gap-2 inline-flex items-center justify-center rounded-full font-semibold select-none transition-[transform,opacity] duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && "w-full",
  );
}

export function Button({ variant, size, fullWidth, className, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClassName({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
