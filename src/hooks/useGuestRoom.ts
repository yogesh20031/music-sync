import { useCallback, useEffect, useRef, useState } from "react";
import type Peer from "peerjs";
import type { DataConnection } from "peerjs";
import { createPeer, describePeerError } from "@/lib/peer";
import { parseHostMessage, type GuestMessage, type PlaybackState, type TrackMeta } from "@/lib/protocol";
import { peerIdForCode } from "@/lib/room-code";
import { TrackAssembler } from "@/lib/transfer";
import { useClockSync } from "./useClockSync";

export type GuestStatus =
  | { kind: "connecting" }
  | { kind: "connected" }
  | { kind: "reconnecting"; attempt: number }
  | { kind: "ended" }
  | { kind: "error"; message: string };

export type TrackDownload = { meta: TrackMeta; progress: number; data: ArrayBuffer | null };

type StatusReport = Omit<Extract<GuestMessage, { type: "status" }>, "type">;

const MAX_RETRIES = 3;
const OPEN_TIMEOUT_MS = 15000;
const IDLE: PlaybackState = { status: "idle" };

export function useGuestRoom(code: string, name: string) {
  const [status, setStatus] = useState<GuestStatus>({ kind: "connecting" });
  const [connected, setConnected] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState>(IDLE);
  const [track, setTrack] = useState<TrackDownload | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const assemblerRef = useRef<TrackAssembler | null>(null);

  const sendMessage = useCallback((message: GuestMessage) => {
    const conn = connRef.current;
    if (conn?.open) conn.send(message);
  }, []);

  const clock = useClockSync({
    active: connected,
    send: (t0) => sendMessage({ type: "ping", t0 }),
  });
  const { onPong } = clock;

  useEffect(() => {
    let disposed = false;
    let attempt = 0;
    let endedByHost = false;
    let peer: Peer | null = null;
    let retryTimer = 0;
    let openTimer = 0;

    const fail = (message: string) => {
      if (!disposed) setStatus({ kind: "error", message });
    };

    const scheduleRetry = (finalMessage: string) => {
      if (disposed || endedByHost) return;
      if (attempt >= MAX_RETRIES) {
        fail(finalMessage);
        return;
      }
      attempt += 1;
      setStatus({ kind: "reconnecting", attempt });
      retryTimer = window.setTimeout(dial, 1000 * 2 ** (attempt - 1));
    };

    const handle = (raw: unknown) => {
      const message = parseHostMessage(raw);
      if (!message) return;
      switch (message.type) {
        case "pong":
          onPong(message.t0, message.t1);
          break;
        case "welcome":
          setPlayback(message.state);
          if (message.track) setTrack({ meta: message.track, progress: 0, data: null });
          break;
        case "state":
          setPlayback(message.state);
          break;
        case "track-meta":
          assemblerRef.current = new TrackAssembler(message.track);
          setTrack({ meta: message.track, progress: 0, data: null });
          break;
        case "track-chunk": {
          const assembler = assemblerRef.current;
          if (!assembler || assembler.meta.id !== message.trackId) return;
          assembler.receive(message.index, message.total, message.data);
          const step = Math.floor(assembler.progress * 20);
          setTrack((prev) => {
            if (!prev || prev.meta.id !== message.trackId) return prev;
            if (Math.floor(prev.progress * 20) === step) return prev;
            return { ...prev, progress: assembler.progress };
          });
          break;
        }
        case "track-done": {
          const assembler = assemblerRef.current;
          if (!assembler || assembler.meta.id !== message.trackId || !assembler.isComplete) return;
          setTrack({ meta: assembler.meta, progress: 1, data: assembler.toArrayBuffer() });
          break;
        }
        case "end":
          endedByHost = true;
          setStatus({ kind: "ended" });
          connRef.current?.close();
          break;
      }
    };

    const dial = () => {
      if (!peer || disposed) return;
      const conn = peer.connect(peerIdForCode(code), { reliable: true, serialization: "binary" });
      connRef.current = conn;
      openTimer = window.setTimeout(() => {
        if (!conn.open) {
          conn.close();
          scheduleRetry("Could not reach the host. Join the same Wi-Fi as the host and try again.");
        }
      }, OPEN_TIMEOUT_MS);
      conn.on("open", () => {
        window.clearTimeout(openTimer);
        attempt = 0;
        setStatus({ kind: "connected" });
        setConnected(true);
        conn.send({ type: "hello", name } satisfies GuestMessage);
      });
      conn.on("data", handle);
      conn.on("close", () => {
        window.clearTimeout(openTimer);
        setConnected(false);
        if (endedByHost) setStatus({ kind: "ended" });
        else scheduleRetry("Lost the connection to the host.");
      });
      conn.on("error", () => {
        window.clearTimeout(openTimer);
        setConnected(false);
        scheduleRetry("Lost the connection to the host.");
      });
    };

    const start = async () => {
      const created = await createPeer();
      if (disposed) {
        created.destroy();
        return;
      }
      peer = created;
      created.on("open", dial);
      created.on("error", (error) => {
        if (error.type === "peer-unavailable") {
          scheduleRetry(`No session with code ${code} is online right now.`);
          return;
        }
        fail(describePeerError(error.type));
      });
    };
    void start();

    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      window.clearTimeout(openTimer);
      connRef.current?.close();
      connRef.current = null;
      peer?.destroy();
    };
  }, [code, name, onPong]);

  const sendStatus = useCallback(
    (report: StatusReport) => sendMessage({ type: "status", ...report }),
    [sendMessage],
  );

  return { status, playback, track, clock, sendStatus };
}
