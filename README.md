<div align="center">

# 🔊 Music Share

**Turn every phone in the room into one big speaker.**

Same track. Same instant. No app install, no account, no server.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![WebRTC](https://img.shields.io/badge/WebRTC-peer%20to%20peer-333333?logo=webrtc&logoColor=white)](https://webrtc.org)
[![Tests](https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white)](#-scripts)

</div>

---

## ✨ What it does

One person **hosts**. Everyone else **scans a QR** or types a 6-letter code.
The host picks a song and hits Start. Every phone begins at the exact same
moment, and pause, seek and stop stay locked together.

Instead of one tinny phone speaker you get five, ten, twenty of them playing
in phase. It sounds louder, fuller, and nothing like an echo.

```
   📱 host ──┐
   📱 guest ─┤   same Wi-Fi, direct WebRTC links
   📱 guest ─┼──▶  🎵  one shared clock, one start time
   📱 guest ─┤
   📱 guest ─┘
```

## 🎛️ Two modes

|  | 🎧 **File mode** | ▶️ **YouTube mode** |
| --- | --- | --- |
| **You give it** | An mp3, m4a or wav from the host's phone | A YouTube link |
| **How it plays** | File is streamed phone to phone, decoded locally, started by the Web Audio scheduler at an agreed host timestamp | Each device loads the player, pre-buffers, seeks to the agreed spot, and a drift loop nudges speed to stay close |
| **How tight** | ⚡ **10 to 30 ms.** One speaker. | 🟡 **100 to 300 ms.** Labelled approximate. Ads are not handled. |

> **Bluetooth?** Browsers cannot feed several Bluetooth speakers at once, so it
> is a tip rather than a mode: pair a speaker to any one phone in the phone's
> settings and that phone drives it.

## 🧠 How it stays in sync

There is no server of ours in the loop. Phones talk straight to each other
over WebRTC data channels. The free PeerJS broker is used once per join so the
phones can find each other, then it is out of the picture.

1. **Shared clock.** Guests ping the host. From the round trip each guest
   learns its clock offset, keeping the last 20 samples and trusting the
   median of the 3 fastest.
2. **One source of truth.** The host broadcasts a single playback state:
   what is playing, the host time it was anchored at, and the position at
   that anchor. Every phone derives "where should I be *right now*" from that
   plus its offset. A scheduled start is just a playing state whose anchor is
   in the future.
3. **Commands land together.** The host puts every play, pause and seek half
   a second ahead, so all devices act on the same tick. Late joiners work out
   the current position and drop straight in.
4. **It heals itself.** Lock the screen, switch tabs, come back: the phone
   recomputes from the broadcast state and restarts in the right place. A
   **Resync** button does the same by hand. Nudge and volume sliders fix
   speakers with weird latency.

Want the full story with a guided reading order through the code and a table
of every tuning constant? 👉 [`docs/SYNC.md`](docs/SYNC.md)

## 🚀 Quick start

```sh
pnpm install
pnpm dev
```

Open **http://localhost:3000** on the host. On phones, use the **Network**
address the dev server prints, such as `http://192.168.1.20:3000`. LAN origins
are already allowed in `next.config.ts`.

Then:

1. Tap **Host a session** on one device.
2. Scan the QR or type the code on the others. Add a name if you like.
3. Everyone taps **Ready** once, so the browser lets audio play.
4. Host picks a file or pastes a link, chooses "start in 5 s" or a clock time, taps **Start**.
5. 🎉 If one phone sounds a hair early or late, drag its nudge slider until it lines up.

**Testing on real devices**

- 📶 Same Wi-Fi for everyone, unless you add a TURN relay (see config).
- 🔆 Wake lock needs HTTPS. On a plain `http://` LAN link, keep screens on.
- 🍎 Safari cannot decode `.ogg` or `.flac`. MP3, M4A and WAV work everywhere.

## 🧰 Stack

- **Next.js 16** App Router · **React 19** · **TypeScript** strict
- **Tailwind CSS v4** with Apple Human Interface Guidelines tokens coded by hand in `src/app/globals.css`: iOS type scale, system colours for light and dark, capsule buttons, inset grouped lists, segmented control, a touch of Liquid Glass
- **PeerJS** for WebRTC signalling and data channels
- **Zod** validates every message that crosses the network
- **Web Audio API** for sample-accurate starts · **YouTube IFrame API** for the approximate mode
- **qrcode.react** · **lucide-react** · **Vitest** · **pnpm**

## 🗂️ Project layout

```
src/
  app/                 /  ·  /host  ·  /join
  components/ui/       HIG primitives: Button, Card, InsetGroup, Slider, SegmentedControl…
  components/session/  host and guest screens and their parts
  hooks/               useHostRoom · useGuestRoom · useClockSync · useAudioPlayer
                       useYouTubeSync · useVisibilityResync · useWakeLock
  lib/                 protocol · clock math · playback state · audio engine
                       file transfer · room codes · YouTube URL parsing (+ tests)
docs/SYNC.md           how connecting and resyncing work, where to start reading
```

## 📜 Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with LAN access |
| `pnpm test` | Unit tests: clock math, playback state, URL parsing, room codes |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm build` / `pnpm start` | Production build and serve |

## ⚙️ Configuration

All optional. Copy `.env.example` to `.env.local` to override.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_PEER_HOST` `_PORT` `_PATH` `_SECURE` `_KEY` | Point at a self-hosted PeerJS server instead of the public broker |
| `NEXT_PUBLIC_TURN_URL` `_USERNAME` `_CREDENTIAL` | Add a TURN relay so phones on different networks can still connect |

---

<div align="center">

Built with the idea that a group of phones is already a sound system. It just needed a clock.

</div>
