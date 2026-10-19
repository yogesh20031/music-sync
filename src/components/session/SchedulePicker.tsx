"use client";

import { Timer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";

type ScheduleMode = "in" | "at";

const MODE_OPTIONS = [
  { value: "in", label: "In a few seconds" },
  { value: "at", label: "At a clock time" },
] as const;

// "Now" still gives a second so every phone receives the command first.
const PRESETS = [
  { label: "Now", seconds: 1 },
  { label: "5 s", seconds: 5 },
  { label: "10 s", seconds: 10 },
  { label: "30 s", seconds: 30 },
  { label: "1 min", seconds: 60 },
] as const;

type SchedulePickerProps = {
  disabled: boolean;
  readyCount: number;
  memberCount: number;
  onStart: (startAtHostTime: number) => void;
};

export function SchedulePicker({ disabled, readyCount, memberCount, onStart }: SchedulePickerProps) {
  const [mode, setMode] = useState<ScheduleMode>("in");
  const [seconds, setSeconds] = useState<number>(10);
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    const delayMs = mode === "in" ? seconds * 1000 : delayUntilClockTime(time);
    if (delayMs === null) {
      setError("Pick a time that is still ahead of now.");
      return;
    }
    setError(null);
    // Host clock is performance.now(); convert the wall-clock delay onto it.
    onStart(performance.now() + delayMs);
  };

  const waiting = memberCount > 0 && readyCount < memberCount;

  return (
    <InsetGroup
      header="Start"
      footer={
        error ?? (waiting
          ? `${memberCount - readyCount} device${memberCount - readyCount === 1 ? "" : "s"} still need to tap Ready. They will join in sync when they do.`
          : "Every device plays at the same instant on the host's clock.")
      }
    >
      <div className="py-2 pr-4">
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} ariaLabel="Schedule mode" />
      </div>
      <div className="py-3 pr-4">
        {mode === "in" ? (
          <div className="gap-2 flex flex-wrap">
            {PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => setSeconds(preset.seconds)}
                className={cn(
                  "px-4 h-9 rounded-full text-subheadline font-semibold transition-colors",
                  seconds === preset.seconds ? "bg-tint text-on-tint" : "bg-fill text-label",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : (
          <Field type="time" step={1} value={time} onChange={(event) => setTime(event.target.value)} aria-label="Start time" />
        )}
      </div>
      <div className="py-3 pr-4">
        <Button size="lg" fullWidth disabled={disabled || (mode === "at" && time === "")} onClick={start}>
          <Timer size={20} />
          {mode === "in" ? (seconds <= 1 ? "Start now" : `Start in ${seconds} s`) : "Schedule start"}
        </Button>
      </div>
    </InsetGroup>
  );
}

function delayUntilClockTime(value: string) {
  const [h, m, s = "0"] = value.split(":");
  if (h === undefined || m === undefined) return null;
  const target = new Date();
  target.setHours(Number(h), Number(m), Number(s), 0);
  const delay = target.getTime() - Date.now();
  return delay > 0 ? delay : null;
}
