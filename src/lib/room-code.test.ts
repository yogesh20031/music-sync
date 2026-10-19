import { describe, expect, it } from "vitest";
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, peerIdForCode } from "./room-code";

describe("room code", () => {
  it("generates valid six-character codes", () => {
    for (let i = 0; i < 50; i += 1) expect(isValidRoomCode(generateRoomCode())).toBe(true);
  });

  it("normalizes user input", () => {
    expect(normalizeRoomCode(" ab-c d2x3 ")).toBe("ABCD2X");
  });

  it("rejects ambiguous characters", () => {
    expect(isValidRoomCode("ABC0IO")).toBe(false);
  });

  it("derives a stable peer id", () => {
    expect(peerIdForCode("ABC234")).toBe("music-share-ABC234");
  });
});

describe("extractRoomCode", () => {
  it("pulls the code out of a pasted join link", async () => {
    const { extractRoomCode } = await import("./room-code");
    expect(extractRoomCode("http://192.168.18.13:3000/join?code=BCGSVC&name=Yo")).toBe("BCGSVC");
  });

  it("finds the code inside copied text", async () => {
    const { extractRoomCode } = await import("./room-code");
    expect(extractRoomCode("ROOM CODE BCGSVC scan or type")).toBe("BCGSVC");
  });

  it("falls back to normalizing partial input", async () => {
    const { extractRoomCode } = await import("./room-code");
    expect(extractRoomCode("bcg")).toBe("BCG");
  });
});
