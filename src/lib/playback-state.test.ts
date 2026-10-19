import { describe, expect, it } from "vitest";
import { msUntilStart, pauseAt, playFrom, positionAtHostTime } from "./playback-state";
import type { Source } from "./protocol";

const source: Source = { kind: "file", trackId: "t1", name: "song.mp3", durationMs: 180000 };

describe("playback state", () => {
  it("counts down before a scheduled start", () => {
    const state = playFrom(source, 0, 10000);
    expect(msUntilStart(state, 7000)).toBe(3000);
    expect(positionAtHostTime(state, 7000)).toBe(-3000);
  });

  it("advances position after the anchor", () => {
    const state = playFrom(source, 30000, 10000);
    expect(positionAtHostTime(state, 12500)).toBe(32500);
  });

  it("freezes position on pause", () => {
    const paused = pauseAt(playFrom(source, 0, 10000), 14000);
    expect(paused.status).toBe("paused");
    expect(positionAtHostTime(paused, 99999)).toBe(4000);
  });

  it("returns null when idle", () => {
    expect(positionAtHostTime({ status: "idle" }, 0)).toBeNull();
  });
});
