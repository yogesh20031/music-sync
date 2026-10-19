# How Music Share connects and stays in sync

This explains the moving parts behind a session: how phones find each other,
how they agree on a clock, how a start time is shared, and how a device gets
back in sync after it drifts or sleeps. File paths are relative to `src/`.

## Reading order

Read in this order. Each step builds on the previous one.

1. `lib/protocol.ts` — the message vocabulary. Every byte that crosses the network is one of these shapes.
2. `lib/clock.ts` — the offset math. Pure functions with tests in `lib/clock.test.ts`.
3. `lib/playback-state.ts` — the one object that describes "what is playing and when". Tests in `lib/playback-state.test.ts`.
4. `hooks/useHostRoom.ts` — host side of the network: opens the room, answers pings, streams the file, broadcasts state.
5. `hooks/useGuestRoom.ts` — guest side: connects, pings, downloads the file, receives state, reconnects.
6. `hooks/useClockSync.ts` — the ping schedule that feeds `lib/clock.ts`.
7. `lib/audio-engine.ts` and `hooks/useAudioPlayer.ts` — turning "start at host time T" into a sample-accurate Web Audio start on this phone.
8. `hooks/useYouTubeSync.ts` — the same idea for the YouTube player, with drift correction.
9. `hooks/useVisibilityResync.ts`, `hooks/useWakeLock.ts` — recovery after screen lock or tab switch.
10. `components/session/HostSession.tsx` and `components/session/GuestRoom.tsx` — where all of the above is wired together.

## 1. Connecting: who talks to whom

There is no server of ours. Phones connect directly over WebRTC data channels.

```
            PeerJS broker (0.peerjs.com)
            only for the handshake
                 ▲             ▲
                 │ register    │ "connect me to music-share-ABC234"
                 │             │
   ┌─────────────┴──┐      ┌───┴──────────┐
   │ Host (Mac)     │◄────►│ Guest phone  │   WebRTC data channel
   │ id: music-     │◄────►│ Guest phone  │   (audio file, pings, state)
   │ share-ABC234   │      └──────────────┘
   └────────────────┘
```

- **Room code = peer id.** `lib/room-code.ts` generates a 6-character code and
  `peerIdForCode` turns it into `music-share-ABC234`. The host registers that
  id with the PeerJS broker. If the id is taken, the host regenerates
  (`useHostRoom.ts`, the `unavailable-id` branch).
- **Guests dial that id.** `useGuestRoom.ts` creates an anonymous peer and
  calls `peer.connect(peerIdForCode(code), { reliable: true, serialization: "binary" })`.
  The broker exchanges the WebRTC offer and answer, then steps out. After
  that every message is phone to phone, usually over the local Wi-Fi.
- **Hello.** When the data channel opens the guest sends `{ type: "hello", name }`.
  The host replies with `welcome`, which carries the current playback state
  and the current track's metadata, so a late joiner knows immediately what
  is going on.
- **Reconnect.** If the channel closes without an `end` message from the host,
  the guest retries three times with backoff (1 s, 2 s, 4 s). If the channel
  never opens within 15 s, that counts as a failure too. The error text points
  at the most common cause: the phone is not on the host's Wi-Fi.
- **Goodbye.** The host sends `{ type: "end" }` to everyone on unmount and on
  `pagehide`, so guests show "The host ended the session" instead of trying
  to reconnect.

All incoming messages are validated with Zod (`parseGuestMessage`,
`parseHostMessage` in `lib/protocol.ts`) before anything acts on them.

## 2. The shared clock

Phones' clocks disagree by anything from milliseconds to seconds, so nothing
is scheduled on wall-clock time. The host's `performance.now()` is the
master clock, and every guest learns its own offset from it.

```
guest                          host
  │  ping { t0 }                 │
  │ ────────────────────────────►│  t1 = performance.now()
  │              pong { t0, t1 } │
  │◄──────────────────────────── │
  t2 = performance.now()

  rtt    = t2 - t0
  offset = t1 - (t0 + rtt / 2)     (lib/clock.ts: makeSample)
```

