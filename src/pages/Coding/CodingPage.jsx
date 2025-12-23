// CodingPage.jsx (FULL FIXED)
// ✅ Fixes "Cannot access 'courseKey' before initialization"
// ✅ courseKey is ALWAYS the slug from URL (courseId)
// ✅ Saves resume to localStorage + backend (last_unit_id / last_lesson_id)
// ✅ Keeps fast navigation to QCM (navigate first, save in background)

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import "../Lessons/LessonPage.css";
import "./CodingPage.css";
import api from "../../lib/api";

/* ---------------------------------
   Helpers (Coding hasOne, backward compatible + bilingual)
---------------------------------- */
const getUnitCodingEn = (unitObj) =>
  unitObj?.codingExerciseEn ??
  unitObj?.coding_exercise_en ??
  unitObj?.codingExercise ??
  unitObj?.coding_exercise ??
  null;

const getUnitCodingKm = (unitObj) =>
  unitObj?.codingExerciseKm ??
  unitObj?.coding_exercise_km ??
  null;

const hasUnitCoding = (unitObj) => !!getUnitCodingEn(unitObj);

export default function CodingPage() {
  const { courseId, unitId } = useParams(); // courseId is SLUG
  const navigate = useNavigate();

  // ✅ DEFINE THESE FIRST (Fix TDZ error)
  const courseKey = useMemo(() => String(courseId || ""), [courseId]); // ALWAYS slug
  const unitIdNum = useMemo(() => Number(unitId || 0), [unitId]);
  const unitKey = useMemo(() => String(unitId || ""), [unitId]);

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  // ======= API COURSE DATA =======
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ language
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");
  useEffect(() => {
    const onLangChanged = (e) => {
      const next = e?.detail?.lang;
      if (next === "en" || next === "km") setLang(next);
      else setLang(localStorage.getItem("app_lang") || "en");
    };
    window.addEventListener("app-lang-changed", onLangChanged);
    return () => window.removeEventListener("app-lang-changed", onLangChanged);
  }, []);

  const pickText = useCallback((en, km) => (lang === "km" ? km || en || "" : en || km || ""), [lang]);

  // ✅ Enrollment + Progress (DB)
  const [enrollCheckLoading, setEnrollCheckLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [progressLoading, setProgressLoading] = useState(true);
  const [completedLessonIds, setCompletedLessonIds] = useState(() => new Set());
  const [unitProgressMap, setUnitProgressMap] = useState({});

  // ✅ time tracking key per course (slug)
  const timeKey = useMemo(() => `course-time-${courseKey}`, [courseKey]);

  useEffect(() => {
    const current = JSON.parse(localStorage.getItem(timeKey) || "{}");
    if (!current.startedAt) {
      localStorage.setItem(timeKey, JSON.stringify({ startedAt: Date.now(), minutes: 0 }));
    }
  }, [timeKey]);

  const saveTime = useCallback(() => {
    const current = JSON.parse(localStorage.getItem(timeKey) || "{}");
    const startedAt = Number(current.startedAt || Date.now());
    const minutesSaved = Number(current.minutes || 0);
    const extra = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
    const minutes = minutesSaved + extra;

    localStorage.setItem(timeKey, JSON.stringify({ startedAt: Date.now(), minutes }));
    return Math.max(1, minutes);
  }, [timeKey]);

  const markProgressDirty = useCallback(() => {
    try {
      localStorage.setItem("progress_dirty", "1");
      localStorage.setItem("progress_dirty_course", String(courseKey));
      window.dispatchEvent(new Event("progress-dirty"));
    } catch {}
  }, [courseKey]);

  // ✅ Save local resume immediately (so Continue Learning can land on Coding)
  useEffect(() => {
    if (!courseKey || !unitIdNum) return;
    try {
      localStorage.setItem(`resume_type_v1:${courseKey}`, "coding");
      localStorage.setItem(`resume_unit_v1:${courseKey}`, String(unitIdNum));
      // lesson pointer for coding: use last lesson later once course loads
    } catch {}
  }, [courseKey, unitIdNum]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ✅ fetch course by slug
  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get(`/courses/${courseKey}`)
      .then((res) => {
        if (!alive) return;
        setCourse(res.data || null);
      })
      .catch((err) => {
        console.error(err);
        if (!alive) return;
        setCourse(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [courseKey]);

  const units = useMemo(() => (Array.isArray(course?.units) ? course.units : []), [course]);

  const unitIndex = useMemo(() => units.findIndex((u) => Number(u.id) === unitIdNum), [units, unitIdNum]);
  const unit = unitIndex >= 0 ? units[unitIndex] : null;

  // ✅ quiz existence (UNIT-based)
  const hasQcm = useMemo(() => Number(unit?.qcm_count || 0) > 0, [unit?.qcm_count]);

  // ✅ coding hasOne (EN main + KM support)
  const codingEn = useMemo(() => getUnitCodingEn(unit), [unit]);
  const codingKm = useMemo(() => getUnitCodingKm(unit), [unit]);
  const hasCoding = useMemo(() => hasUnitCoding(unit), [unit]);

  // ✅ last lesson id for routing /resume pointer
  const lastLessonId = useMemo(() => {
    const list = unit?.lessons || [];
    return list.length ? Number(list[list.length - 1]?.id || 0) : 0;
  }, [unit]);

  // ✅ ping backend resume once we know lastLessonId
  useEffect(() => {
    if (!isEnrolled) return;
    if (!courseKey || !unitIdNum || !lastLessonId) return;

    api
      .post(`/progress/course/${courseKey}/resume`, {
        unit_id: Number(unitIdNum),
        lesson_id: Number(lastLessonId),
      })
      .catch(() => {});
  }, [isEnrolled, courseKey, unitIdNum, lastLessonId]);

  // ✅ TEMP fallback exercise
  const tempExercise = useMemo(
    () => ({
      title: "HTML Basics Practice",
      title_km: "អនុវត្ត HTML មូលដ្ឋាន",
      prompt: "Create a heading and a paragraph. Change the text color using CSS and log a message in JS.",
      prompt_km: "បង្កើតចំណងជើង និងអត្ថបទ។ ប្ដូរពណ៌អត្ថបទដោយ CSS ហើយ log សារមួយក្នុង JS។",
      starter_html: `<h1>Hello World</h1>\n<p>Edit me ✨</p>`,
      starter_css: `body { font-family: sans-serif; }\nh1 { color: #2563eb; }`,
      starter_js: `console.log("Coding started 🚀");`,
      requirements: ["Use at least 1 <h1>", "Use at least 1 <p>", "Change color in CSS"],
      requirements_km: ["ប្រើ <h1> យ៉ាងហោចណាស់ 1", "ប្រើ <p> យ៉ាងហោចណាស់ 1", "ប្ដូរពណ៌នៅក្នុង CSS"],
    }),
    []
  );

  const finalExercise = useMemo(() => {
    if (codingEn || codingKm) return { ...(codingEn || {}), ...(codingKm || {}) };
    return tempExercise;
  }, [codingEn, codingKm, tempExercise]);

  // ========= Draft key =========
  const draftKey = useMemo(() => `coding_draft_v1:${courseKey}:${unitKey}`, [courseKey, unitKey]);

  // ========= Starter fallbacks =========
  const starter = useMemo(() => {
    const html = finalExercise?.starter_html ?? "";
    const css = finalExercise?.starter_css ?? "";
    const js = finalExercise?.starter_js ?? "";

    const single = finalExercise?.starterCode ?? finalExercise?.starter_code ?? "";

    if (html || css || js) return { html, css, js };
    if (single) return { html: single, css: "", js: "" };

    return {
      html: `<!-- Write HTML here -->
<div class="box">
  <h1>Hello Coding 👋</h1>
  <p>Edit HTML/CSS/JS, then click Run.</p>
</div>`,
      css: `/* Write CSS here */
.box{
  padding:16px;
  border:1px solid #444;
  border-radius:12px;
}`,
      js: `// Write JavaScript here
console.log("JS is running ✅");`,
    };
  }, [finalExercise]);

  // ========= 3-file editor state =========
  const [htmlCode, setHtmlCode] = useState(starter.html);
  const [cssCode, setCssCode] = useState(starter.css);
  const [jsCode, setJsCode] = useState(starter.js);

  // load draft or starter when unit changes
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHtmlCode(String(parsed.html ?? starter.html));
        setCssCode(String(parsed.css ?? starter.css));
        setJsCode(String(parsed.js ?? starter.js));
        return;
      } catch {}
    }
    setHtmlCode(starter.html);
    setCssCode(starter.css);
    setJsCode(starter.js);
  }, [draftKey, starter.html, starter.css, starter.js]);

  // Auto-save draft
  useEffect(() => {
    const payload = { html: htmlCode, css: cssCode, js: jsCode, updatedAt: Date.now() };
    localStorage.setItem(draftKey, JSON.stringify(payload));
  }, [draftKey, htmlCode, cssCode, jsCode]);

  /* ----------------------------
     Enrollment check (NO auto-enroll)
  ---------------------------- */
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!courseKey) return;

      setEnrollCheckLoading(true);
      try {
        await api.get(`/progress/course/${courseKey}`);
        if (!alive) return;
        setIsEnrolled(true);
      } catch {
        if (!alive) return;
        setIsEnrolled(false);
      } finally {
        if (alive) setEnrollCheckLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [courseKey]);

  /* ----------------------------
     Refresh progress (ONLY if enrolled)
  ---------------------------- */
  const refreshProgress = useCallback(async () => {
    if (!courseKey || !isEnrolled) return;

    setProgressLoading(true);
    try {
      const { data } = await api.get(`/progress/course/${courseKey}`);
      const ids = Array.isArray(data?.completed_lesson_ids) ? data.completed_lesson_ids : [];
      setCompletedLessonIds(new Set(ids.map((x) => Number(x))));
      setUnitProgressMap(data?.unit_progress || {});
    } catch (e) {
      console.error("Failed to load progress:", e);
    } finally {
      setProgressLoading(false);
    }
  }, [courseKey, isEnrolled]);

  useEffect(() => {
    if (!isEnrolled) return;
    refreshProgress();
  }, [isEnrolled, refreshProgress]);

  /* ----------------------------
     Guards
  ---------------------------- */
  const isUnitCompleted = useCallback((unitIdStr) => !!unitProgressMap?.[String(unitIdStr)]?.completed, [unitProgressMap]);
  const isLessonCompleted = useCallback((lessonIdNumArg) => completedLessonIds.has(Number(lessonIdNumArg)), [completedLessonIds]);

  const canOpenUnit = useCallback(
    (uIndex) => {
      if (!isEnrolled) return false;
      if (uIndex <= 0) return true;
      const prevUnit = units[uIndex - 1];
      if (!prevUnit) return false;
      return isUnitCompleted(prevUnit.id);
    },
    [isEnrolled, units, isUnitCompleted]
  );

  const canOpenCodingDB = useCallback(
    (uIndex, unitObj) => {
      if (!isEnrolled) return false;
      if (!unitObj?.lessons?.length) return false;
      if (!canOpenUnit(uIndex)) return false;
      return unitObj.lessons.every((l) => isLessonCompleted(l.id));
    },
    [isEnrolled, canOpenUnit, isLessonCompleted]
  );

  /* ----------------------------
     Back to lesson
  ---------------------------- */
  const goBackToLesson = useCallback(() => {
    saveTime();
    if (lastLessonId) {
      navigate(`/course/${courseKey}/unit/${unitKey}/lesson/${Number(lastLessonId)}`);
      return;
    }
    navigate(`/courses/${courseKey}`);
  }, [saveTime, lastLessonId, navigate, courseKey, unitKey]);

  /* ----------------------------
     Guard redirect: coding locked
  ---------------------------- */
  useEffect(() => {
    if (!unit || !units?.length) return;
    if (enrollCheckLoading || progressLoading) return;

    if (!isEnrolled) {
      navigate(`/courses/${courseKey}`, { replace: true });
      return;
    }

    if (!hasCoding) {
      navigate(`/courses/${courseKey}`, { replace: true });
      return;
    }

    const ok = canOpenCodingDB(unitIndex, unit);
    if (!ok) {
      const lessons = unit?.lessons || [];
      if (!lessons.length) {
        navigate(`/courses/${courseKey}`, { replace: true });
        return;
      }

      let fallbackIdx = 0;
      for (let i = 0; i < lessons.length; i++) {
        if (i === 0) fallbackIdx = 0;
        else if (isLessonCompleted(lessons[i - 1]?.id)) fallbackIdx = i;
      }

      const fallbackLessonId = lessons[fallbackIdx]?.id || lessons[0]?.id;
      navigate(`/course/${courseKey}/unit/${unitKey}/lesson/${Number(fallbackLessonId)}`, { replace: true });
    }
  }, [
    unit,
    units?.length,
    enrollCheckLoading,
    progressLoading,
    isEnrolled,
    hasCoding,
    canOpenCodingDB,
    unitIndex,
    courseKey,
    unitKey,
    navigate,
    isLessonCompleted,
  ]);

  // ========= Runner (iframe srcDoc + console capture) =========
  const [activeTab, setActiveTab] = useState("html");
  const [consoleLines, setConsoleLines] = useState([]);
  const [runId, setRunId] = useState(() => `run_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const [runNonce, setRunNonce] = useState(0);

  const clearConsole = () => setConsoleLines([]);

  const appendConsole = (type, args) => {
    const ts = new Date().toLocaleTimeString();
    setConsoleLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        ts,
        type,
        text: (args || [])
          .map((x) => {
            if (typeof x === "string") return x;
            try {
              return JSON.stringify(x);
            } catch {
              return String(x);
            }
          })
          .join(" "),
      },
    ]);
  };

  useEffect(() => {
    function onMessage(ev) {
      const data = ev.data;
      if (!data || data.__from !== "coding-iframe") return;
      if (data.runId !== runId) return;

      if (data.type === "console") appendConsole(data.level || "log", data.args || []);
      if (data.type === "error") appendConsole("error", [data.message || "Runtime error"]);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [runId]);

  const srcDoc = useMemo(() => {
    const injected = `
<script>
(function(){
  const runId = ${JSON.stringify(runId)};
  function send(payload){
    try{
      parent.postMessage(Object.assign({__from:"coding-iframe", runId}, payload), "*");
    }catch(e){}
  }

  const levels = ["log","warn","error","info"];
  levels.forEach((lvl)=>{
    const orig = console[lvl];
    console[lvl] = function(){
      const args = Array.from(arguments);
      send({ type: "console", level: lvl, args });
      try{ orig.apply(console, args); }catch(e){}
    }
  });

  window.addEventListener("error", function(e){
    send({ type: "error", message: e.message || "Error" });
  });

  window.addEventListener("unhandledrejection", function(e){
    const msg = (e.reason && (e.reason.message || String(e.reason))) || "Unhandled promise rejection";
    send({ type: "error", message: msg });
  });
})();
</script>`;

    const looksFullDoc = /<html[\s>]/i.test(htmlCode) || /<!doctype html>/i.test(htmlCode);

    if (looksFullDoc) {
      let doc = htmlCode;

      if (cssCode?.trim()) {
        if (/<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, `<style>${cssCode}</style></head>`);
        else doc = `<style>${cssCode}</style>\n` + doc;
      }

      const jsBlock = `${injected}\n<script>\n${jsCode || ""}\n</script>`;
      if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, `${jsBlock}</body>`);
      else doc = doc + "\n" + jsBlock;

      return doc;
    }

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${cssCode || ""}</style>
</head>
<body>
${htmlCode || ""}
${injected}
<script>
${jsCode || ""}
</script>
</body>
</html>`;
  }, [runId, htmlCode, cssCode, jsCode]);

  const run = () => {
    const newRunId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setRunId(newRunId);
    setConsoleLines([]);
    setRunNonce((x) => x + 1);
  };

  const reset = () => {
    setHtmlCode(starter.html);
    setCssCode(starter.css);
    setJsCode(starter.js);
    setConsoleLines([]);
    localStorage.removeItem(draftKey);
    run();
  };

  /* ----------------------------
     Complete coding in DB (POST only)
  ---------------------------- */
  const markCodingCompleteDB = useCallback(async () => {
    if (!isEnrolled) return false;
    if (!unit?.id) return false;

    try {
      await api.post("/progress/coding/complete", { unit_id: Number(unit.id) });
      markProgressDirty();
      return true;
    } catch (e) {
      console.error("mark coding complete failed:", e);
      return false;
    }
  }, [isEnrolled, unit?.id, markProgressDirty]);

  /* ----------------------------
     Go to quiz (instant navigation)
  ---------------------------- */
  const [goingQcm, setGoingQcm] = useState(false);

  const goQCM = useCallback(() => {
    if (goingQcm) return;

    saveTime();

    if (!hasQcm) {
      alert(pickText("No quiz for this unit.", "មិនមានសំណួរសម្រាប់ជំពូកនេះទេ។"));
      return;
    }

    if (!lastLessonId) {
      navigate(`/courses/${courseKey}`);
      return;
    }

    setGoingQcm(true);

    // ✅ navigate immediately (lesson-based route)
    navigate(`/course/${courseKey}/unit/${unitKey}/qcm/${Number(lastLessonId)}`);

    // ✅ background save
    markCodingCompleteDB().finally(() => {
      setGoingQcm(false);
    });
  }, [goingQcm, saveTime, hasQcm, pickText, lastLessonId, navigate, courseKey, unitKey, markCodingCompleteDB]);

  // ===== Render guards =====
  if (loading) return <h2 style={{ padding: 40, color: "white" }}>{pickText("Loading...", "កំពុងផ្ទុក...")}</h2>;
  if (!course) return <h2 style={{ padding: 40, color: "white" }}>{pickText("Course not found", "រកមិនឃើញវគ្គសិក្សា")}</h2>;
  if (!unit) return <h2 style={{ padding: 40, color: "white" }}>{pickText("Unit not found", "រកមិនឃើញជំពូក")}</h2>;
  if (!hasCoding) return <h2 style={{ padding: 40, color: "white" }}>{pickText("No coding exercise for this unit.", "មិនមានលំហាត់ Coding សម្រាប់ជំពូកនេះទេ។")}</h2>;

  const unitTitleUI = pickText(unit?.title, unit?.title_km);

  const exerciseTitleUI = pickText(
    finalExercise?.title || "Coding Exercise",
    finalExercise?.title_km || finalExercise?.title || "Coding Exercise"
  );

  const promptUI = pickText(
    finalExercise?.prompt || finalExercise?.instructions || "No instructions.",
    finalExercise?.prompt_km || finalExercise?.instructions_km || finalExercise?.instructions || finalExercise?.prompt || "No instructions."
  );

  const reqsUI =
    lang === "km"
      ? Array.isArray(finalExercise?.requirements_km)
        ? finalExercise.requirements_km
        : finalExercise?.requirements
      : finalExercise?.requirements;

  const rawCourseLang =
    course?.programming_language ??
    course?.language ??
    course?.course_language ??
    course?.code_language ??
    course?.lang ??
    "";

  const courseLangLabel = rawCourseLang ? String(rawCourseLang).toUpperCase() : "HTML";

  return (
    <div className="lesson-page coding-page coding-lock">
      <div className="lesson-header coding-header-blank" />

      <div className="lesson-content-wrapper coding-wrapper">
        <div className="lesson-content coding-content">
          <div className="coding-shell">
            <h2 className="qcm-title coding-title">{exerciseTitleUI}</h2>

            <div className="coding-3col">
              {/* LEFT */}
              <div className="coding-panel coding-left">
                <div className="coding-panel-title">{pickText("Instructions", "សេចក្តីណែនាំ")}</div>

                <div className="coding-panel-body coding-instructions-scroll">
                  <div className="coding-md">{promptUI}</div>

                  {Array.isArray(reqsUI) && reqsUI.length > 0 && (
                    <>
                      <div className="coding-subtitle">{pickText("Requirements", "តម្រូវការ")}</div>
                      <ul className="coding-list">
                        {reqsUI.map((r, idx) => (
                          <li key={idx}>{String(r)}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {/* MIDDLE */}
              <div className="coding-panel coding-middle">
                <div className="coding-panel-title coding-editor-title">
                  <div className="coding-tabs">
                    <button className={`coding-tab ${activeTab === "html" ? "active" : ""}`} onClick={() => setActiveTab("html")} type="button">
                      HTML
                    </button>
                    <button className={`coding-tab ${activeTab === "css" ? "active" : ""}`} onClick={() => setActiveTab("css")} type="button">
                      CSS
                    </button>
                    <button className={`coding-tab ${activeTab === "js" ? "active" : ""}`} onClick={() => setActiveTab("js")} type="button">
                      JS
                    </button>
                  </div>

                  <div className="coding-run-actions">
                    <span className="coding-lang-pill">{courseLangLabel}</span>

                    <button className="qcm-btn-secondary" onClick={reset} type="button">
                      {pickText("Reset", "កំណត់ឡើងវិញ")}
                    </button>
                    <button className="qcm-btn-primary" onClick={run} type="button">
                      {pickText("Run", "រត់")} ▶
                    </button>
                  </div>
                </div>

                <div className="coding-panel-body coding-editor-body">
                  {activeTab === "html" && (
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      defaultLanguage="html"
                      value={htmlCode}
                      onChange={(val) => setHtmlCode(val || "")}
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        automaticLayout: true,
                      }}
                    />
                  )}

                  {activeTab === "css" && (
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      defaultLanguage="css"
                      value={cssCode}
                      onChange={(val) => setCssCode(val || "")}
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        automaticLayout: true,
                      }}
                    />
                  )}

                  {activeTab === "js" && (
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      defaultLanguage="javascript"
                      value={jsCode}
                      onChange={(val) => setJsCode(val || "")}
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        wordWrap: "on",
                        automaticLayout: true,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* RIGHT */}
              <div className="coding-panel coding-right">
                <div className="coding-panel-title coding-right-title">
                  <span>{pickText("Output", "លទ្ធផល")}</span>
                  <div className="coding-run-actions">
                    <button className="qcm-btn-secondary" onClick={clearConsole} type="button">
                      {pickText("Clear Console", "លុប Console")}
                    </button>
                  </div>
                </div>

                <div className="coding-panel-body coding-right-body">
                  <div className="coding-preview">
                    <iframe key={`iframe_${runNonce}`} title="preview" className="coding-iframe" sandbox="allow-scripts" srcDoc={srcDoc} />
                  </div>

                  <div className="coding-console">
                    <div className="coding-console-title">{pickText("Console", "Console")}</div>
                    <div className="coding-console-body">
                      {consoleLines.length === 0 ? (
                        <div className="coding-console-empty">{pickText("No logs yet. Click Run.", "មិនទាន់មាន log ទេ។ ចុច Run.")}</div>
                      ) : (
                        consoleLines.map((l) => (
                          <div key={l.id} className={`coding-console-line ${l.type}`}>
                            <span className="coding-console-ts">{l.ts}</span>
                            <span className="coding-console-msg">{l.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="coding-actions">
                    <button className="qcm-btn-secondary" onClick={goBackToLesson} type="button">
                      ← {pickText("Back to Lesson", "ត្រឡប់ទៅមេរៀន")}
                    </button>

                    <button className="qcm-btn-primary" onClick={goQCM} type="button" disabled={!hasQcm || goingQcm}>
                      {goingQcm ? pickText("Opening...", "កំពុងបើក...") : pickText("Go to Quiz", "ទៅកាន់សំណួរ")} →
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* end 3-panel */}
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="lesson-footer-bar">
        <div className="lf-left">
          <button
            className="lf-btn"
            onClick={() => {
              saveTime();
              navigate(`/courses/${courseKey}`);
            }}
            type="button"
          >
            <i className="bi bi-house"></i>
          </button>

          <div className="dropdown-container" ref={menuRef}>
            <button className="lf-btn" onClick={() => setOpenMenu(!openMenu)} type="button">
              <i className="bi bi-list"></i>
            </button>

            {openMenu && (
              <div className="lesson-dropdown">
                <h4>
                  {unitTitleUI} • {pickText("Coding", "Coding")}
                </h4>
                <ul>
                  <li>
                    <button className="qcm-jump-btn" onClick={() => setOpenMenu(false)} type="button">
                      {exerciseTitleUI}
                    </button>
                  </li>

                  <li>
                    <button
                      className="qcm-jump-btn"
                      onClick={() => {
                        setOpenMenu(false);
                        goBackToLesson();
                      }}
                      type="button"
                    >
                      ← {pickText("Back to Lesson", "ត្រឡប់ទៅមេរៀន")}
                    </button>
                  </li>

                  {hasQcm && (
                    <li>
                      <button
                        className="qcm-jump-btn"
                        onClick={() => {
                          setOpenMenu(false);
                          goQCM();
                        }}
                        type="button"
                        disabled={goingQcm}
                      >
                        {goingQcm ? pickText("Opening...", "កំពុងបើក...") : pickText("Go to Quiz", "ទៅកាន់សំណួរ")} →
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <button className="lf-unit-title" type="button">
            {unitTitleUI} • {pickText("Coding", "Coding")}
          </button>
        </div>

        <div className="lf-right">
          <button className="lf-nav" onClick={goBackToLesson} type="button">
            ← {pickText("Prev", "ថយក្រោយ")}
          </button>

          <span className="lf-count">{pickText("Coding", "Coding")}</span>

          <button className="lf-nav" onClick={goQCM} type="button" disabled={!hasQcm || goingQcm}>
            {goingQcm ? pickText("Opening...", "កំពុងបើក...") : pickText("Next", "បន្ទាប់")} →
          </button>
        </div>
      </div>
    </div>
  );
}
