import { useEffect, useRef, useState } from "react";

const MILESTONE_STEP = 500;
const LS_KEY = "xp_milestone_shown_v1";

function getLastShown() {
  const v = parseInt(localStorage.getItem(LS_KEY) || "0", 10);
  return Number.isFinite(v) ? v : 0;
}

function setLastShown(v) {
  localStorage.setItem(LS_KEY, String(v));
}

function milestoneFor(xp) {
  return Math.floor(xp / MILESTONE_STEP) * MILESTONE_STEP;
}

export default function useXpMilestonePopup() {
  const lastXpRef = useRef(null);

  const [milestone, setMilestone] = useState(null); // number like 500, 1000, ...
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onXpUpdated = (e) => {
      // We support either: event.detail.xp_balance OR event.detail.xpBalance
      const xp =
        e?.detail?.xp_balance ??
        e?.detail?.xpBalance ??
        null;

      if (typeof xp !== "number") return;

      // prevent weird first-load spam: just initialize lastXpRef
      if (lastXpRef.current === null) {
        lastXpRef.current = xp;
        return;
      }

      const reached = milestoneFor(xp);
      const lastShown = getLastShown();

      // Only show if we crossed into a new milestone and haven't shown it yet
      if (reached >= MILESTONE_STEP && reached > lastShown) {
        setMilestone(reached);
        setOpen(true);
        setLastShown(reached);
      }

      lastXpRef.current = xp;
    };

    window.addEventListener("xp-updated", onXpUpdated);
    return () => window.removeEventListener("xp-updated", onXpUpdated);
  }, []);

  return {
    open,
    milestone,
    close: () => setOpen(false),
  };
}
