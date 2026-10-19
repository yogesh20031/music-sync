import { useCallback, useEffect, useRef, useState } from "react";

export function useWakeLock() {
  const [active, setActive] = useState(false);
  const wantedRef = useRef(false);
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      lockRef.current = lock;
      setActive(true);
      lock.addEventListener("release", () => {
        lockRef.current = null;
        setActive(false);
      });
    } catch {
      setActive(false);
    }
  }, []);

  const request = useCallback(async () => {
    wantedRef.current = true;
    await acquire();
  }, [acquire]);

  // The OS releases the lock when the tab is hidden; take it back on return.
  useEffect(() => {
    const handle = () => {
      if (document.visibilityState === "visible" && wantedRef.current && !lockRef.current) {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => {
      document.removeEventListener("visibilitychange", handle);
      void lockRef.current?.release();
    };
  }, [acquire]);

  return { active, request };
}
