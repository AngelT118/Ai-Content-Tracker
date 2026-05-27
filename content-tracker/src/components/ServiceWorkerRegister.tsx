"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only register in production — in dev, the SW would cache the old bundle
    // and make hot reload confusing.
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    const controller = new AbortController();
    const run = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        // Don't surface to the user; offline is a progressive enhancement.
        console.warn("Service worker registration failed:", err);
      });
    };

    if (document.readyState === "complete") {
      run();
    } else {
      window.addEventListener("load", run, {
        once: true,
        signal: controller.signal,
      });
    }

    return () => controller.abort();
  }, []);

  return null;
}
