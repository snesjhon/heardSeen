"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "heardseen:install-banner-dismissed";

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag for "launched from home screen".
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

// iOS/iPadOS Safari has no native "install this PWA" prompt (unlike Chrome's
// beforeinstallprompt), so this is the only way users discover Add to Home
// Screen: an in-app instructional banner shown only on iOS, only in the
// browser (not once already installed), and only until dismissed.
export function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isIos() && !isStandalone() && !localStorage.getItem(DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-violet-700 px-4 py-2 text-sm text-white">
      <p>
        Install heardSeen: tap{" "}
        <span aria-hidden className="font-semibold">
          Share ⬆
        </span>{" "}
        then <span className="font-semibold">Add to Home Screen</span>.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
