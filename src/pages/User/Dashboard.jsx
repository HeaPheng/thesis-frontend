import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Container, Row, Col, Card, Button, ProgressBar, Alert } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import "./Dashboard.css";
import api from "../../lib/api";
import html2canvas from "html2canvas";
import CertificateSheet from "../../components/CertificateSheet";

/* ===================== CONFIG ===================== */
const CACHE_KEY = "dashboard_cache_v1";
const CACHE_TTL_MS = 10 * 60 * 1000;
const DASHBOARD_SHOW_COUNT = 2;
const MIN_REFRESH_GAP_MS = 1500;

const CAREERS_CACHE_KEY = "dashboard_careers_cache_v1";
const CAREERS_CACHE_TTL_MS = 10 * 60 * 1000;

/* ===================== CACHE ===================== */
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = parsed?.updatedAt ? new Date(parsed.updatedAt).getTime() : 0;
    if (!ts) return null;
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
  } catch {}
}

function readCareersCache() {
  try {
    const raw = localStorage.getItem(CAREERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = parsed?.updatedAt ? new Date(parsed.updatedAt).getTime() : 0;
    if (!ts) return null;
    if (Date.now() - ts > CAREERS_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCareersCache(items) {
  try {
    localStorage.setItem(
      CAREERS_CACHE_KEY,
      JSON.stringify({
        items: Array.isArray(items) ? items : [],
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {}
}

/* ===================== HELPERS ===================== */
const clampPct = (n) => {
  const v = Number(n || 0);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
};

const clampCount = (done, total) => {
  const d = Number(done || 0);
  const t = Number(total || 0);
  if (t <= 0) return Math.max(0, d);
  return Math.max(0, Math.min(d, t));
};

const calcCoursePctCombined = ({ completedUnits, totalUnits, completedLessons, totalLessons }) => {
  const tu = Number(totalUnits || 0);
  const tl = Number(totalLessons || 0);

  const cu = clampCount(completedUnits, tu);
  const cl = clampCount(completedLessons, tl);

  const totalItems = tu + tl;
  const doneItems = cu + cl;

  if (totalItems <= 0) return 0;
  return clampPct(Math.round((doneItems / totalItems) * 100));
};

function badgeLabelFromPct(pct, ui) {
  const p = clampPct(pct);
  if (p >= 100) return ui.badgeCompleted;
  if (p >= 70) return ui.badgeAlmost;
  if (p >= 35) return ui.badgeInProgress;
  return ui.badgeGettingStarted;
}

function badgeIconFromPct(pct) {
  const p = clampPct(pct);
  if (p >= 100) return "bi-patch-check-fill";
  if (p >= 70) return "bi-rocket-takeoff";
  if (p >= 35) return "bi-lightning-charge-fill";
  return "bi-play-circle-fill";
}

/* ===================== SKELETONS ===================== */
function SkeletonLine({ w = "60%", h = 12, className = "" }) {
  return <div className={`dash-skeleton ${className}`} style={{ width: w, height: h }} />;
}

function SkeletonCourseCard() {
  return (
    <Card className="dash-course-card">
      <div className="dash-course-cover">
        <div className="dash-skeleton" style={{ width: "100%", height: "100%" }} />
        <div className="dash-course-overlay" />
      </div>

      <div className="dash-course-body">
        <SkeletonLine w="80%" h={14} />
        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SkeletonLine w="120px" h={26} />
          <SkeletonLine w="110px" h={26} />
          <SkeletonLine w="90px" h={26} />
        </div>

        <div style={{ marginTop: 14 }}>
          <SkeletonLine w="100%" h={10} />
          <div style={{ marginTop: 8 }}>
            <SkeletonLine w="100%" h={12} />
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <SkeletonLine w="60%" h={40} />
          <SkeletonLine w="40%" h={40} />
        </div>
      </div>
    </Card>
  );
}

function SkeletonCareerCard() {
  return (
    <Card className="dash-career-card premium">
      <div className="career-cover">
        <div className="dash-skeleton" style={{ width: "100%", height: 150 }} />
      </div>
      <div className="career-body" style={{ padding: 14 }}>
        <SkeletonLine w="70%" h={14} />
        <div className="mt-2">
          <SkeletonLine w="55%" h={10} />
        </div>
        <div className="mt-3">
          <SkeletonLine w="100%" h={10} />
          <div className="mt-2">
            <SkeletonLine w="100%" h={12} />
          </div>
        </div>
        <div className="mt-3 d-flex gap-2">
          <SkeletonLine w="60%" h={40} />
          <SkeletonLine w="40%" h={40} />
        </div>
      </div>
    </Card>
  );
}

/* ===================== ANIMATION HOOK ===================== */
function useAnimatedNumber(targetValue, duration = 450) {
  const [val, setVal] = useState(() => Number(targetValue || 0));
  const lastTargetRef = useRef(Number(targetValue || 0));

  useEffect(() => {
    const target = Number(targetValue || 0);
    const start = Number(lastTargetRef.current || 0);

    if (start === target) {
      setVal(target);
      return;
    }

    lastTargetRef.current = target;

    const startTs = performance.now();
    let raf = 0;

    const tick = (t) => {
      const p = Math.min(1, (t - startTs) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targetValue, duration]);

  return val;
}

/* ===================== COURSE CARD ===================== */
function DashCourseCard({ c, downloading, onContinue, onDetails, onDownloadCert, ui, pickText }) {
  const pct = clampPct(c.progressPct);
  const badgeLabel = badgeLabelFromPct(pct, ui);
  const badgeIcon = badgeIconFromPct(pct);
  const animatedCardPct = useAnimatedNumber(pct, 450);

  const displayTitle = pickText(c.title, c.title_km) || ui.untitled;

  return (
    <Card className="dash-course-card">
      <div className="dash-course-cover">
        {c.thumbnail ? (
          <img src={c.thumbnail} alt={displayTitle} className="dash-course-img" />
        ) : (
          <div className="dash-course-img dash-course-img-fallback">
            <i className="bi bi-journal-code" />
          </div>
        )}

        <div className="dash-course-overlay" />

        <div className="dash-course-badge">
          <i className={`bi ${badgeIcon}`} />
          <span>{badgeLabel}</span>
        </div>

        <div className="dash-course-pct">{Math.round(animatedCardPct)}%</div>
      </div>

      <div className="dash-course-body">
        <div className="dash-course-title" title={displayTitle}>
          {displayTitle}
        </div>

        <div className="dash-course-meta">
          <span className="dash-pill">
            <i className="bi bi-journals" /> {c.completedLessons}/{c.totalLessons} {ui.lessons}
          </span>
          <span className="dash-pill">
            <i className="bi bi-layers" /> {c.completedUnits}/{c.totalUnits} {ui.units}
          </span>

          {c.isCompletedCourse && (
            <span className="dash-pill dash-pill-success">
              <i className="bi bi-award-fill" /> {ui.certificate}
            </span>
          )}
        </div>

        <div className="dash-course-progress">
          <div className="dash-course-progress-row">
            <span className="dash-muted" style={{ fontSize: 12 }}>
              {ui.progress}
            </span>
            <span className="dash-course-progress-value">{Math.round(animatedCardPct)}%</span>
          </div>
          <ProgressBar className="dash-progress-anim" now={Math.round(animatedCardPct)} />
        </div>

        <div className="dash-course-actions">
          <Button variant="primary" className="dash-course-cta" onClick={() => onContinue(c)}>
            <i className="bi bi-play-fill" /> {ui.continue}
          </Button>

          <Button variant="outline-light" className="dash-course-secondary" onClick={() => onDetails(c)}>
            {ui.details}
          </Button>
        </div>

        {c.isCompletedCourse && (
          <div className="mt-2 d-grid">
            <Button
              variant="outline-success"
              className="dash-cert-btn"
              disabled={!!downloading[c.courseKey]}
              onClick={() => onDownloadCert(c)}
            >
              {downloading[c.courseKey] ? (
                ui.downloading
              ) : (
                <>
                  <i className="bi bi-download" /> {ui.downloadCertificate}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ===================== CAREER CARD ===================== */
function DashCareerCard({ c, onContinue, onView, ui, pickText }) {
  const pct = clampPct(c?.progress_pct || 0);
  const animatedPct = useAnimatedNumber(pct, 500);

  const title = pickText(c?.title, c?.title_km) || ui.careerPath;
  const sub = ui.careerSub(Number(c?.completed_courses || 0), Number(c?.courses_count || 0));

  const canContinue = typeof onContinue === "function";

  return (
    <Card className="dash-career-card premium" role="button" onClick={() => onView?.(c)}>
      <div className="career-cover">
        {c?.image_url ? (
          <img
            src={c.image_url}
            alt={title}
            className="career-cover-img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="career-cover-fallback">
            <i className="bi bi-signpost-split" />
          </div>
        )}

        <div className="career-cover-overlay" />
        <div className="career-cover-pct">{Math.round(animatedPct)}%</div>
      </div>

      <div className="career-body" onClick={(e) => e.stopPropagation()}>
        <div className="career-title">{title}</div>
        <div className="career-sub">{sub}</div>

        <div className="career-progress">
          <div className="career-progress-row">
            <span className="career-muted">{ui.progress}</span>
            <span className="career-pct-text" style={{ fontWeight: 800, letterSpacing: 0.3 }}>
              {Math.round(animatedPct)}%
            </span>
          </div>
          <ProgressBar now={animatedPct} />
        </div>

        <div className="career-actions">
          <Button
            className="career-cta"
            disabled={!canContinue}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContinue?.(c);
            }}
          >
            <span>{pct >= 100 ? ui.continueNextPath : ui.continuePath}</span>
            <i className="bi bi-arrow-right" />
          </Button>

          <Button
            variant="outline-light"
            className="career-secondary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onView?.(c);
            }}
          >
            {ui.view}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ===================== DASHBOARD ===================== */
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ language reactive (en / km)
  const [lang, setLang] = useState(() => localStorage.getItem("app_lang") || "en");


  useEffect(() => {
    const onLang = (e) => {
      const next = e?.detail?.lang;
      if (next === "en" || next === "km") setLang(next);
      else setLang(localStorage.getItem("app_lang") || "en");
    };
    window.addEventListener("app-lang-changed", onLang);
    return () => window.removeEventListener("app-lang-changed", onLang);
  }, []);

  const pickText = useCallback(
    (en, km) => (lang === "km" ? km || en || "" : en || km || ""),
    [lang]
  );

  const ui = useMemo(() => {
    if (lang === "km") {
      return {
        // badges
        badgeCompleted: "បានបញ្ចប់",
        badgeAlmost: "ជិតរួច",
        badgeInProgress: "កំពុងរៀន",
        badgeGettingStarted: "ចាប់ផ្តើម",

        // common
        progress: "វឌ្ឍនភាព",
        continue: "បន្ត",
        details: "ព័ត៌មានលម្អិត",
        view: "មើលលំអិត",
        lessons: "មេរៀន",
        units: "ជំពូក",
        certificate: "វិញ្ញាបនបត្រ",
        downloading: "កំពុងទាញយក…",
        downloadCertificate: "ទាញយកវិញ្ញាបនបត្រ",
        untitled: "មិនមានចំណងជើង",

        // hero
        studentSpace: "ផ្ទាំងគ្រប់គ្រង",
        welcomeBack: (name) => `សូមស្វាគមន៍មកវិញ, ${name} 👋`,
        updated: (s) => `ធ្វើបច្ចុប្បន្នភាព ${s}`,


        // mini cards
        xp: "ពិន្ទុ XP",
        xpSub: "ទទួល XP ដោយបញ្ចប់ជំពូក",
        streak: "ថ្ងៃជាប់គ្នា",
        streakSub: "បន្តរៀនរាល់ថ្ងៃ",

        // tabs/panels
        showsOnly: `បង្ហាញតែ ${DASHBOARD_SHOW_COUNT} វគ្គចុងក្រោយ។`,
        overallProgress: "វឌ្ឍនភាពសរុប",
        enrolledCourses: "វគ្គបានចុះឈ្មោះ",
        completedUnits: "ជំពូកបានបញ្ចប់",
        certificates: "វិញ្ញាបនបត្រ",

        continueLearning: "បន្តរៀន",
        careerProgress: "វឌ្ឍនភាពជំនាញ",

        lastTwoHint: "ទាំងនេះជាវគ្គចុងក្រោយ 2 ដែលបានរៀបតាម Backend។",
        careerHint: "បង្ហាញជំនាញដែលអ្នកបានចូលរួមយ៉ាងហោចណាស់ 1 វគ្គ។",

        viewAllEnrolled: "មើលវគ្គសិក្សាបានចុះឈ្មោះទាំងអស់",
        browseCourses: "មើលវគ្គសិក្សា",
        browseCareers: "មើល​ជំនាញទាំងអស់",

        // empty
        noEnrolledTitle: "មិនទាន់មានវគ្គបានចុះឈ្មោះទេ",
        noEnrolledSub: "ចុះឈ្មោះវគ្គមួយ ហើយវានឹងបង្ហាញនៅទីនេះ។",
        exploreCourses: "ស្វែងរកវគ្គសិក្សា",

        noCareerTitle: "មិនទាន់មានវឌ្ឍនភាពជំនាញទេ",
        noCareerSub: "ចុះឈ្មោះវគ្គនៅក្នុងជំនាញ ដើម្បីឃើញវានៅទីនេះ។",
        exploreCareers: "ស្វែងរកជំនាញទ",

        // profile
        profile: "ប្រវត្តិប្រូហ្វាល់",
        manageAccount: "គ្រប់គ្រងគណនីរបស់អ្នក",
        signedInAs: "បានចូលជាអ្នកប្រើ",
        editProfile: "កែប្រែប្រវត្តិ",
        settings: "ការកំណត់",
        account: "គណនី",

        // errors
        failedAccount: "បរាជ័យក្នុងការផ្ទុកគណនី។",
        certNotReady: "វិញ្ញាបនបត្រមិនទាន់រួចទេ។",
        certPreviewNotReady: "មើលមុនវិញ្ញាបនបត្រមិនទាន់រួច។",
        certDownloadFail: "មិនអាចទាញយកវិញ្ញាបនបត្រ។ ពិនិត្យ API /certificates/course/:slug",
        dashLoadFail: "បរាជ័យក្នុងការផ្ទុកទិន្នន័យ Dashboard។",
        careerLoadFail: "បរាជ័យក្នុងការផ្ទុកវឌ្ឍនភាពជំនាញ។",

        // careers  
        careerPath: "ជំនាញ",
        careerSub: (done, total) => `${done} / ${total} វគ្គសិក្សាបានបញ្ចប់`,
        continuePath: "បន្តជំនាញ",
        continueNextPath: "បន្តជំនាញបន្ទាប់",
      };
    }

    return {
      badgeCompleted: "Completed",
      badgeAlmost: "Almost",
      badgeInProgress: "In Progress",
      badgeGettingStarted: "Getting Started",

      progress: "Progress",
      continue: "Continue",
      details: "Details",
      view: "View",
      lessons: "lessons",
      units: "units",
      certificate: "Certificate",
      downloading: "Downloading…",
      downloadCertificate: "Download Certificate",
      untitled: "Untitled",

      studentSpace: "Student Space",
      welcomeBack: (name) => `Welcome back, ${name} 👋`,
      updated: (s) => `Updated ${s}`,

      xp: "XP",
      xpSub: "Earn XP by finishing units",
      streak: "Streak",
      streakSub: "Keep learning daily",

      showsOnly: `Shows only your last ${DASHBOARD_SHOW_COUNT} courses.`,
      overallProgress: "Overall Progress",
      enrolledCourses: "Enrolled Courses",
      completedUnits: "Completed Units",
      certificates: "Certificates",

      continueLearning: "Continue Learning",
      careerProgress: "Career Progress",

      lastTwoHint: "These are the last 2 recently learned courses (backend sorted).",
      careerHint: "Shows career paths where you enrolled in at least one course.",

      viewAllEnrolled: "View all enrolled",
      browseCourses: "Browse Courses",
      browseCareers: "Browse Careers",

      noEnrolledTitle: "No enrolled courses yet",
      noEnrolledSub: "Enroll in a course and it will appear here.",
      exploreCourses: "Explore Courses",

      noCareerTitle: "No career progress yet",
      noCareerSub: "Enroll in a course inside a career path to see it here.",
      exploreCareers: "Explore Careers",

      profile: "Profile",
      manageAccount: "Manage your account settings",
      signedInAs: "Signed in as",
      editProfile: "Edit Profile",
      settings: "Settings",
      account: "Account",

      failedAccount: "Failed to load account.",
      certNotReady: "Certificate not ready yet.",
      certPreviewNotReady: "Certificate preview not ready.",
      certDownloadFail: "Could not download certificate. Check /certificates/course/:slug API.",
      dashLoadFail: "Failed to load dashboard data.",
      careerLoadFail: "Failed to load career progress.",

      careerPath: "Career Path",
      careerSub: (done, total) => `${done} / ${total} courses completed`,
      continuePath: "Continue Path",
      continueNextPath: "Continue Next Path",
    };
  }, [lang]);

  const [active, setActive] = useState("learning");
  const [learningTab, setLearningTab] = useState("courses");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingDash, setLoadingDash] = useState(true);

  const [err, setErr] = useState(null);
  const [statsErr, setStatsErr] = useState(null);

  const [continueCourses, setContinueCourses] = useState([]);
  const [stats, setStats] = useState({
    enrolled: 0,
    completedUnits: 0,
    certificates: 0,
    progress: 0,
    streak: 0,
    xp: 0,
  });

  const [careers, setCareers] = useState([]);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [careersErr, setCareersErr] = useState(null);
  const careersLoadedOnceRef = useRef(false);

  const [downloading, setDownloading] = useState({});
  const isMountedRef = useRef(true);
  const lastRefreshRef = useRef(0);
  const [cacheStamp, setCacheStamp] = useState(() => readCache()?.updatedAt || "");

  const [certPreview, setCertPreview] = useState(null);
  const certRef = useRef(null);

  /* ===== keep dashboard in sync with ProgressSync cache writes ===== */
  useEffect(() => {
    const applyCache = () => {
      const cached = readCache();
      if (cached?.continueCourses && cached?.stats) {
        setContinueCourses(cached.continueCourses);
        setStats(cached.stats);
        setCacheStamp(cached.updatedAt || "");
      }
    };

    const onStorage = (e) => {
      if (e.key === CACHE_KEY) applyCache();
    };

    window.addEventListener("dashboard-cache-updated", applyCache);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("dashboard-cache-updated", applyCache);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /* ===== load user ===== */
  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      setLoadingUser(true);
      setErr(null);
      try {
        const { data } = await api.get("/auth/me");
        if (!isMountedRef.current) return;

        setName(data?.user?.name || data?.name || "Student");
        setEmail(data?.user?.email || data?.email || "student@example.com");
      } catch (e) {
        const status = e?.response?.status;
        if (!isMountedRef.current) return;

        if (status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setErr(e?.response?.data?.message || ui.failedAccount);
      } finally {
        if (isMountedRef.current) setLoadingUser(false);
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, [navigate, ui.failedAccount]);

  /* ===== download certificate ===== */
  const onDownloadCert = useCallback(
    async (courseObj) => {
      const courseKey = String(courseObj?.courseKey || "");
      if (!courseKey) return;

      setDownloading((p) => ({ ...p, [courseKey]: true }));
      setStatsErr(null);

      try {
        const { data } = await api.get(`/certificates/course/${courseKey}`);
        if (!data?.completed) {
          setStatsErr(ui.certNotReady);
          return;
        }

        const courseTitle = data?.course_title || courseObj?.title || ui.untitled;
        const timeSpentMinutes = Number(data?.time_spent_minutes || 0);

        setCertPreview({
          userName: name || "Student",
          courseTitle,
          timeSpentMinutes,
        });

        await new Promise((r) => setTimeout(r, 60));

        if (!certRef.current) {
          setStatsErr(ui.certPreviewNotReady);
          return;
        }

        const canvas = await html2canvas(certRef.current, {
          scale: 2.5,
          backgroundColor: "#ffffff",
          useCORS: true,
        });

        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `Certificate - ${courseTitle}.png`;
        link.click();
      } catch (e) {
        console.error(e);
        setStatsErr(ui.certDownloadFail);
      } finally {
        setDownloading((p) => ({ ...p, [courseKey]: false }));
        setCertPreview(null);
      }
    },
    [name, ui]
  );

  /* ===== dashboard loader ===== */
  const loadDashboard = useCallback(
    async ({ force = false, silent = false } = {}) => {
      const now = Date.now();
      if (!force && now - lastRefreshRef.current < MIN_REFRESH_GAP_MS) return;
      lastRefreshRef.current = now;

      setStatsErr(null);

      const cached = !force ? readCache() : null;
      if (cached?.continueCourses && cached?.stats) {
        setContinueCourses(cached.continueCourses);
        setStats(cached.stats);
        setCacheStamp(cached.updatedAt || "");
        if (silent) setLoadingDash(false);
      }

      const hasUi = (cached?.continueCourses?.length || continueCourses.length) > 0;
      if (!silent && !hasUi) setLoadingDash(true);
      if (silent && hasUi) setLoadingDash(false);

      try {
        const recentRes = await api.get(`/my/courses?limit=${DASHBOARD_SHOW_COUNT}`);
        const recentList = Array.isArray(recentRes.data) ? recentRes.data : recentRes.data?.data || [];

        const mappedRecent = recentList
          .map((c) => {
            const courseKey = String(c?.slug || c?.id);

            const totalUnits = Number(c?.units_count || 0);
            const totalLessons = Number(c?.lessons_count || 0);

            const completedLessons = clampCount(Number(c?.completed_lessons_count || 0), totalLessons);
            const completedUnits = clampCount(Number(c?.completed_units_count || 0), totalUnits);

            const progressPct = calcCoursePctCombined({
              completedUnits,
              totalUnits,
              completedLessons,
              totalLessons,
            });

            const isCompletedCourse = totalUnits > 0 && completedUnits >= totalUnits;

            return {
              courseKey,
              title: c?.title || ui.untitled,
              title_km: c?.title_km || null, // ✅ if API provides
              thumbnail: c?.thumbnail_url || "",
              completedLessons,
              totalLessons,
              completedUnits,
              totalUnits,
              progressPct,
              isCompletedCourse,
              lastUnitId: c?.last_unit_id ? Number(c.last_unit_id) : null,
              lastLessonId: c?.last_lesson_id ? Number(c.last_lesson_id) : null,
            };
          })
          .filter((x) => !!x?.courseKey);

        const allRes = await api.get("/my/courses");
        const allList = Array.isArray(allRes.data) ? allRes.data : allRes.data?.data || [];

        const allMapped = allList.map((c) => {
          const totalUnits = Number(c?.units_count || 0);
          const totalLessons = Number(c?.lessons_count || 0);

          const completedLessons = clampCount(Number(c?.completed_lessons_count || 0), totalLessons);
          const completedUnits = clampCount(Number(c?.completed_units_count || 0), totalUnits);

          const progressPct = calcCoursePctCombined({
            completedUnits,
            totalUnits,
            completedLessons,
            totalLessons,
          });

          const isCompletedCourse = totalUnits > 0 && completedUnits >= totalUnits;

          return { totalUnits, totalLessons, completedUnits, completedLessons, progressPct, isCompletedCourse };
        });

        const enrolled = allMapped.length;
        const completedUnitsSum = allMapped.reduce((s, x) => s + (x.completedUnits || 0), 0);
        const certificates = allMapped.filter((x) => x.isCompletedCourse).length;

        const progress = enrolled
          ? Math.round(allMapped.reduce((s, x) => s + (x.progressPct || 0), 0) / enrolled)
          : 0;

        const nextStats = {
          enrolled,
          completedUnits: completedUnitsSum,
          certificates,
          progress,
          xp: 0,
          streak: 0,
        };

        if (!isMountedRef.current) return;

        setContinueCourses(mappedRecent);
        setStats(nextStats);

        writeCache({ continueCourses: mappedRecent, stats: nextStats });
        const fresh = readCache();
        setCacheStamp(fresh?.updatedAt || "");
      } catch (e) {
        if (!isMountedRef.current) return;
        setStatsErr(ui.dashLoadFail);
      } finally {
        if (isMountedRef.current) setLoadingDash(false);
      }
    },
    [continueCourses.length, ui]
  );

  /* ===== load careers ===== */
  const loadMyCareers = useCallback(
    async ({ force = false } = {}) => {
      setCareersErr(null);

      const cached = !force ? readCareersCache() : null;
      if (cached?.items?.length) setCareers(cached.items);

      setLoadingCareers(true);
      try {
        const { data } = await api.get("/my/careers");
        const list = Array.isArray(data) ? data : [];
        setCareers(list);
        writeCareersCache(list);
      } catch (e) {
        console.error("Failed to load /my/careers", e);
        setCareers((prev) => prev || []);
        setCareersErr(ui.careerLoadFail);
      } finally {
        setLoadingCareers(false);
      }
    },
    [ui.careerLoadFail]
  );

  /* ===== Initial ===== */
  useEffect(() => {
    const cached = readCache();
    if (cached?.continueCourses && cached?.stats) {
      setContinueCourses(cached.continueCourses);
      setStats(cached.stats);
      setCacheStamp(cached.updatedAt || "");
      setLoadingDash(false);
      loadDashboard({ force: true, silent: true });
    } else {
      loadDashboard({ force: true, silent: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Refresh on dirty ===== */
  useEffect(() => {
    if (location.pathname !== "/dashboard") return;

    const dirty = localStorage.getItem("progress_dirty") === "1";
    if (dirty) {
      localStorage.removeItem("progress_dirty");
      loadDashboard({ force: true, silent: true });
      loadMyCareers({ force: true });
    }
  }, [location.pathname, loadDashboard, loadMyCareers]);

  useEffect(() => {
    const refreshIfDirty = () => {
      const dirty = localStorage.getItem("progress_dirty") === "1";
      if (!dirty) return;
      localStorage.removeItem("progress_dirty");
      loadDashboard({ force: true, silent: true });
      loadMyCareers({ force: true });
    };

    const onFocus = () => refreshIfDirty();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshIfDirty();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadDashboard, loadMyCareers]);

  useEffect(() => {
    if (careersLoadedOnceRef.current) return;
    careersLoadedOnceRef.current = true;
    loadMyCareers({ force: false });
  }, [loadMyCareers]);

  const animatedOverall = useAnimatedNumber(clampPct(stats.progress), 500);

  const updatedText = useMemo(() => {
    if (!cacheStamp) return "";
    const ts = new Date(cacheStamp);
    if (Number.isNaN(ts.getTime())) return "";
    return ui.updated(ts.toLocaleString());
  }, [cacheStamp, ui]);

  const handleContinue = useCallback(
    async (c) => {
      if (!c?.courseKey) return;

      if (c?.lastUnitId && c?.lastLessonId) {
        navigate(`/course/${c.courseKey}/unit/${c.lastUnitId}/lesson/${c.lastLessonId}`);
        return;
      }

      try {
        const cr = await api.get(`/courses/${c.courseKey}`);
        const course = cr?.data || {};
        const units = Array.isArray(course?.units) ? course.units : [];

        const firstUnit = units[0];
        const lessons = Array.isArray(firstUnit?.lessons) ? firstUnit.lessons : [];
        const firstLesson = lessons[0];

        if (firstUnit?.id && firstLesson?.id) {
          navigate(`/course/${c.courseKey}/unit/${firstUnit.id}/lesson/${firstLesson.id}`);
          return;
        }

        navigate(`/courses/${c.courseKey}`);
      } catch {
        navigate(`/courses/${c.courseKey}`);
      }
    },
    [navigate]
  );

  const handleCareerContinue = useCallback(
    (career) => {
      if (career?.slug) navigate(`/careers/${career.slug}`);
      else navigate("/careers");
    },
    [navigate]
  );

  const showSkeleton = loadingDash && continueCourses.length === 0;

  return (
    <div className="dash-page">
      <Container className="dash-container">
        {err && <Alert variant="danger">{err}</Alert>}
        {statsErr && <Alert variant="warning">{statsErr}</Alert>}
        {careersErr && learningTab === "career" && <Alert variant="warning">{careersErr}</Alert>}

        {/* Hidden certificate render for download */}
        <div style={{ position: "fixed", left: "-99999px", top: 0, background: "#fff" }}>
          <div ref={certRef}>
            {certPreview && (
              <CertificateSheet
                userName={certPreview.userName}
                courseTitle={certPreview.courseTitle}
                timeSpentMinutes={certPreview.timeSpentMinutes}
              />
            )}
          </div>
        </div>

        <div className="dash-hero">
          <div className="dash-hero-left">
            <div className="dash-badge">
              <i className="bi bi-stars" /> {ui.studentSpace}
            </div>

            <h2 className="dash-title">{ui.welcomeBack(loadingUser ? "…" : name)}</h2>
            <div className="dash-sub">{ui.continueLast}</div>

            {loadingUser || showSkeleton ? (
              <div className="mt-3">
                <SkeletonLine w="48%" h={10} />
                <div className="mt-2">
                  <SkeletonLine w="34%" h={10} />
                </div>
              </div>
            ) : (
              updatedText && (
                <div className="dash-muted mt-2" style={{ fontSize: 12 }}>
                  {updatedText}
                </div>
              )
            )}
          </div>

          <div className="dash-hero-right">
            <div className="dash-mini-card">
              <div className="dash-mini-top">
                <span className="dash-mini-label">{ui.xp}</span>
                <span className="dash-mini-value">{stats.xp}</span>
              </div>
              <div className="dash-mini-bottom">{ui.xpSub}</div>
            </div>

            <div className="dash-mini-card">
              <div className="dash-mini-top">
                <span className="dash-mini-label">{ui.streak}</span>
                <span className="dash-mini-value">{stats.streak}🔥</span>
              </div>
              <div className="dash-mini-bottom">{ui.streakSub}</div>
            </div>
          </div>
        </div>

        <Row className="g-4">
          <Col lg={3}>
            <Card className="dash-card dash-menu">
              <button
                className={`dash-menu-item ${active === "learning" ? "active" : ""}`}
                onClick={() => setActive("learning")}
              >
                <i className="bi bi-journal-bookmark"></i>
                <span>{(lang === "km" ? "ការរៀនរបស់ខ្ញុំ" : "My Learning")}</span>
              </button>

              <button
                className={`dash-menu-item ${active === "profile" ? "active" : ""}`}
                onClick={() => setActive("profile")}
              >
                <i className="bi bi-person-circle"></i>
                <span>{ui.profile}</span>
              </button>

              <div className="dash-menu-divider" />

            </Card>
          </Col>

          <Col lg={9}>
            {active === "learning" ? (
              <Card className="dash-card dash-panel">
                <div className="dash-panel-head">
                  <div>
                    <h4 className="dash-panel-title">{(lang === "km" ? "ការរៀនរបស់ខ្ញុំ" : "My Learning")}</h4>
                    <div className="dash-muted">{ui.showsOnly}</div>
                  </div>

                  <div className="dash-tab-switch">
                    <button
                      className={`dash-tab-btn ${learningTab === "courses" ? "active" : ""}`}
                      onClick={() => setLearningTab("courses")}
                    >
                      {(lang === "km" ? "វគ្គសិក្សា" : "Courses")}
                    </button>
                    <button
                      className={`dash-tab-btn ${learningTab === "career" ? "active" : ""}`}
                      onClick={() => setLearningTab("career")}
                    >
                      {lang === "km" ? "ជំនាញ" : "Career"}
                    </button>
                  </div>
                </div>

                <div className="dash-progress-box">
                  <div className="dash-progress-row">
                    <div className="dash-progress-label">{ui.overallProgress}</div>
                    <div className="dash-progress-value">
                      {showSkeleton ? "…" : `${Math.round(animatedOverall)}%`}
                    </div>
                  </div>
                  <ProgressBar className="dash-progress-anim" now={Math.round(animatedOverall)} />
                </div>

                <Row className="g-3 mt-1">
                  <Col md={4}>
                    <div className="dash-stat">
                      <div className="dash-stat-icon">
                        <i className="bi bi-collection-play" />
                      </div>
                      <div>
                        <div className="dash-stat-value">
                          {showSkeleton ? <span className="dash-skel-text" /> : stats.enrolled}
                        </div>
                        <div className="dash-stat-label">{ui.enrolledCourses}</div>
                      </div>
                    </div>
                  </Col>

                  <Col md={4}>
                    <div className="dash-stat">
                      <div className="dash-stat-icon">
                        <i className="bi bi-check2-circle" />
                      </div>
                      <div>
                        <div className="dash-stat-value">
                          {showSkeleton ? <span className="dash-skel-text" /> : stats.completedUnits}
                        </div>
                        <div className="dash-stat-label">{ui.completedUnits}</div>
                      </div>
                    </div>
                  </Col>

                  <Col md={4}>
                    <div className="dash-stat">
                      <div className="dash-stat-icon">
                        <i className="bi bi-award" />
                      </div>
                      <div>
                        <div className="dash-stat-value">
                          {showSkeleton ? <span className="dash-skel-text" /> : stats.certificates}
                        </div>
                        <div className="dash-stat-label">{ui.certificates}</div>
                      </div>
                    </div>
                  </Col>
                </Row>

                <div className="mt-4">
                  <div className="dash-section-head">
                    <div>
                      <h5 className="dash-section-title">
                        {learningTab === "courses" ? ui.continueLearning : ui.careerProgress}
                      </h5>
                      <div className="dash-muted" style={{ fontSize: 12 }}>
                        {learningTab === "courses" ? ui.lastTwoHint : ui.careerHint}
                      </div>
                    </div>

                    <div className="d-flex gap-2 flex-wrap">
                      {learningTab === "courses" ? (
                        <>
                          <Button variant="btn btn-outline-success" onClick={() => navigate("/my-learning")}>
                            {ui.viewAllEnrolled}
                          </Button>
                          <Button variant="btn btn-outline-warning" onClick={() => navigate("/courses")}>
                            {ui.browseCourses}
                          </Button>
                        </>
                      ) : (
                        <Button variant="btn btn-outline-primary" onClick={() => navigate("/careers")}>
                          {ui.browseCareers}
                        </Button>
                      )}
                    </div>
                  </div>

                  {learningTab === "courses" ? (
                    showSkeleton ? (
                      <Row className="g-3">
                        <Col md={6}><SkeletonCourseCard /></Col>
                        <Col md={6}><SkeletonCourseCard /></Col>
                      </Row>
                    ) : !continueCourses.length ? (
                      <div className="dash-empty mt-3">
                        <div className="dash-empty-icon">
                          <i className="bi bi-rocket-takeoff"></i>
                        </div>
                        <div className="dash-empty-title">{ui.noEnrolledTitle}</div>
                        <div className="dash-empty-sub">{ui.noEnrolledSub}</div>
                        <Button variant="primary" onClick={() => navigate("/courses")}>
                          {ui.exploreCourses}
                        </Button>
                      </div>
                    ) : (
                      <Row className="g-3">
                        {continueCourses.map((c) => (
                          <Col md={6} key={c.courseKey}>
                            <DashCourseCard
                              c={c}
                              downloading={downloading}
                              onContinue={handleContinue}
                              onDetails={(course) => navigate(`/courses/${course.courseKey}`)}
                              onDownloadCert={onDownloadCert}
                              ui={ui}
                              pickText={pickText}
                            />
                          </Col>
                        ))}
                      </Row>
                    )
                  ) : loadingCareers && !careers.length ? (
                    <Row className="g-3">
                      <Col md={6}><SkeletonCareerCard /></Col>
                      <Col md={6}><SkeletonCareerCard /></Col>
                    </Row>
                  ) : !careers.length ? (
                    <div className="dash-empty mt-3">
                      <div className="dash-empty-icon">
                        <i className="bi bi-signpost-split" />
                      </div>
                      <div className="dash-empty-title">{ui.noCareerTitle}</div>
                      <div className="dash-empty-sub">{ui.noCareerSub}</div>
                      <Button variant="primary" onClick={() => navigate("/careers")}>
                        {ui.exploreCareers}
                      </Button>
                    </div>
                  ) : (
                    <Row className="g-3">
                      {careers.map((c) => (
                        <Col md={6} key={c.slug}>
                          <DashCareerCard
                            c={c}
                            onContinue={handleCareerContinue}
                            onView={(x) => {
                              if (!x?.slug) navigate("/careers");
                              else navigate(`/careers/${x.slug}`);
                            }}
                            ui={ui}
                            pickText={pickText}
                          />
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="dash-card dash-panel">
                <div className="dash-panel-head">
                  <div>
                    <h4 className="dash-panel-title">{ui.profile}</h4>
                    <div className="dash-muted">{ui.manageAccount}</div>
                  </div>
                  <div className="dash-chip">
                    <i className="bi bi-person-badge" /> {ui.account}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="dash-muted mb-2">{ui.signedInAs}</div>

                  <div className="p-3 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#9ca3af" }}>
                      {loadingUser ? (lang === "km" ? "កំពុងផ្ទុក…" : "Loading…") : name}
                    </div>
                    <div className="dash-muted">{loadingUser ? "…" : email}</div>
                  </div>

                  <div className="mt-3 d-flex gap-2 flex-wrap">
                    <Button variant="primary" onClick={() => navigate("/profile")}>
                      <i className="bi bi-pencil-square" /> {ui.editProfile}
                    </Button>
                    <Button variant="outline-light" onClick={() => navigate("/settings")}>
                      <i className="bi bi-gear" /> {ui.settings}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
}
