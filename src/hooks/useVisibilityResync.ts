import { useEffect, useRef } from "react";

// Screen lock or a tab switch suspends audio; when the page comes back,
// re-anchor playback instead of resuming from a stale position.
export function useVisibilityResync(onVisible: () => void) {
  const callbackRef = useRef(onVisible);

  useEffect(() => {
    callbackRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const handle = () => {
      if (document.visibilityState === "visible") callbackRef.current();
    };
    document.addEventListener("visibilitychange", handle);
    window.addEventListener("pageshow", handle);
    return () => {
      document.removeEventListener("visibilitychange", handle);
      window.removeEventListener("pageshow", handle);
    };
  }, []);
}
