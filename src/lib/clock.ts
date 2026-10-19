/*
 * NTP-style offset estimation over the data channel.
 * Guest sends t0, host answers with its clock t1, guest receives at t2.
 * All times are performance.now() values in their own device's domain.
 */
export type ClockSample = { offsetMs: number; rttMs: number };
export type ClockEstimate = { offsetMs: number; rttMs: number; sampleCount: number };
export type SyncQuality = "good" | "fair" | "poor";

export const MAX_SAMPLES = 20;
const BEST_SAMPLES = 3;

export function makeSample(t0: number, t1: number, t2: number): ClockSample {
  const rttMs = t2 - t0;
  return { rttMs, offsetMs: t1 - (t0 + rttMs / 2) };
}

export function pushSample(samples: readonly ClockSample[], sample: ClockSample) {
  return [...samples, sample].slice(-MAX_SAMPLES);
}

// Low-RTT samples have the least asymmetry, so the median of the best few
// is far more stable than a plain average.
export function estimateClock(samples: readonly ClockSample[]): ClockEstimate | null {
  if (samples.length === 0) return null;
  const best = [...samples].sort((a, b) => a.rttMs - b.rttMs).slice(0, BEST_SAMPLES);
  const offsets = best.map((s) => s.offsetMs).sort((a, b) => a - b);
  return {
    offsetMs: offsets[Math.floor(offsets.length / 2)],
    rttMs: best[0].rttMs,
    sampleCount: samples.length,
  };
}

export function hostToLocal(hostTime: number, offsetMs: number) {
  return hostTime - offsetMs;
}

export function localToHost(localTime: number, offsetMs: number) {
  return localTime + offsetMs;
}

export function syncQuality(rttMs: number): SyncQuality {
  if (rttMs < 40) return "good";
  if (rttMs < 120) return "fair";
  return "poor";
}
