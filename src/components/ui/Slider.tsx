"use client";

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  // Fires once when the user lets go, for actions too costly to run per tick.
  onCommit?: (value: number) => void;
  ariaLabel: string;
  disabled?: boolean;
};

export function Slider({ value, min, max, step = 1, onChange, onCommit, ariaLabel, disabled }: SliderProps) {
  const fill = `${((value - min) / (max - min)) * 100}%`;
  return (
    <input
      type="range"
      className="ios-slider disabled:opacity-40"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      // The track fill is painted in CSS; this only hands it the current position.
      style={{ "--fill": fill }}
      onChange={(event) => onChange(Number(event.target.value))}
      onPointerUp={(event) => onCommit?.(Number(event.currentTarget.value))}
      onKeyUp={(event) => onCommit?.(Number(event.currentTarget.value))}
    />
  );
}
