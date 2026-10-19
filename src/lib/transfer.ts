import type { DataConnection } from "peerjs";
import type { HostMessage, TrackMeta } from "./protocol";

export const CHUNK_SIZE = 64 * 1024;
export const MAX_TRACK_BYTES = 50 * 1024 * 1024;
export const ACCEPT_ATTR = ".mp3,.m4a,.aac,.wav,.ogg,.flac,audio/*";

// Keep the data channel's send buffer bounded so a 50 MB file does not
// balloon memory or stall the clock pings sharing the channel.
const MAX_BUFFERED = 1024 * 1024;

export async function sendTrack(
  conn: DataConnection,
  meta: TrackMeta,
  buffer: ArrayBuffer,
  onProgress?: (fraction: number) => void,
) {
  const total = Math.ceil(buffer.byteLength / CHUNK_SIZE);
  send(conn, { type: "track-meta", track: meta });
  for (let index = 0; index < total; index += 1) {
    if (!conn.open) return;
    await drain(conn);
    const start = index * CHUNK_SIZE;
    send(conn, {
      type: "track-chunk",
      trackId: meta.id,
      index,
      total,
      data: buffer.slice(start, start + CHUNK_SIZE),
    });
    onProgress?.((index + 1) / total);
  }
  send(conn, { type: "track-done", trackId: meta.id });
}

function send(conn: DataConnection, message: HostMessage) {
  conn.send(message);
}

async function drain(conn: DataConnection) {
  while (conn.open && conn.dataChannel && conn.dataChannel.bufferedAmount > MAX_BUFFERED) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export class TrackAssembler {
  readonly meta: TrackMeta;
  private chunks = new Map<number, ArrayBuffer | Uint8Array>();
  private total: number | null = null;

  constructor(meta: TrackMeta) {
    this.meta = meta;
  }

  receive(index: number, total: number, data: ArrayBuffer | Uint8Array) {
    this.total = total;
    this.chunks.set(index, data);
  }

  get progress() {
    return this.total ? this.chunks.size / this.total : 0;
  }

  get isComplete() {
    return this.total !== null && this.chunks.size === this.total;
  }

  toArrayBuffer(): ArrayBuffer {
    const parts = [...this.chunks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, data]) => (data instanceof ArrayBuffer ? new Uint8Array(data) : data));
    const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.byteLength;
    }
    return out.buffer;
  }
}
