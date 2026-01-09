import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Container, Card, Button, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import "./User.css";

// ✅ Use UserContext instead of calling /auth/me here
import { useUser } from "../../context/UserContext";

export default function Settings({ lang, setLang }) {
  const navigate = useNavigate();

  // ✅ Global user (no /auth/me here)
  const { user, loading } = useUser();

  // ✅ language reactive (fallback if props not provided)
  const [localLang, setLocalLang] = useState(() => localStorage.getItem("app_lang") || "en");
  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang || localStorage.getItem("app_lang") || "en";
      setLocalLang(next === "km" ? "km" : "en");
    };
    window.addEventListener("app-lang-changed", onLang);
    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const activeLang = lang === "km" || lang === "en" ? lang : localLang;

  const ui = useMemo(() => {
    if (activeLang === "km") {
      return {
        title: "ការកំណត់",
        sub: "ភាសា និងការកំណត់ការរៀនឡើងវិញ",
        home: "ទំព័រដើម",

        language: "ភាសា",
        languageSub: "ជ្រើសរើស English ឬ Khmer។",

        learning: "ការរៀន",
        learningSub: "កំណត់វឌ្ឍនភាពឡើងវិញសម្រាប់វគ្គសិក្សាណាមួយ (មិនអាចត្រឡប់វិញបានទេ)។",
        selectCourse: "ជ្រើសវគ្គសិក្សា",
        chooseCourse: "-- ជ្រើសវគ្គសិក្សា --",
        confirmText: "ខ្ញុំយល់ព្រមថានឹងលុបវឌ្ឍនភាពរបស់ខ្ញុំសម្រាប់វគ្គនេះ។",
        reset: "រៀនឡើងវិញ",
        resetting: "កំពុងកំណត់ឡើងវិញ…",
        noCoursesHint: "*បើមិនឃើញវគ្គសិក្សានៅទីនេះ សូមចុះឈ្មោះវគ្គជាមុនសិន។",

        needSelect: "សូមជ្រើសវគ្គសិក្សាជាមុន។",
        needConfirm: "សូមធីកបញ្ជាក់មុនពេលកំណត់ឡើងវិញ។",
        resetOk: "បានកំណត់វឌ្ឍនភាពឡើងវិញ ✅",
        resetFail: "មិនអាចកំណត់វឌ្ឍនភាពឡើងវិញបានទេ។",

        session: "សម័យ",
        sessionSub: "ចេញពីឧបករណ៍នេះ។ វឌ្ឍនភាពរបស់អ្នកនៅសុវត្ថិភាពក្នុងមូលដ្ឋានទិន្នន័យ។",
        logout: "ចាកចេញ",
        loggingOut: "កំពុងចាកចេញ…",
        logoutOk: "បានចាកចេញ ✅",
        logoutFail: "ចាកចេញមិនបានជោគជ័យ",
      };
    }
    return {
      title: "Settings",
      sub: "Preferences and app options",
      home: "Home",

      language: "Language",
      languageSub: "Choose English or Khmer.",

      learning: "Learning",
      learningSub: "Reset your progress for a course (this cannot be undone).",
      selectCourse: "Select course",
      chooseCourse: "-- Choose a course --",
      confirmText: "I understand this will delete my progress for this course.",
      reset: "Reset Progress",
      resetting: "Resetting…",
      noCoursesHint: "*If you don't see courses here, enroll in a course first.",

      needSelect: "Please select a course first.",
      needConfirm: "Please confirm before resetting progress.",
      resetOk: "Progress reset ✅",
      resetFail: "Failed to reset progress.",

      session: "Session",
      sessionSub: "Log out of this device. Your learning progress stays safe in the database.",
      logout: "Logout",
      loggingOut: "Logging out…",
      logoutOk: "Logged out ✅",
      logoutFail: "Logout failed.",
    };
  }, [activeLang]);

  const [loadingLogout, setLoadingLogout] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  // ✅ Auth check via UserContext (no /auth/me call here)
  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  // ✅ Fetch courses on mount (keep API usage for courses)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Using your existing api wrapper here is fine for non-/auth/me endpoints.
        const api = (await import("../../lib/api")).default;
        const { data } = await api.get("/my/courses");
        if (!mounted) return;
        setCourses(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ Option A helpers: clear local caches + resume keys + mark dirty
  const setProgressDirty = useCallback((courseSlug) => {
    try {
      localStorage.setItem("progress_dirty", "1");
      if (courseSlug) localStorage.setItem("progress_dirty_course", String(courseSlug));
      window.dispatchEvent(new Event("dashboard-cache-updated"));
    } catch {}
  }, []);

  const clearCourseLocalCaches = useCallback((courseSlug) => {
    try {
      // global caches
      localStorage.removeItem("dashboard_cache_v1");
      localStorage.removeItem("my_learning_cache_v1");

      if (!courseSlug) return;

      // resume keys (match LessonPage setLocalResume)
      localStorage.removeItem(`resume_type_v1:${courseSlug}`);
      localStorage.removeItem(`resume_unit_v1:${courseSlug}`);
      localStorage.removeItem(`resume_lesson_v1:${courseSlug}`);
    } catch {}
  }, []);

  const resetProgress = async () => {
    setMsg(null);
    setErr(null);

    if (!courseId) return setErr(ui.needSelect);
    if (!confirmReset) return setErr(ui.needConfirm);

    const selected = courses.find((c) => String(c.id) === String(courseId));
    const courseSlug = selected?.slug || null;

    setLoadingReset(true);
    try {
      const api = (await import("../../lib/api")).default;
      await api.post("/progress/reset", { course_id: Number(courseId) });

      // ✅ Option A: clear local caches + resume keys for that course
      clearCourseLocalCaches(courseSlug);

      // ✅ trigger background sync refresh
      setProgressDirty(courseSlug);

      setMsg(ui.resetOk);
      setConfirmReset(false);
    } catch (e) {
      setErr(e?.response?.data?.message || ui.resetFail);
    } finally {
      setLoadingReset(false);
    }
  };

  const logout = async () => {
    setMsg(null);
    setErr(null);
    setLoadingLogout(true);

    try {
      const api = (await import("../../lib/api")).default;
      await api.post("/auth/logout").catch(() => {});
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Let the app know auth changed so UserContext can re-sync
      window.dispatchEvent(new Event("auth-changed"));

      setMsg(ui.logoutOk);
      navigate("/login", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || ui.logoutFail);
    } finally {
      setLoadingLogout(false);
    }
  };

  return (
    <div className="user-page">
      <Container className="user-container">
        <div className="user-header d-flex align-items-start justify-content-between gap-3">
          <div>
            <h2 className="user-title">{ui.title}</h2>
            <div className="user-sub">{ui.sub}</div>
          </div>

          <Button variant="btn btn-outline-primary" onClick={() => navigate("/dashboard")}>
            {ui.home}
          </Button>
        </div>

        {msg && <Alert variant="success">{msg}</Alert>}
        {err && <Alert variant="danger">{err}</Alert>}

        <Card className="user-card user-panel">
          <h4 className="user-panel-title">{ui.language}</h4>
          <div className="user-muted">{ui.languageSub}</div>

          <div className="user-row">
            <LanguageSwitcher lang={activeLang} setLang={setLang || setLocalLang} />
          </div>
        </Card>

        <Card className="user-card user-panel mt-3">
          <h4 className="user-panel-title">{ui.learning}</h4>
          <div className="user-muted">{ui.learningSub}</div>

          <div className="mt-3">
            <div className="mb-2" style={{ fontWeight: 600 }}>
              {ui.selectCourse}
            </div>

            <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">{ui.chooseCourse}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || c.slug || `Course #${c.id}`}
                </option>
              ))}
            </select>

            <div className="form-check mt-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={confirmReset}
                onChange={(e) => setConfirmReset(e.target.checked)}
                id="confirmReset"
              />
              <label className="form-check-label" htmlFor="confirmReset">
                {ui.confirmText}
              </label>
            </div>

            <div className="user-actions mt-3">
              <Button variant="warning" onClick={resetProgress} disabled={loadingReset}>
                {loadingReset ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {ui.resetting}
                  </>
                ) : (
                  ui.reset
                )}
              </Button>
            </div>

            <div className="user-muted mt-2">{ui.noCoursesHint}</div>
          </div>
        </Card>

        <Card className="user-card user-panel mt-3">
          <h4 className="user-panel-title">{ui.session}</h4>
          <div className="user-muted">{ui.sessionSub}</div>

          <div className="user-actions mt-3">
            <Button variant="danger" onClick={logout} disabled={loadingLogout}>
              {loadingLogout ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {ui.loggingOut}
                </>
              ) : (
                ui.logout
              )}
            </Button>
          </div>
        </Card>
      </Container>
    </div>
  );
}