- `useClockSync.ts` sends 10 pings 150 ms apart right after connecting, then
  one every 5 s forever.
- `lib/clock.ts` keeps the last 20 samples. `estimateClock` sorts by round
  trip, takes the 3 fastest, and uses the median of their offsets. Fast
  samples have the least asymmetry, so this is far more stable than an
  average. The estimate also reports the best round trip, which the UI shows
  as "good / fair / poor".
- Converting between clocks is one subtraction: `hostToLocal(hostTime, offsetMs) = hostTime - offsetMs`.
- The host's own offset is 0 (`HOST_OFFSET_MS` in `HostSession.tsx`), so the
  host runs the exact same player code as a guest.

Guests report their offset and round trip back to the host in `status`
messages, which is what the member list displays.

## 3. Playback state: one object, every device derives from it

The host never sends "play now". It broadcasts a state and each device
computes where it should be. Defined in `lib/protocol.ts`:

```ts
{ status: "idle" }
{ status: "playing", source, anchorHostTime, anchorPositionMs }
{ status: "paused",  source, positionMs }
```

`lib/playback-state.ts` has the two formulas that everything else uses:

```
positionAtHostTime(state, t) = anchorPositionMs + (t - anchorHostTime)
msUntilStart(state, t)       = anchorHostTime - t
```

- **Scheduled start** is just `playing` with `anchorHostTime` in the future.
  The countdown on each phone is `msUntilStart` evaluated on the host clock.
- **Pause** freezes `positionMs`.
- **Resume and seek** send a new `playing` state anchored 500 ms ahead
  (`COMMAND_LEAD_MS`), so every device acts at the same instant rather than
  when its copy of the message happened to arrive.
- **Late joiners** receive the same state in `welcome` and `positionAtHostTime`
  tells them they should already be 42 s in. They start there.

The host applies state locally and broadcasts it in one call:
`setPlayback` in `useHostRoom.ts`.

## 4. File mode: sample-accurate start

The file goes to each guest before playback, so nothing streams during the
song. `lib/transfer.ts` splits it into 64 KB chunks (`track-meta`,
`track-chunk` × n, `track-done`) and paces sending so the data channel's
buffer never exceeds 1 MB. `TrackAssembler` rebuilds it on the guest.
`GuestRoom.tsx` then calls `engine.decode` once the whole file is in.

Starting on time is `AudioEngine.play` in `lib/audio-engine.ts`:

```
startAtHostTime
   │ hostToLocal(offset)            lib/clock.ts
   ▼
startAtPerf   (this phone's performance.now() domain)
   │ perfToOutputCtxTime            AudioEngine
   ▼
when (AudioContext seconds)  + nudge
   │
   ▼
source.start(when, positionSec)   sample-accurate
```

- `perfToOutputCtxTime` uses `AudioContext.getOutputTimestamp()` when the
  browser has it. That pair maps context time to the moment sound actually
  leaves the speaker, so output latency is already accounted for. Browsers
  without it fall back to `currentTime` minus `outputLatency`/`baseLatency`.
- If `when` is already in the past (late joiner, or a phone that woke up
  late), the engine starts now and skips ahead by exactly how late it is.
- **Nudge** (the slider under "This device") adds a per-phone offset for
  latency nobody can measure, like a Bluetooth speaker.

`hooks/useAudioPlayer.ts` decides *when* to call `play`:

- It re-schedules when the anchor changes (new start, seek, resume).
- It ignores clock estimate wobble under 15 ms, because restarting the
  source for that would be audible.
- Every 30 s it compares the engine's own position to
  `positionAtHostTime` and hard-restarts if they differ by more than 40 ms.
  This catches slow drift between the phone's audio clock and the host.

## 5. YouTube mode: approximate by nature

We can't control YouTube's audio pipeline, only ask its player to seek and
play, so `hooks/useYouTubeSync.ts` works differently:

