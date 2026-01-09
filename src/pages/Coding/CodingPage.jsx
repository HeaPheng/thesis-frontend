// CodingPage.jsx (FULL-BLEED CODING ONLY, DOES NOT AFFECT LESSON PAGE)

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
  unitObj?.codingExerciseKm ?? unitObj?.coding_exercise_km ?? null;

const hasUnitCoding = (unitObj) => !!getUnitCodingEn(unitObj);

/* ---------------------------------
   NEW: canonical language helpers
---------------------------------- */
const normalizePistonLanguage = (raw) => {
  const v = String(raw || "").toLowerCase().trim();

  if (["web", "html", ""].includes(v)) return "html";
  if (["py", "python", "python3"].includes(v)) return "python";
  if (["js", "javascript", "node", "nodejs"].includes(v)) return "javascript";
  if (["csharp", "c#", "cs", "csharp.net"].includes(v)) return "csharp.net";
  if (["c", "gcc"].includes(v)) return "c";
  if (["c++", "cpp", "g++"].includes(v)) return "c++";

  return v;
};

const pistonDefaultVersion = (lang) => {
  if (lang === "python") return "3.12.0";
  if (lang === "javascript") return "20.11.1";
  if (lang === "csharp.net") return "5.0.201";
  if (lang === "c") return "10.2.0";
  if (lang === "c++") return "10.2.0";
  return "*";
};

const labelForLang = (lang) => {
  switch (lang) {
    case "html":
      return "HTML";
    case "python":
      return "PYTHON";
    case "javascript":
      return "JAVASCRIPT";
    case "csharp.net":
      return "C#";
    case "c":
      return "C Programming";
    case "c++":
      return "C++";
    default:
      return String(lang || "HTML").toUpperCase();
  }
};

const monacoLangFor = (pistonLangOrHtml) => {
  switch (pistonLangOrHtml) {
    case "python":
      return "python";
    case "javascript":
      return "javascript";
    case "csharp.net":
      return "csharp";
    case "c":
      return "c";
    case "c++":
      return "cpp";
    default:
      return "javascript";
  }
};

const unescapeNewlines = (s) => String(s ?? "").replace(/\\n/g, "\n");

