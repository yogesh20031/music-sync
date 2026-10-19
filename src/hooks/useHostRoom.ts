import { useCallback, useEffect, useRef, useState } from "react";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { createPeer, describePeerError } from "@/lib/peer";
import { parseGuestMessage, type HostMessage, type PlaybackState, type TrackMeta } from "@/lib/protocol";
import { generateRoomCode, peerIdForCode } from "@/lib/room-code";
import { sendTrack } from "@/lib/transfer";

export type Member = {
  id: string;
  name: string;
  ready: boolean;
  trackId: string | null;
  progress: number;
  sendProgress: number;
  offsetMs: number | null;
  rttMs: number | null;
};

export type HostStatus =
  | { kind: "starting" }
  | { kind: "open"; code: string }
  | { kind: "error"; message: string };

export type LoadedTrack = { meta: TrackMeta; data: ArrayBuffer };

const MAX_ID_RETRIES = 5;
const IDLE: PlaybackState = { status: "idle" };

function sendTo(conn: DataConnection, message: HostMessage) {
  if (conn.open) conn.send(message);
}

export function useHostRoom() {
  const [status, setStatus] = useState<HostStatus>({ kind: "starting" });
  const [members, setMembers] = useState<Member[]>([]);
  const [playback, setPlaybackState] = useState<PlaybackState>(IDLE);
  const peerRef = useRef<Peer | null>(null);
  const connsRef = useRef(new Map<string, DataConnection>());
  const playbackRef = useRef<PlaybackState>(IDLE);
  const trackRef = useRef<LoadedTrack | null>(null);

  const patchMember = useCallback((id: string, patch: Partial<Member>) => {
    setMembers((prev) => {
      const index = prev.findIndex((m) => m.id === id);
      if (index === -1) {
        return [
          ...prev,
          {
            id,
            name: "Guest",
            ready: false,
            trackId: null,
            progress: 0,
            sendProgress: 0,
            offsetMs: null,
            rttMs: null,
            ...patch,
          },
        ];
      }
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const streamTrack = useCallback(
    (conn: DataConnection, track: LoadedTrack) => {
      let lastStep = -1;
      void sendTrack(conn, track.meta, track.data, (fraction) => {
        // Throttle to ~5% steps so a big file does not trigger hundreds of renders.
        const step = Math.floor(fraction * 20);
        if (step === lastStep) return;
        lastStep = step;
        patchMember(conn.peer, { sendProgress: fraction });
      });
    },
    [patchMember],
  );

  const attach = useCallback(
    (conn: DataConnection) => {
      const drop = () => {
        connsRef.current.delete(conn.peer);
        setMembers((prev) => prev.filter((m) => m.id !== conn.peer));
      };
      conn.on("open", () => connsRef.current.set(conn.peer, conn));
      conn.on("data", (raw) => {
        const message = parseGuestMessage(raw);
        if (!message) return;
        switch (message.type) {
          case "ping":
            sendTo(conn, { type: "pong", t0: message.t0, t1: performance.now() });
            break;
          case "hello":
            patchMember(conn.peer, { name: message.name || "Guest" });
            sendTo(conn, {
              type: "welcome",
              state: playbackRef.current,
              track: trackRef.current?.meta ?? null,
            });
            if (trackRef.current) streamTrack(conn, trackRef.current);
            break;
          case "status":
            patchMember(conn.peer, {
              ready: message.ready,
              trackId: message.trackId,
              progress: message.progress,
              offsetMs: message.offsetMs,
              rttMs: message.rttMs,
            });
            break;
        }
      });
      conn.on("close", drop);
      conn.on("error", drop);
    },
    [patchMember, streamTrack],
  );

  useEffect(() => {
    let disposed = false;
    let idRetries = 0;
    const conns = connsRef.current;

    const open = async () => {
      const code = generateRoomCode();
      const peer = await createPeer(peerIdForCode(code));
      if (disposed) {
        peer.destroy();
        return;
      }
      peerRef.current = peer;
      peer.on("open", () => setStatus({ kind: "open", code }));
      peer.on("connection", attach);
      peer.on("error", (error) => {
        if (error.type === "unavailable-id" && idRetries < MAX_ID_RETRIES) {
          idRetries += 1;
          peer.destroy();
          void open();
          return;
        }
        setStatus({ kind: "error", message: describePeerError(error.type) });
      });
    };
    void open();

    // Closing the tab skips React cleanup, so also say goodbye on pagehide.
    const sayGoodbye = () => {
      for (const conn of conns.values()) sendTo(conn, { type: "end" });
    };
    window.addEventListener("pagehide", sayGoodbye);

    return () => {
      disposed = true;
      window.removeEventListener("pagehide", sayGoodbye);
      sayGoodbye();
      conns.clear();
      peerRef.current?.destroy();
      peerRef.current = null;
    };
  }, [attach]);

  const setPlayback = useCallback((next: PlaybackState) => {
    playbackRef.current = next;
    setPlaybackState(next);
    for (const conn of connsRef.current.values()) sendTo(conn, { type: "state", state: next });
  }, []);

  const loadTrack = useCallback(
    (track: LoadedTrack) => {
      trackRef.current = track;
      setMembers((prev) => prev.map((m) => ({ ...m, sendProgress: 0, trackId: null, progress: 0 })));
      for (const conn of connsRef.current.values()) streamTrack(conn, track);
    },
    [streamTrack],
  );

  return { status, members, playback, setPlayback, loadTrack };
}
