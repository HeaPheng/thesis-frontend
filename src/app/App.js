import React, { useState, useEffect, useCallback, useRef } from "react";
import AppRoutes from "../routes/AppRoutes";
import ScrollToTop from "../components/ScrollToTop";
import MilestoneModal from "../components/XpMilestoneModal";
import { UserProvider } from "../context/UserContext";

import {
  activityPing,
  getUnseenMilestone,
  markMilestoneSeen,
} from "../lib/api";

function App() {
  const [lang, setLang] = useState("en");

  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneData, setMilestoneData] = useState(null);

  const checkingRef = useRef(false);

  const checkAndShowMilestone = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      await activityPing();

      const res = await getUnseenMilestone();
      const m = res?.data?.milestone;

      console.log("unseen milestone:", m);

      if (!m) return;

      setMilestoneData(m);
      setMilestoneOpen(true);

      await markMilestoneSeen(m.id);
    } catch (err) {
      console.error("milestone check failed:", err);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkAndShowMilestone();
  }, [checkAndShowMilestone]);

  useEffect(() => {
    const onXpUpdated = () => checkAndShowMilestone();
    window.addEventListener("xp-updated", onXpUpdated);
    return () => window.removeEventListener("xp-updated", onXpUpdated);
  }, [checkAndShowMilestone]);

  return (
    <>
     <UserProvider>
      <ScrollToTop />

      <AppRoutes lang={lang} setLang={setLang} />

      {milestoneData && (
        <MilestoneModal
          open={milestoneOpen}
          milestone={milestoneData.milestone_value}
          xpBalance={milestoneData.xp_balance}
          onClose={() => setMilestoneOpen(false)}
        />
      )}
      </UserProvider>
    </>
  );
}

export default App;
