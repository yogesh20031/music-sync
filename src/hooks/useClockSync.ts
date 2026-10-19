import { useCallback, useEffect, useRef, useState } from "react";
import { estimateClock, makeSample, pushSample, type ClockEstimate, type ClockSample } from "@/lib/clock";

type ClockSyncOptions = {
  active: boolean;
  send: (t0: number) => void;
};

const BURST_COUNT = 10;
const BURST_INTERVAL_MS = 150;
const STEADY_INTERVAL_MS = 5000;

export function useClockSync({ active, send }: ClockSyncOptions) {
  const [estimate, setEstimate] = useState<ClockEstimate | null>(null);
  const samplesRef = useRef<ClockSample[]>([]);
  const sendRef = useRef(send);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const onPong = useCallback((t0: number, t1: number) => {
    const sample = makeSample(t0, t1, performance.now());
    samplesRef.current = pushSample(samplesRef.current, sample);
    setEstimate(estimateClock(samplesRef.current));
  }, []);

  useEffect(() => {
    if (!active) return;
    samplesRef.current = [];
    let remainingBurst = BURST_COUNT;
    let timer = 0;
    const tick = () => {
      sendRef.current(performance.now());
      remainingBurst -= 1;
      timer = window.setTimeout(tick, remainingBurst > 0 ? BURST_INTERVAL_MS : STEADY_INTERVAL_MS);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [active]);

  return { estimate, offsetMs: estimate?.offsetMs ?? null, onPong };
}
