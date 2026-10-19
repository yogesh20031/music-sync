import type Peer from "peerjs";
import type { PeerOptions } from "peerjs";

// With no env set, PeerJS uses its free public broker. The broker only
// introduces peers; audio and files always travel phone to phone.
function peerOptions(): PeerOptions {
  const host = process.env.NEXT_PUBLIC_PEER_HOST;
  const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  const options: PeerOptions = { config: { iceServers }, debug: 0 };
  if (host) {
    options.host = host;
    options.port = Number(process.env.NEXT_PUBLIC_PEER_PORT ?? 443);
    options.path = process.env.NEXT_PUBLIC_PEER_PATH ?? "/";
    options.secure = process.env.NEXT_PUBLIC_PEER_SECURE !== "false";
    if (process.env.NEXT_PUBLIC_PEER_KEY) options.key = process.env.NEXT_PUBLIC_PEER_KEY;
  }
  return options;
}

// peerjs touches browser globals at import time, so load it lazily on the client.
export async function createPeer(id?: string): Promise<Peer> {
  const { default: PeerCtor } = await import("peerjs");
  const options = peerOptions();
  return id ? new PeerCtor(id, options) : new PeerCtor(options);
}

export function describePeerError(type: string) {
  switch (type) {
    case "browser-incompatible":
      return "This browser does not support WebRTC. Try Safari or Chrome.";
    case "network":
    case "socket-error":
    case "socket-closed":
    case "server-error":
      return "Could not reach the signaling service. Check your internet connection.";
    case "unavailable-id":
      return "Could not reserve a room code. Please try again.";
    case "peer-unavailable":
      return "No session with that code is online.";
    default:
      return "Something went wrong with the connection.";
  }
}
