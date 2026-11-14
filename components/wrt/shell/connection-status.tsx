"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

const BACK_ONLINE_MS = 4000;

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Says when the app is offline, then briefly that it's back online. */
export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onOnline = () => {
      setBackOnline(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
    };
    const onOffline = () => {
      window.clearTimeout(timer);
      setBackOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="wrt-connection" role="status" aria-live="polite">
      {!online && (
        <p className="wrt-connection__bar wrt-connection__bar--offline">
          You&apos;re offline. New pages won&apos;t load and changes can&apos;t be saved until you&apos;re back online.
        </p>
      )}
      {online && backOnline && (
        <p className="wrt-connection__bar wrt-connection__bar--online">You&apos;re back online.</p>
      )}
    </div>
  );
}
