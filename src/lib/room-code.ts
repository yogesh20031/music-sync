// No 0/O/1/I so codes survive being read aloud or typed from a photo.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
const PEER_ID_PREFIX = "music-share-";

export function generateRoomCode() {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizeRoomCode(input: string) {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string) {
  return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}

export function peerIdForCode(code: string) {
  return `${PEER_ID_PREFIX}${code}`;
}

// crypto.randomUUID is unavailable on plain-http LAN addresses, which is how
// phones reach a dev server, so build ids from getRandomValues instead.
export function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Accepts whatever people paste: a bare code, the join link, or a sentence
// that contains the code. Falls back to plain normalization.
export function extractRoomCode(input: string) {
  const fromLink = /code=([A-Za-z0-9]{6})/i.exec(input);
  if (fromLink) return normalizeRoomCode(fromLink[1]);
  const token = input
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .find((part) => isValidRoomCode(part));
  return token ?? normalizeRoomCode(input);
}
