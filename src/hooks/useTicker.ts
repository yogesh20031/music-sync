import { useEffect, useState } from "react";

// A performance.now() that re-renders on an interval while active, for
// countdowns and position readouts. Returns null until the first tick so
// callers never compute against a stale clock.
export function useTicker(active: boolean, intervalMs = 250) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(performance.now());
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      window.clearInterval(id);
      setNow(null);
    };
  }, [active, intervalMs]);

  return now;
}
