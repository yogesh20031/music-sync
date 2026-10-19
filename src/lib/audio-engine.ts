/*
 * Thin wrapper over Web Audio that schedules a decoded buffer to start at a
 * specific performance.now() instant. Web Audio scheduling is sample-accurate,
 * so once the clock offset to the host is known, this is where the sync happens.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAtCtx = 0;
  private startedOffsetSec = 0;
  private volume = 1;

  get isUnlocked() {
    return this.ctx !== null && this.ctx.state === "running";
  }

  get context() {
    return this.ctx;
  }

  // Must run inside a user gesture the first time, or iOS keeps it suspended.
  async unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.ctx.destination);
    }
    if (this.ctx.state !== "running") await this.ctx.resume();
    return this.ctx;
  }

  async decode(data: ArrayBuffer) {
    const ctx = this.ctx ?? new AudioContext();
    this.ctx = ctx;
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(ctx.destination);
    }
    // decodeAudioData detaches the buffer it is given, so hand it a copy.
    return ctx.decodeAudioData(data.slice(0));
  }

  setVolume(value: number) {
    this.volume = value;
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
    }
  }

  // Convert a local performance.now() instant into AudioContext time for the
  // moment that frame actually leaves the speaker.
  private perfToOutputCtxTime(perfMs: number) {
    const ctx = this.ctx;
    if (!ctx) return 0;
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined) {
      // contextTime here is the frame currently being heard, so output latency
      // is already baked into the pair.
      return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    }
    const latency = ctx.outputLatency ?? ctx.baseLatency ?? 0;
    return ctx.currentTime + (perfMs - performance.now()) / 1000 - latency;
  }

  play(buffer: AudioBuffer, startAtPerfMs: number, positionMs: number, nudgeMs: number) {
    const ctx = this.ctx;
    const gain = this.gain;
    if (!ctx || !gain) return;
    this.stop();

    const when = this.perfToOutputCtxTime(startAtPerfMs) + nudgeMs / 1000;
    const now = ctx.currentTime;
    // Give the graph a few ms to connect; if the start is already past,
    // skip ahead by exactly the amount we are late so we land in sync.
    const startAt = Math.max(when, now + 0.01);
    const offsetSec = positionMs / 1000 + (startAt - when);
    if (offsetSec >= buffer.duration) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start(startAt, Math.max(0, offsetSec));
    source.onended = () => {
      if (this.source === source) this.source = null;
    };
    this.source = source;
    this.startedAtCtx = startAt;
    this.startedOffsetSec = Math.max(0, offsetSec);
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // Already stopped or never started; nothing to do.
      }
      this.source.disconnect();
      this.source = null;
    }
  }

  get isPlaying() {
    return this.source !== null;
  }

  // Where the engine believes it currently is, in ms, for drift checks.
  currentPositionMs() {
    if (!this.ctx || !this.source) return null;
    return (this.ctx.currentTime - this.startedAtCtx + this.startedOffsetSec) * 1000;
  }

  onStateChange(listener: () => void) {
    const ctx = this.ctx;
    if (!ctx) return () => {};
    ctx.addEventListener("statechange", listener);
    return () => ctx.removeEventListener("statechange", listener);
  }
}
