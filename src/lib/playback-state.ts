import type { PlaybackState, Source } from "./protocol";

// Commands are anchored this far ahead so every device acts at the same instant
// instead of whenever its copy of the message happened to arrive.
export const COMMAND_LEAD_MS = 500;

export function positionAtHostTime(state: PlaybackState, hostTime: number) {
  switch (state.status) {
    case "idle":
      return null;
    case "paused":
      return state.positionMs;
    case "playing":
      return state.anchorPositionMs + (hostTime - state.anchorHostTime);
  }
}

// Positive while a scheduled start is still in the future.
export function msUntilStart(state: PlaybackState, hostTime: number) {
  if (state.status !== "playing") return null;
  return state.anchorHostTime - hostTime;
}

export function isScheduled(state: PlaybackState, hostTime: number) {
  return state.status === "playing" && state.anchorHostTime > hostTime;
}

export function playFrom(
  source: Source,
  positionMs: number,
  startAtHostTime: number,
): PlaybackState {
  return {
    status: "playing",
    source,
    anchorHostTime: startAtHostTime,
    anchorPositionMs: Math.max(0, positionMs),
  };
}

export function pauseAt(state: PlaybackState, hostTime: number): PlaybackState {
  if (state.status !== "playing") return state;
  const position = positionAtHostTime(state, hostTime) ?? 0;
  return { status: "paused", source: state.source, positionMs: Math.max(0, position) };
}

export function stopped(): PlaybackState {
  return { status: "idle" };
}

export function sourceOf(state: PlaybackState): Source | null {
  return state.status === "idle" ? null : state.source;
}
