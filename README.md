# Music Share

Play the same music on several phones at the same instant, so a room full of
phone speakers sounds like one louder speaker instead of an echo.

One person hosts a session and picks a track. Everyone else joins with a
6-character code or a QR scan. The host presses Start, and every device begins
playback at the same moment. Pause, resume, seek and stop stay in sync too.

There is no backend and no login. Phones talk to each other directly over
WebRTC. The only outside service is PeerJS's free public broker, used once per
join so the phones can find each other. Audio, files and commands never leave
the peer-to-peer connection.

## Two playback modes

| Mode | How it works | Sync accuracy |
| --- | --- | --- |
| **File** | Host picks an audio file. It is streamed phone to phone, decoded on each device, and started with the Web Audio scheduler at an agreed host timestamp. | About 10 to 30 ms. Sounds like one speaker. |
| **YouTube** | Host pastes a link. Every device loads the YouTube player, pre-buffers, seeks to the agreed position, and a drift loop keeps it close by speeding up or slowing down. | About 100 to 300 ms. Labelled "approximate". Ads are not handled. |

Bluetooth is not a mode. Browsers cannot send audio to several Bluetooth
speakers, so the app shows a tip instead: pair a speaker to any one phone in
the phone's settings, and that phone drives it.

## How it stays in sync

1. **Shared clock.** Each guest pings the host over the data channel. From the
   round trip it computes its clock offset to the host. It keeps the last 20
   samples and uses the median of the 3 lowest-latency ones.
2. **One playback state.** The host broadcasts a single object: what is
   playing, the host time it was anchored at, and the track position at that
   anchor. Every device derives "where should I be right now" from that plus
   its offset. "Scheduled" is just a playing state with an anchor in the
   future.
3. **Scheduled starts.** The host puts every command half a second in the
   future so all devices act at the same instant. Late joiners compute the
   current position and start there.
4. **Recovery.** When a phone sleeps or switches tabs, it recomputes its
   position from the broadcast state on wake and restarts there. A Resync
   button does the same by hand. Per-device nudge and volume sliders handle
   speakers with unknown latency.

The full walkthrough, with a reading order through the code and a table of
every tuning constant, is in [`docs/SYNC.md`](docs/SYNC.md).

## Stack

- **Next.js 16** App Router, **React 19**, **TypeScript** strict
- **Tailwind CSS v4** with Apple Human Interface Guidelines tokens coded directly in `src/app/globals.css` (type scale, system colours in light and dark, radii, capsule buttons, inset grouped lists, segmented control)
- **PeerJS** for WebRTC signalling and data channels
- **Zod** to validate every message that arrives over the network
- **Web Audio API** for sample-accurate scheduling, **YouTube IFrame API** for the approximate mode
- **qrcode.react** for the join QR, **lucide-react** for icons
- **Vitest** for unit tests, **pnpm** as the package manager

## Project layout

```
src/
  app/             pages: / (home), /host, /join
  components/ui/   HIG primitives: Button, Card, InsetGroup, Slider, SegmentedControl...
  components/session/  host and guest screens and their parts
  hooks/           useHostRoom, useGuestRoom, useClockSync, useAudioPlayer,
                   useYouTubeSync, useVisibilityResync, useWakeLock
  lib/             protocol, clock math, playback state, audio engine,
                   file transfer, room codes, YouTube URL parsing (with tests)
docs/SYNC.md       how connecting and resyncing work, and where to read the code
```

## Run it locally

Requirements: Node 20 or newer and pnpm.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000 on the host machine. To join from phones on the
same Wi-Fi, use the **Network** address the dev server prints, for example
`http://192.168.1.20:3000`. The dev server already allows LAN origins through
`allowedDevOrigins` in `next.config.ts`.

Notes for testing on real devices:

- All devices must be on the same Wi-Fi unless you configure a TURN relay (see below).
- Every device needs one tap on "Ready" so the browser allows audio to play.
- The screen wake lock only works over HTTPS, so on a plain `http://` LAN link keep the phone screens on.
- Safari cannot decode `.ogg` or `.flac` files. MP3, M4A and WAV work everywhere.

Other scripts:

```sh
pnpm test        # unit tests for clock math, playback state, URL parsing, room codes
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm build       # production build
pnpm start       # serve the production build
```

## Configuration

Everything is optional. Copy `.env.example` to `.env.local` to override:

- `NEXT_PUBLIC_PEER_HOST`, `_PORT`, `_PATH`, `_SECURE`, `_KEY` to point at a self-hosted PeerJS server instead of the public broker.
- `NEXT_PUBLIC_TURN_URL`, `_USERNAME`, `_CREDENTIAL` to add a TURN relay so phones on different networks (cellular vs Wi-Fi) can still connect.

## Using it

1. One person opens the site and taps **Host a session**.
2. Others scan the QR or type the 6-character code on the home page and enter a name.
3. Each guest taps **Ready**. The host sees who is ready and their latency.
4. The host picks a file or pastes a YouTube link, chooses a start delay or clock time, and taps **Start**.
5. Everyone hears the same thing at the same moment. If one phone sounds early or late, drag its nudge slider until it lines up.