export default function CodingPage() {
  const { courseId, unitId } = useParams(); // courseId is SLUG
  const navigate = useNavigate();

  const courseKey = useMemo(() => String(courseId || ""), [courseId]); // ALWAYS slug
  const unitIdNum = useMemo(() => Number(unitId || 0), [unitId]);
  const unitKey = useMemo(() => String(unitId || ""), [unitId]);

  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  /* ----------------------------
     ✅ Mobile rules:
     - Mobile if small width OR short height (landscape phones)
  ---------------------------- */
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const mqW = window.matchMedia("(max-width: 900px)");
    const mqH = window.matchMedia("(max-height: 520px)");
    return !!(mqW.matches || mqH.matches);
  });
  const [mobileTab, setMobileTab] = useState("instructions");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqW = window.matchMedia("(max-width: 900px)");
    const mqH = window.matchMedia("(max-height: 520px)");

    const apply = () => {
      const next = !!(mqW.matches || mqH.matches);
      setIsMobile(next);
      if (next) setMobileTab("instructions");
    };

    apply();

    const bind = (mq) => {
      if (mq.addEventListener) mq.addEventListener("change", apply);
      else mq.addListener(apply);
    };
    const unbind = (mq) => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };

    bind(mqW);
    bind(mqH);

    return () => {
      unbind(mqW);
      unbind(mqH);
    };
  }, []);

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

  const markProgressDirty = useCallback(() => {
    try {
      localStorage.setItem("progress_dirty", "1");
      localStorage.setItem("progress_dirty_course", String(courseKey));
      window.dispatchEvent(new Event("progress-dirty"));
      window.dispatchEvent(new Event("dashboard-cache-updated"));
    } catch { }
  }, [courseKey]);

  // ✅ Save local resume immediately
  useEffect(() => {
    if (!courseKey || !unitIdNum) return;
    try {
      localStorage.setItem(`resume_type_v1:${courseKey}`, "coding");
      localStorage.setItem(`resume_unit_v1:${courseKey}`, String(unitIdNum));
    } catch { }
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

  const hasQcm = useMemo(() => Number(unit?.qcm_count || 0) > 0, [unit?.qcm_count]);

  const codingEn = useMemo(() => getUnitCodingEn(unit), [unit]);
  const codingKm = useMemo(() => getUnitCodingKm(unit), [unit]);
  const hasCoding = useMemo(() => hasUnitCoding(unit), [unit]);

  const lastLessonId = useMemo(() => {
    const list = unit?.lessons || [];
    return list.length ? Number(list[list.length - 1]?.id || 0) : 0;
  }, [unit]);

  /* ----------------------------
     DB time tracking (resume ping)
  ---------------------------- */
  const pingResume = useCallback(async () => {
    try {
      if (!isEnrolled) return;
      if (!courseKey || !unitIdNum || !lastLessonId) return;
      await api.post(`/progress/course/${courseKey}/resume`, {
        unit_id: Number(unitIdNum),
        lesson_id: Number(lastLessonId),
        type: "coding",
      });
    } catch { }
  }, [isEnrolled, courseKey, unitIdNum, lastLessonId]);

  useEffect(() => {
    if (!isEnrolled) return;
    if (!courseKey || !unitIdNum || !lastLessonId) return;

    let alive = true;
    let timer = null;

    const safePing = async () => {
      if (!alive) return;
      await pingResume();
    };

    safePing();
    timer = window.setInterval(safePing, 25000);

    const onUnload = () => {
      try {
        api.post(`/progress/course/${courseKey}/resume`, {
          unit_id: Number(unitIdNum),
          lesson_id: Number(lastLessonId),
          type: "coding",
        });
      } catch { }
    };

    window.addEventListener("beforeunload", onUnload);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("beforeunload", onUnload);
      safePing();
    };
  }, [isEnrolled, courseKey, unitIdNum, lastLessonId, pingResume]);

  // ✅ TEMP fallback exercise
  const tempExercise = useMemo(
    () => ({
      title: "HTML Basics Practice",
      title_km: "អនុវត្ត HTML មូលដ្ឋាន",
      prompt: 'Create a heading and a paragraph. Change the text color using CSS and log a message in JS.',
      prompt_km: "បង្កើតចំណងជើង និងអត្ថបទ។ ប្ដូរពណ៌អត្ថបទដោយ CSS ហើយ log សារមួយក្នុង JS។",
      starter_html: `<h1>Hello World</h1>\n<p>Edit me ✨</p>`,
      starter_css: `body { font-family: sans-serif; }\nh1 { color: #2563eb; }`,
      starter_js: `console.log("Coding started 🚀");`,
      requirements: ["Use at least 1 <h1>", "Use at least 1 <p>", "Change color in CSS"],
      requirements_km: ["ប្រើ <h1> យ៉ាងហោចណាស់ 1", "ប្រើ <p> យ៉ាងហោចណាស់ 1", "ប្ដូរពណ៌នៅក្នុង CSS"],
      language: "html",
    }),
    []
  );

  const finalExercise = useMemo(() => {
    if (codingEn || codingKm) return { ...(codingEn || {}), ...(codingKm || {}) };
    return tempExercise;
  }, [codingEn, codingKm, tempExercise]);

  // ========= Starter fallbacks =========
  const starter = useMemo(() => {
    const exLang = normalizePistonLanguage(finalExercise?.language);

    const html = finalExercise?.starter_html ?? "";
    const css = finalExercise?.starter_css ?? "";
    const js = finalExercise?.starter_js ?? "";
    const single = finalExercise?.starter_code ?? finalExercise?.starterCode ?? "";

    if (exLang === "html") {
      if (html || css || js) return { html, css, js };
    }

    if (single) return { html: "", css: "", js: single };
    return { html: "", css: "", js: "" };
  }, [finalExercise]);

  // ========= editor state =========
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");

  // ========= Runner state =========
  const [consoleLines, setConsoleLines] = useState([]);
  const [runId, setRunId] = useState(() => `run_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  const [runNonce, setRunNonce] = useState(0);

  // ✅ NO STORAGE: always hydrate from starter ONLY
  useEffect(() => {
    setHtmlCode(String(starter.html ?? ""));
    setCssCode(String(starter.css ?? ""));
    setJsCode(String(starter.js ?? ""));
    setConsoleLines([]);
  }, [courseKey, unitKey, starter.html, starter.css, starter.js]);

  const onChangeHtml = (val) => setHtmlCode(val || "");
  const onChangeCss = (val) => setCssCode(val || "");
  const onChangeJs = (val) => setJsCode(val || "");

  const clearConsole = () => setConsoleLines([]);

  const appendConsole = useCallback((type, args) => {
    const ts = new Date().toLocaleTimeString();
    setConsoleLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        ts,
        type,
        text: (args || [])
          .map((x) => {
            if (typeof x === "string") return unescapeNewlines(x);
            try {
              return unescapeNewlines(JSON.stringify(x));
            } catch {
              return unescapeNewlines(String(x));
            }
          })
          .join(" "),
      },
    ]);
  }, []);

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
    if (lastLessonId) {
      navigate(`/course/${courseKey}/unit/${unitKey}/lesson/${Number(lastLessonId)}`);
      return;
    }
    navigate(`/courses/${courseKey}`);
  }, [lastLessonId, navigate, courseKey, unitKey]);

  /* ----------------------------
     Guard redirect: coding locked
  ---------------------------- */
  useEffect(() => {
    if (!unit || !units?.length) return;
    if (enrollCheckLoading || progressLoading) return;

    if (!isEnrolled || !hasCoding) {
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

  /* ----------------------------
     Iframe console capture (WEB mode)
  ---------------------------- */
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
  }, [runId, appendConsole]);

  // --- Decide run mode ---
  const rawExerciseLang = finalExercise?.language ?? finalExercise?.programming_language ?? finalExercise?.lang ?? "";
  const rawCourseLang =
    course?.programming_language ??
    course?.language ??
    course?.course_language ??
    course?.code_language ??
    course?.lang ??
    "";

  const effectiveLang = useMemo(() => normalizePistonLanguage(rawExerciseLang || rawCourseLang || "html"), [rawExerciseLang, rawCourseLang]);

  const pistonLang = useMemo(() => {
    const canonical = normalizePistonLanguage(effectiveLang);
    if (canonical === "html") return null;
    return { language: canonical, version: pistonDefaultVersion(canonical) };
  }, [effectiveLang]);

  const runMode = pistonLang ? "piston" : "web";
  const courseLangLabel = labelForLang(pistonLang?.language || effectiveLang || "html");

  const gridStyle = useMemo(() => {
    if (runMode === "web") return { gridTemplateColumns: "420px 1.2fr 1fr" };
    return { gridTemplateColumns: "420px 1.3fr 1fr" };
  }, [runMode]);

  const editorTabs = useMemo(() => (runMode === "piston" ? ["code"] : ["html", "css", "js"]), [runMode]);

  const [editorTab, setEditorTab] = useState("html");
  useEffect(() => {
    if (runMode === "piston") setEditorTab("code");
    else setEditorTab("html");
  }, [runMode]);

  const srcDoc = useMemo(() => {
    const injected = `
<script>
(function(){
  const runId = ${JSON.stringify(runId)};
  function send(payload){
    try{ parent.postMessage(Object.assign({__from:"coding-iframe", runId}, payload), "*"); }catch(e){}
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
  window.addEventListener("error", function(e){ send({ type: "error", message: e.message || "Error" }); });
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

  // --- Piston output state ---
  const [pistonLoading, setPistonLoading] = useState(false);
  const [pistonResult, setPistonResult] = useState(null);

  const pushPistonToConsole = useCallback(
    (res) => {
      const compile = res?.compile || res?.raw?.compile;
      const run = res?.run || res?.raw?.run;

      const compileOut = String(compile?.stdout || "") + String(compile?.stderr || "");
      if (compileOut.trim()) appendConsole("info", ["[compile]\n" + compileOut.trimEnd()]);

      const stdout = String(res?.stdout ?? run?.stdout ?? "");
      const stderr = String(res?.stderr ?? run?.stderr ?? "");

      if (stdout.trim()) appendConsole("log", [stdout.trimEnd()]);
      if (stderr.trim()) appendConsole("error", [stderr.trimEnd()]);
      if (!stdout.trim() && !stderr.trim() && !compileOut.trim()) appendConsole("info", ["(no output)"]);
    },
    [appendConsole]
  );

  const run = useCallback(async () => {
    if (pistonLoading) return;

    // Web mode: refresh iframe (NO console panel on right)
    if (runMode === "web") {
      setConsoleLines([]); // keep internal logs clean (even if hidden)
      const newRunId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      setRunId(newRunId);
      setRunNonce((x) => x + 1);
      return;
    }

    // Piston mode: show terminal output
    setConsoleLines([]);
    if (!pistonLang) return;

    if (!unitIdNum) {
      appendConsole("error", ["unit_id missing"]);
      return;
    }

    setPistonLoading(true);
    setPistonResult(null);

    try {
      const codeToRun = jsCode;

      const { data } = await api.post("/run", {
        unit_id: Number(unitIdNum),
        language: pistonLang.language,
        version: pistonLang.version,
        code: codeToRun,
        stdin: "",
      });

      setPistonResult(data);
      pushPistonToConsole(data);

      if (data?.xp_awarded) window.dispatchEvent(new Event("xp-updated"));
    } catch (e) {
      console.error("Run failed:", e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Run failed";
      appendConsole("error", [msg]);
    } finally {
      setPistonLoading(false);
    }
  }, [pistonLoading, runMode, pistonLang, jsCode, pushPistonToConsole, appendConsole, unitIdNum]);

  const reset = useCallback(() => {
    setHtmlCode(starter.html || "");
    setCssCode(starter.css || "");
    setJsCode(starter.js || "");
    setConsoleLines([]);

    if (runMode === "web") {
      const newRunId = `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      setRunId(newRunId);
      setRunNonce((x) => x + 1);
    }
    if (runMode === "piston") setPistonResult(null);
  }, [starter.html, starter.css, starter.js, runMode]);

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
     Go to quiz
  ---------------------------- */
  const [goingQcm, setGoingQcm] = useState(false);

  const goQCM = useCallback(() => {
    if (goingQcm) return;

    if (!hasQcm) {
      alert(pickText("No quiz for this unit.", "មិនមានសំណួរសម្រាប់ជំពូកនេះទេ។"));
      return;
    }

    if (!lastLessonId) {
      navigate(`/courses/${courseKey}`);
      return;
    }

    setGoingQcm(true);
    navigate(`/course/${courseKey}/unit/${unitKey}/qcm`);

    markCodingCompleteDB().finally(() => {
      setGoingQcm(false);
    });
  }, [goingQcm, hasQcm, pickText, lastLessonId, navigate, courseKey, unitKey, markCodingCompleteDB]);

  // ===== Render guards =====
  if (loading) {
    return (
      <div className="lesson-page">
        <div className="lesson-loader">
          <div className="loader-l">
            {pickText("LOADING CODING", "កំពុងផ្ទុក កូដ")}
          </div>
        </div>
      </div>
    );
  }
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
    finalExercise?.prompt_km ||
    finalExercise?.instructions_km ||
    finalExercise?.instructions ||
    finalExercise?.prompt ||
    "No instructions."
  );

  const reqsUI =
    lang === "km"
      ? Array.isArray(finalExercise?.requirements_km)
        ? finalExercise.requirements_km
        : finalExercise?.requirements
      : finalExercise?.requirements;

  const terminalLabel = pickText("Terminal", "Terminal");

  /* ----------------------------
     Panels
  ---------------------------- */
  const InstructionsPanel = (
    <div className="coding-panel coding-left">
      <div className="coding-tabbar">
        <button className="coding-tabbar-btn active" type="button">
          <span className="coding-tabbar-ico" aria-hidden="true">📄</span>
          <span>{pickText("Instructions", "សេចក្តីណែនាំ")}</span>
        </button>
      </div>

      <div className="coding-panel-body coding-instructions-scroll">
        <h2 className="coding-instructions-title">{exerciseTitleUI}</h2>

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

        {runMode === "piston" && (
          <div className="coding-note">
            {pickText(
              "This exercise runs on the server (Piston). Use the CODE tab to write your code.",
              "លំហាត់នេះរត់នៅលើ server (Piston)។ សូមប្រើ tab CODE ដើម្បីសរសេរ code។"
            )}
          </div>
        )}
      </div>
    </div>
  );

  const EditorPanel = (
    <div className="coding-panel coding-middle">
      <div className="coding-editor-top">
        <div className="coding-editor-top-left">
          <span className="coding-editor-icon" aria-hidden="true">&lt;&gt;</span>
          <span className="coding-editor-titleText">{pickText("Code Editor", "កន្លែងសរសេរកូដ")}</span>
        </div>

        <div className="coding-editor-top-right">
          <span className="coding-lang-pill">{courseLangLabel}</span>

          <button
            className="coding-icon-btn"
            onClick={reset}
            type="button"
            disabled={pistonLoading}
            title={pickText("Reset", "កំណត់ឡើងវិញ")}
            aria-label="Reset"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="coding-editor-tabsRow">
        {editorTabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`coding-tab ${editorTab === t ? "active" : ""}`}
            onClick={() => setEditorTab(t)}
            disabled={runMode === "piston" && t !== "code"}
          >
            {t === "code" ? pickText("CODE", "កូដ") : t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="coding-panel-body coding-editor-body">
        {runMode === "piston" ? (
          <Editor
            height="100%"
            theme="vs-dark"
            language={monacoLangFor(pistonLang?.language)}
            value={jsCode}
            onChange={onChangeJs}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              automaticLayout: true,
            }}
          />
        ) : (
          <>
            {editorTab === "html" && (
              <Editor
                height="100%"
                theme="vs-dark"
                language="html"
                value={htmlCode}
                onChange={onChangeHtml}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            )}

            {editorTab === "css" && (
              <Editor
                height="100%"
                theme="vs-dark"
                language="css"
                value={cssCode}
                onChange={onChangeCss}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            )}

            {editorTab === "js" && (
              <Editor
                height="100%"
                theme="vs-dark"
                language="javascript"
                value={jsCode}
                onChange={onChangeJs}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            )}
          </>
        )}
      </div>

      <div className="coding-runbar">
        <button className="coding-runbar-btn" onClick={run} type="button" disabled={pistonLoading}>
          <span className="coding-runbar-play" aria-hidden="true">▶</span>
          {pistonLoading ? pickText("Running...", "កំពុងរត់...") : pickText("Run Code", "រត់កូដ")}
        </button>
      </div>
    </div>
  );

  // ✅ IMPORTANT: OutputPanel must be a REAL component (not invoked weirdly)
  function OutputPanel({ mobileLayout = false }) {
    return (
      <div className="coding-panel coding-right">
        <div className="coding-terminal-top">
          <div className="coding-terminal-top-left">
            <span className="coding-terminal-icon" aria-hidden="true">&gt;_</span>
            <span className="coding-terminal-title">{pickText("Output", "លទ្ធផល")}</span>
          </div>

          <div className="coding-terminal-top-right">
            <span className="coding-terminal-label">{terminalLabel}</span>

            {/* clear only useful in piston */}
            {runMode === "piston" && (
              <button className="coding-icon-btn" onClick={clearConsole} type="button" title="Clear">
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="coding-panel-body coding-right-body">
          {/* WEB: preview only (no console) */}
          {runMode === "web" && (
            <div className="coding-terminal-window">
              <div className="coding-terminal-windowbar">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>

              <div className="coding-preview coding-preview-big">
                <iframe
                  key={`iframe_${runNonce}`}
                  title="preview"
                  className="coding-iframe"
                  sandbox="allow-scripts"
                  srcDoc={srcDoc}
                />
              </div>
            </div>
          )}

          {/* PISTON: terminal output */}
          {runMode === "piston" && (
            <div className={`coding-console ${mobileLayout ? "" : ""} coding-console-full`}>
              <div className="coding-console-title">
                {pickText("Terminal", "Terminal")}
                {pistonLoading && (
                  <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.75 }}>
                    {pickText("Running...", "កំពុងរត់...")}
                  </span>
                )}
              </div>

              <div className="coding-console-body">
                {consoleLines.length === 0 ? (
                  <div className="coding-console-empty">
                    {pistonLoading
                      ? pickText("Running...", "កំពុងរត់...")
                      : pickText("No output yet. Click Run.", "មិនទាន់មាន output ទេ។ ចុច Run.")}
                  </div>
                ) : (
                  consoleLines.map((l) => (
                    <div key={l.id} className={`coding-console-line ${l.type}`}>
                      <span className="coding-console-ts">{l.ts}</span>
                      <span className="coding-console-msg">{l.text}</span>
                    </div>
                  ))
                )}
              </div>

              {pistonResult && (
                <div className="coding-console-exit">
                  {pickText("Exit code:", "លេខកូដចាកចេញ:")}{" "}
                  {String(pistonResult?.code ?? pistonResult?.raw?.run?.code ?? "")}
                </div>
              )}
            </div>
          )}

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
    );
  }

  return (
    <div className="lesson-page coding-page coding-lock">
      <div className="lesson-header coding-header-blank" />

      <div className="lesson-content-wrapper coding-wrapper">
        <div className="lesson-content coding-content">
          <div className="coding-fullbleed">
            <div className="coding-shell">
              {isMobile ? (
                <div className={`coding-mobile ${mobileTab === "coding" ? "is-coding" : "is-instructions"}`}>
                  <div className="coding-mobile-topTabs">
                    <button
                      type="button"
                      className={`coding-mobile-tab ${mobileTab === "instructions" ? "active" : ""}`}
                      onClick={() => setMobileTab("instructions")}
                    >
                      📄 {pickText("Instructions", "សេចក្តីណែនាំ")}
                    </button>

                    <button
                      type="button"
                      className={`coding-mobile-tab ${mobileTab === "coding" ? "active" : ""}`}
                      onClick={() => setMobileTab("coding")}
                    >
                      &lt;&gt; {pickText("Coding", "Coding")}
                    </button>
                  </div>

                  <div className="coding-mobile-body">
                    {mobileTab === "instructions" ? (
                      <div className="coding-mobile-instructions">{InstructionsPanel}</div>
                    ) : (
                      <div className="coding-mobile-split">
                        <div className="coding-mobile-editor">{EditorPanel}</div>
                        <div className="coding-mobile-output">
                          <OutputPanel mobileLayout />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="coding-3col" style={gridStyle}>
                  {InstructionsPanel}
                  {EditorPanel}
                  <OutputPanel />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar (DO NOT CHANGE) */}
      <div className="lesson-footer-bar">
        <div className="lf-left">
          <button className="lf-btn" onClick={() => navigate(`/courses/${courseKey}`)} type="button">
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
