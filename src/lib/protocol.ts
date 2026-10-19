import { z } from "zod";

export const SourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("file"),
    trackId: z.string(),
    name: z.string(),
    durationMs: z.number(),
  }),
  z.object({ kind: z.literal("youtube"), videoId: z.string() }),
]);
export type Source = z.infer<typeof SourceSchema>;

// One object the host broadcasts; every device derives its own position from it.
export const PlaybackStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }),
  z.object({
    status: z.literal("playing"),
    source: SourceSchema,
    anchorHostTime: z.number(),
    anchorPositionMs: z.number(),
  }),
  z.object({
    status: z.literal("paused"),
    source: SourceSchema,
    positionMs: z.number(),
  }),
]);
export type PlaybackState = z.infer<typeof PlaybackStateSchema>;

export const TrackMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  mime: z.string(),
  durationMs: z.number(),
});
export type TrackMeta = z.infer<typeof TrackMetaSchema>;

// BinaryPack hands back ArrayBuffer on some browsers and Uint8Array on others.
const BinarySchema = z.union([z.instanceof(ArrayBuffer), z.instanceof(Uint8Array)]);

export const GuestMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello"), name: z.string().max(40) }),
  z.object({ type: z.literal("ping"), t0: z.number() }),
  z.object({
    type: z.literal("status"),
    ready: z.boolean(),
    trackId: z.string().nullable(),
    progress: z.number(),
    offsetMs: z.number().nullable(),
    rttMs: z.number().nullable(),
  }),
]);
export type GuestMessage = z.infer<typeof GuestMessageSchema>;

export const HostMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pong"), t0: z.number(), t1: z.number() }),
  z.object({
    type: z.literal("welcome"),
    state: PlaybackStateSchema,
    track: TrackMetaSchema.nullable(),
  }),
  z.object({ type: z.literal("state"), state: PlaybackStateSchema }),
  z.object({ type: z.literal("track-meta"), track: TrackMetaSchema }),
  z.object({
    type: z.literal("track-chunk"),
    trackId: z.string(),
    index: z.number(),
    total: z.number(),
    data: BinarySchema,
  }),
  z.object({ type: z.literal("track-done"), trackId: z.string() }),
  z.object({ type: z.literal("end") }),
]);
export type HostMessage = z.infer<typeof HostMessageSchema>;

export function parseGuestMessage(raw: unknown): GuestMessage | null {
  const result = GuestMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseHostMessage(raw: unknown): HostMessage | null {
  const result = HostMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function toArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}
