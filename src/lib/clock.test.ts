import { describe, expect, it } from "vitest";
import { estimateClock, hostToLocal, makeSample, pushSample, syncQuality } from "./clock";

describe("clock", () => {
  it("computes offset from a symmetric round trip", () => {
    // guest 1000 -> host clock reads 5020 -> guest 1040: offset = 5020 - 1020
    const s = makeSample(1000, 5020, 1040);
    expect(s.rttMs).toBe(40);
    expect(s.offsetMs).toBe(4000);
  });

  it("prefers low-RTT samples when estimating", () => {
    const samples = [
      makeSample(0, 1300, 600), // rtt 600, offset 1000
      makeSample(0, 1010, 20), // rtt 20, offset 1000
      makeSample(0, 1012, 24), // rtt 24, offset 1000
      makeSample(0, 1015, 30), // rtt 30, offset 1000
      makeSample(0, 1900, 400), // rtt 400, offset 1700 (asymmetric)
    ];
    const est = estimateClock(samples);
    expect(est?.offsetMs).toBe(1000);
    expect(est?.rttMs).toBe(20);
  });

  it("caps the sample window", () => {
    let samples = [] as ReturnType<typeof makeSample>[];
    for (let i = 0; i < 30; i += 1) samples = pushSample(samples, makeSample(i, i + 10, i + 20));
    expect(samples.length).toBe(20);
  });

  it("maps host time back to local time", () => {
    expect(hostToLocal(5000, 4000)).toBe(1000);
  });

  it("grades sync quality by rtt", () => {
    expect(syncQuality(10)).toBe("good");
    expect(syncQuality(80)).toBe("fair");
    expect(syncQuality(300)).toBe("poor");
  });
});
