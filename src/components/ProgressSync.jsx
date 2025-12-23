import { useEffect, useRef } from "react";
import api from "../lib/api";

const CACHE_KEY = "dashboard_cache_v1";

function readCacheRaw() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCacheRaw(obj) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

export default function ProgressSync() {
  const runningRef = useRef(false);

  useEffect(() => {
    const tick = async () => {
      const dirty = localStorage.getItem("progress_dirty") === "1";
      const courseKey = localStorage.getItem("progress_dirty_course") || "";

      if (!dirty || !courseKey) return;
      if (runningRef.current) return;

      runningRef.current = true;

      try {
        // ✅ fetch only the updated course progress (FAST)
        const pr = await api.get(`/progress/course/${courseKey}`);
        const data = pr?.data || {};

        const completedLessonIds = Array.isArray(data?.completed_lesson_ids)
          ? data.completed_lesson_ids.map((x) => Number(x))
          : [];

        const unitProg = data?.unit_progress || {};
        const completedUnits = Object.values(unitProg).filter((up) => up?.completed).length;

        // ✅ update dashboard cache instantly
        const cached = readCacheRaw();
        const continueCourses = Array.isArray(cached?.continueCourses) ? cached.continueCourses : [];
        const stats = cached?.stats || {};

        const nextContinue = continueCourses.map((c) => {
          if (String(c.courseKey) !== String(courseKey)) return c;

          const totalLessons = Number(c.totalLessons || 0);
          const totalUnits = Number(c.totalUnits || 0);

          const progressPct =
            totalLessons > 0
              ? Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100))
              : c.progressPct || 0;

          return {
            ...c,
            completedLessons: completedLessonIds.length,
            completedUnits,
            progressPct,
            isCompletedCourse: totalUnits > 0 && completedUnits >= totalUnits,
            lastUnitId: data?.last_unit_id ? Number(data.last_unit_id) : c.lastUnitId,
            lastLessonId: data?.last_lesson_id ? Number(data.last_lesson_id) : c.lastLessonId,
          };
        });

        // if course not in cache yet, do nothing (dashboard will add it next time)

        // recompute stats (cheap)
        const enrolled = nextContinue.length;
        const totalCompletedUnits = nextContinue.reduce((s, x) => s + (x.completedUnits || 0), 0);
        const certificates = nextContinue.filter((x) => x.isCompletedCourse).length;
        const progress = enrolled
          ? Math.round(nextContinue.reduce((s, x) => s + (x.progressPct || 0), 0) / enrolled)
          : 0;

        const nextStats = {
          ...stats,
          enrolled,
          completedUnits: totalCompletedUnits,
          certificates,
          progress,
        };

        writeCacheRaw({
          ...cached,
          continueCourses: nextContinue,
          stats: nextStats,
          updatedAt: new Date().toISOString(),
        });
        window.dispatchEvent(new Event("dashboard-cache-updated"));
        // ✅ clear dirty (sync done)
        localStorage.removeItem("progress_dirty");
        localStorage.removeItem("progress_dirty_course");
      } catch (e) {
        // keep dirty flag so it retries next tick
      } finally {
        runningRef.current = false;
      }
    };

    // ✅ small interval: update happens even when not on dashboard
    const id = setInterval(tick, 900); // ~1s
    tick(); // run once immediately
    return () => clearInterval(id);
  }, []);

  return null;
}
