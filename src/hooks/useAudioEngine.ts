import { useCallback, useEffect, useState } from "react";
import { AudioEngine } from "@/lib/audio-engine";

export function useAudioEngine() {
  const [engine] = useState(() => new AudioEngine());
  const [hasContext, setHasContext] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Call from a user gesture.
  const unlock = useCallback(async () => {
    await engine.unlock();
    setHasContext(true);
    setUnlocked(engine.isUnlocked);
  }, [engine]);

  // Best effort after an interruption (phone call, screen lock); may be
  // refused outside a gesture, in which case the ready gate shows again.
  const tryResume = useCallback(async () => {
    if (!engine.context || engine.isUnlocked) return;
    try {
      await engine.unlock();
    } catch {
      // Browser refused; user will tap again.
    }
    setUnlocked(engine.isUnlocked);
  }, [engine]);

  useEffect(() => {
    if (!hasContext) return;
    return engine.onStateChange(() => setUnlocked(engine.isUnlocked));
  }, [engine, hasContext]);

  return { engine, unlocked, unlock, tryResume };
}