- **Pre-warm.** `arm()` (called from the ready tap) plays muted for an
  instant, pauses, seeks to 0 and unmutes, so the buffer is warm before the
  real start.
- **Scheduled start.** A `setTimeout` fires at `hostToLocal(anchorHostTime)`
  and calls `seekTo` + `playVideo`.
- **Drift loop** every 500 ms while playing: `drift = player.getCurrentTime() - expected`.
  - Under 200 ms: leave it alone.
  - 200 ms to 1.2 s: play at 1.25× (behind) or 0.75× (ahead) until within
    60 ms, then back to 1×. This keeps the stream flowing; a seek would make
    the phone re-buffer and show a spinner.
  - Over 1.2 s: seek, then wait 3 s before judging again.
  - While the player reports buffering, do nothing.
- The hook exposes `driftMs`, which the UI shows under the player.

Expect 100 to 300 ms between devices here. That's fine for watching together
and audibly echoey for stacking speakers, which is why the UI labels it
"Approximate".

## 6. Resyncing after sleep, tab switch, or interruption

Phones suspend audio when the screen locks or the tab goes to the background.
Three pieces handle coming back:

- `hooks/useVisibilityResync.ts` listens for `visibilitychange` and
  `pageshow`. On return it runs the callback both session screens pass in:
  `tryResume()` to resume the AudioContext, then `resync()`.
- `resync()` is `schedule(true)` in `useAudioPlayer.ts`: recompute the
  position from the shared state and the current clock offset and restart
  the source there. Nothing is remembered from before the sleep; the state
  plus the clock is always enough to land in the right place.
- If the browser refuses to resume audio outside a tap (iOS does this after
  an interruption), `useAudioEngine.ts` reports `unlocked = false` and the
  guest screen shows the ready gate again with "Resume".
- `hooks/useWakeLock.ts` asks the OS to keep the screen on after the ready
  tap and re-acquires the lock when the page becomes visible again. It needs
  HTTPS, so it is silently off on plain `http://192.168.x.x` dev links.

The "Resync" button on both screens calls the same `resync()`.

## 7. One session, end to end

```
host: open /host ─► useHostRoom registers music-share-ABC234
guest: open /join?code=ABC234 ─► useGuestRoom dials it
guest ─► hello                    host ─► welcome { state: idle, track: null }
guest ─► ping ×10 then every 5 s  host ─► pong          (offset converges)
guest taps "I'm ready"            AudioContext unlocked, wake lock, status sent
host picks file                   host ─► track-meta, track-chunk…, track-done
                                  guest decodes, status { trackId } ─► host shows Ready
host taps "Start in 10 s"         host ─► state { playing, anchorHostTime: now+10 s }
every device                      countdown = msUntilStart on host clock
                                  AudioEngine.play(hostToLocal(anchor), 0)
                                  all sources start within the clock error
host taps pause                   host ─► state { paused, positionMs }
host taps play                    host ─► state { playing, anchor: now+500 ms, position }
phone screen locks and unlocks    visibilitychange ─► tryResume ─► resync ─► back in place
host closes tab                   pagehide ─► end ─► guests show "host ended"
```

## Where the numbers come from

| Constant | Where | Why this value |
| --- | --- | --- |
| 10 pings × 150 ms, then 5 s | `useClockSync.ts` | fast convergence on join, low chatter afterwards |
| best 3 of last 20 samples | `lib/clock.ts` | low-RTT median rejects asymmetric outliers |
| `COMMAND_LEAD_MS` 500 | `lib/playback-state.ts` | longer than any LAN round trip, short enough to feel instant |
| 15 ms reschedule threshold | `useAudioPlayer.ts` | below what the ear separates, above estimate wobble |
| 40 ms / 30 s drift check | `useAudioPlayer.ts` | catches audio-clock drift before it becomes audible |
| 200 ms / 1.2 s / 3 s | `useYouTubeSync.ts` | rate nudges for small drift, seeks only for big gaps |
| 64 KB chunks, 1 MB buffer cap | `lib/transfer.ts` | keeps pings responsive during a 50 MB transfer |
