import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { hostToLocal } from "@/lib/clock";
import type { PlaybackState } from "@/lib/protocol";

type YouTubeSyncOptions = {
  containerRef: RefObject<HTMLDivElement | null>;
  videoId: string | null;
  playback: PlaybackState;
  offsetMs: number | null;
  nudgeMs: number;
};

const API_SRC = "https://www.youtube.com/iframe_api";
const DRIFT_INTERVAL_MS = 500;
// Small drift is corrected by nudging the playback rate, which keeps the
// player streaming; seeking makes phones re-buffer and show a spinner.
const DRIFT_TOLERANCE_MS = 200;
const DRIFT_SETTLED_MS = 60;
const HARD_SEEK_MS = 1200;
const SEEK_COOLDOWN_MS = 3000;
const CATCH_UP_RATE = 1.25;
const SLOW_DOWN_RATE = 0.75;
// A seek takes a moment to land, so aim slightly ahead of where we should be.
const SEEK_LEAD_MS = 60;
// YT.PlayerState values, kept local because the YT global only exists once
// the iframe API script has loaded.
const STATE_ENDED: YT.PlayerState = 0;
const STATE_PLAYING: YT.PlayerState = 1;
const STATE_BUFFERING: YT.PlayerState = 3;

let apiPromise: Promise<typeof YT> | null = null;

function loadYouTubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<typeof YT>((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = API_SRC;
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function useYouTubeSync({ containerRef, videoId, playback, offsetMs, nudgeMs }: YouTubeSyncOptions) {
  const playerRef = useRef<YT.Player | null>(null);
  // The API's removeEventListener is unreliable, so the prewarm step hooks in
  // through this ref and clears itself instead of unregistering.
  const prewarmHandlerRef = useRef<((state: YT.PlayerState) => void) | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerState, setPlayerState] = useState<YT.PlayerState | null>(null);
  const [prewarmed, setPrewarmed] = useState(false);
  const [driftMs, setDriftMs] = useState<number | null>(null);
  const lastSeekRef = useRef(0);
  const rateRef = useRef(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!videoId || !container) return;
    let cancelled = false;
    let player: YT.Player | null = null;
    // The API swaps the target element for an iframe, so give it a child
    // of our own rather than React's node.
    const mount = document.createElement("div");
    container.appendChild(mount);

    void loadYouTubeApi().then((api) => {
      if (cancelled) return;
      player = new api.Player(mount, {
        videoId,
        playerVars: { playsinline: 1, controls: 0, rel: 0, disablekb: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            setPlayerReady(true);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            setPlayerState(event.data);
            prewarmHandlerRef.current?.(event.data);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current = null;
      prewarmHandlerRef.current = null;
      setPlayerReady(false);
      setPlayerState(null);
      setPrewarmed(false);
      player?.destroy();
      container.replaceChildren();
    };
  }, [containerRef, videoId]);

  // Buffer the first seconds while muted so the real start is not delayed by
  // a cold player. Call from a user gesture.
  const arm = useCallback(() => {
    const player = playerRef.current;
    if (!player || prewarmed) return;
    if (player.getPlayerState() === STATE_PLAYING) {
      setPrewarmed(true);
      return;
    }
    prewarmHandlerRef.current = (state) => {
      if (state !== STATE_PLAYING) return;
      prewarmHandlerRef.current = null;
      player.pauseVideo();
      player.seekTo(0, true);
      player.unMute();
      setPrewarmed(true);
    };
    player.mute();
    player.playVideo();
  }, [prewarmed]);

  const startLocal =
    playback.status === "playing" && playback.source.kind === "youtube" && offsetMs !== null
      ? hostToLocal(playback.anchorHostTime, offsetMs) + nudgeMs
      : null;
  const anchorPositionMs = playback.status === "playing" ? playback.anchorPositionMs : 0;
  const matchesVideo =
    playback.status !== "idle" && playback.source.kind === "youtube" && playback.source.videoId === videoId;

  useEffect(() => {
    const player = playerRef.current;
    if (!playerReady || !player) return;
    if (!matchesVideo) {
      player.pauseVideo();
      return;
    }
    if (playback.status === "paused") {
      player.pauseVideo();
      player.seekTo(playback.positionMs / 1000, true);
      return;
    }
    if (startLocal === null) return;
    const delay = startLocal - performance.now();
    if (delay <= 0) {
      player.seekTo((anchorPositionMs - delay + SEEK_LEAD_MS) / 1000, true);
      player.playVideo();
      return;
    }
    player.pauseVideo();
    player.seekTo(anchorPositionMs / 1000, true);
    const timer = window.setTimeout(() => {
      player.seekTo(anchorPositionMs / 1000, true);
      player.playVideo();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playerReady, prewarmed, matchesVideo, playback, startLocal, anchorPositionMs]);

  // Drift loop: YouTube's player starts and buffers on its own schedule, so
  // keep nudging it back toward the shared timeline.
  useEffect(() => {
    const player = playerRef.current;
    if (!playerReady || !player || !matchesVideo || playback.status !== "playing" || startLocal === null) {
      setDriftMs(null);
      return;
    }
    const setRate = (rate: number) => {
      if (rateRef.current === rate) return;
      rateRef.current = rate;
      player.setPlaybackRate(rate);
    };
    const seekTo = (ms: number) => {
      lastSeekRef.current = performance.now();
      setRate(1);
      player.seekTo(ms / 1000, true);
    };
    const id = window.setInterval(() => {
      const now = performance.now();
      const expected = anchorPositionMs + (now - startLocal);
      if (expected < 0) return;
      const state = player.getPlayerState();
      if (state === STATE_ENDED || state === STATE_BUFFERING) return;
      if (state !== STATE_PLAYING) {
        player.playVideo();
        return;
      }
      const drift = player.getCurrentTime() * 1000 - expected;
      setDriftMs(drift);
      if (now - lastSeekRef.current < SEEK_COOLDOWN_MS) return;
      const magnitude = Math.abs(drift);
      if (magnitude > HARD_SEEK_MS) {
        seekTo(expected + SEEK_LEAD_MS);
        return;
      }
      if (magnitude > DRIFT_TOLERANCE_MS) {
        const wanted = drift < 0 ? CATCH_UP_RATE : SLOW_DOWN_RATE;
        if (player.getAvailablePlaybackRates().includes(wanted)) setRate(wanted);
        else seekTo(expected + SEEK_LEAD_MS);
        return;
      }
      if (magnitude < DRIFT_SETTLED_MS) setRate(1);
    }, DRIFT_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      setRate(1);
    };
  }, [playerReady, matchesVideo, playback.status, startLocal, anchorPositionMs]);

  const isPlaying = playerState === STATE_PLAYING;

  return { playerReady, prewarmed, isPlaying, arm, driftMs };
}
