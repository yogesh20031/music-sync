"use client";

import { cn } from "@/lib/cn";

type SegmentOption<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="p-0.5 flex rounded-control bg-fill">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 flex-1 rounded-segment text-subheadline font-medium transition-colors",
              selected ? "bg-segment text-label shadow-sm" : "text-label-secondary",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
