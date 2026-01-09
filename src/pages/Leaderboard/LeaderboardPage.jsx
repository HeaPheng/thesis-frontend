import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Navbar from "../../components/Navbar";
import AppFooter from "../../components/FooterMini";
import api from "../../lib/api";
import "./Leaderboard.css";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

const API = {
  xp: "/leaderboard/xp",
  streak: "/leaderboard/streak",
};

const LS_KEY = {
  xp: "lb_cache_xp_v6",
  streak: "lb_cache_streak_v6",
};

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch { }
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * ✅ Avatar resolver for your Laravel setup
 */
function resolveAvatarUrl(raw) {
  let v = String(raw || "").trim();
  if (!v) return "/avatars/a1.png";

  v = v.replaceAll("\\", "/");

  if (/^https?:\/\//i.test(v)) return v;

  if (v.startsWith("/avatars/")) return v;
  if (v.startsWith("avatars/")) return `/${v}`;

  if (v.startsWith("public/")) v = v.replace(/^public\//, "storage/");
  if (v.startsWith("/public/")) v = v.replace(/^\/public\//, "/storage/");

  if (v.startsWith("avatar-items/")) v = `storage/${v}`;
  if (v.startsWith("/avatar-items/")) v = `/storage${v}`;

  if (v.startsWith("storage/")) v = `/${v}`;

  const apiBase = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const origin = apiBase.replace(/\/api$/i, "");

  if (v.startsWith("/storage/")) return `${origin}${v}`;

  if (!v.startsWith("/")) v = `/${v}`;
  return `${origin}${v}`;
}

function normalizePayload(json, tab) {
  const top3 = Array.isArray(json?.top3) ? json.top3 : [];
  const top10 = Array.isArray(json?.top10) ? json.top10 : [];

  const normalizeUser = (u, idx) => {
    const rank = safeNum(u?.rank ?? idx + 1, idx + 1);
    const name = u?.name || u?.username || "Student";

    const avatarRaw =
      u?.active_avatar_image_url ||
      u?.avatar ||
      u?.avatar_url ||
      u?.image_url_external ||
      u?.image_path ||
      "";

    const avatar = resolveAvatarUrl(avatarRaw);

    const xpPeak = safeNum(u?.xp_peak ?? 0, 0);
    const xpNow = safeNum(u?.xp_balance ?? 0, 0);

    const streakBest = safeNum(u?.streak_best ?? 0, 0);
    const streakNow = safeNum(u?.streak_count ?? 0, 0);

    return {
      id: u?.id ?? `${tab}-${rank}-${name}`,
      rank,
      name,
      avatar,
      xp_peak: xpPeak,
      xp_balance: xpNow,
      streak_best: streakBest,
      streak_count: streakNow,
    };
  };

  return {
    updated_at: safeNum(json?.updated_at ?? 0, 0),
    top3: top3.map((u, i) => normalizeUser(u, i)),
    top10: top10.map((u, i) => normalizeUser(u, i)),
  };
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("xp");
  const [dataCache, setDataCache] = useState(() => ({
    xp: readCache(LS_KEY.xp) || null,
    streak: readCache(LS_KEY.streak) || null,
  }));
  const [loading, setLoading] = useState(!dataCache.xp);
  const [error, setError] = useState("");
  const [pulseTop, setPulseTop] = useState(false);

  // ✅ NEW: make refresh icon spin briefly even if loading is super fast
  const [refreshSpin, setRefreshSpin] = useState(false);

  // ✅ Load current user from localStorage and keep it synced
  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const lastUpdatedRef = useRef({
    xp: readCache(LS_KEY.xp)?.updated_at ?? 0,
    streak: readCache(LS_KEY.streak)?.updated_at ?? 0,
  });

  const data = useMemo(() => dataCache[tab], [dataCache, tab]);

  const valueLabel = useMemo(() => (tab === "xp" ? "Peak XP" : "Longest Streak"), [tab]);
  const mainSuffix = useMemo(() => (tab === "xp" ? " XP" : " days"), [tab]);
  const mainIcon = useMemo(() => (tab === "xp" ? "💎" : "🔥"), [tab]);

  const activeTop3 = useMemo(() => data?.top3 ?? [], [data]);
  const activeTop10 = useMemo(() => data?.top10 ?? [], [data]);

  const updatedText = useMemo(() => {
    if (!data?.updated_at) return "";
    return new Date(data.updated_at * 1000).toLocaleTimeString();
  }, [data?.updated_at]);

  // ✅ Figure out "Your rank" within Top10 (if exists)
  const myRow = useMemo(() => {
    const myId = safeNum(me?.id ?? 0, 0);
    if (!myId) return null;

    const found = activeTop10.find((u) => safeNum(u?.id, 0) === myId);
    return found || null;
  }, [activeTop10, me?.id]);

  // ✅ Sync user data from localStorage whenever it changes
  useEffect(() => {
    const syncUserData = () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setMe(user);
      } catch {
        // ignore
      }
    };

    window.addEventListener("auth-changed", syncUserData);
    window.addEventListener("xp-updated", syncUserData);
    const onStorage = (e) => {
      if (e.key === "user") syncUserData();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("auth-changed", syncUserData);
      window.removeEventListener("xp-updated", syncUserData);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const fetchLeaderboard = useCallback(
    async (forceRefresh = false) => {
      setError("");
      setLoading(true);

      try {
        const res = await api.get(API[tab]);
        const normalized = normalizePayload(res?.data, tab);

        const incomingUpdated = normalized?.updated_at ?? 0;

        if (forceRefresh || incomingUpdated > (lastUpdatedRef.current[tab] || 0)) {
          lastUpdatedRef.current[tab] = incomingUpdated;

          setDataCache((prev) => ({
            ...prev,
            [tab]: normalized,
          }));

          writeCache(LS_KEY[tab], normalized);

          if (!forceRefresh) {
            setPulseTop(true);
            window.setTimeout(() => setPulseTop(false), 650);
          }
        }

        setLoading(false);
      } catch (e) {
        setError(
          e?.response?.status === 500
            ? "Server error while loading leaderboard."
            : e?.response?.data?.message || "Could not load leaderboard. Please try again."
        );
        setLoading(false);
      }
    },
    [tab]
  );

  // ✅ Initial load and periodic refresh
  useEffect(() => {
    if (!dataCache[tab]) {
      fetchLeaderboard();
    }
    const interval = setInterval(() => fetchLeaderboard(), 60000);
    return () => clearInterval(interval);
  }, [tab, fetchLeaderboard, dataCache]);

  const handleRefreshClick = async () => {
    // start spin immediately (even if request returns instantly)
    setRefreshSpin(true);
    window.setTimeout(() => setRefreshSpin(false), 650);

    await fetchLeaderboard(true);
  };

  return (
    <>
      <Navbar />

      <div className="lb2-page">
        <div className={`lb2-shell ${pulseTop ? "lb2-pulse" : ""}`}>
          {/* HERO */}
          <div className="lb2-hero">
            <div className="lb2-hero-left">
              <div className="lb2-title-row">
                <span className="lb2-badge">🏆</span>
                <h2 className="lb2-title">Leaderboard</h2>
              </div>

              <div className="lb2-sub">
                Track the top performers by <b>{valueLabel}</b>
                {!!updatedText && !loading && (
                  <span className="lb2-updated">• Updated {updatedText}</span>
                )}
              </div>

              <div className="lb2-actionsRow">
                {/* ✅ NEW Refresh Button (no styled-components) */}
                <button
                  type="button"
                  className={`lb2-refreshBtn ${loading ? "isLoading" : ""} ${refreshSpin ? "spinNow" : ""
                    }`}
                  onClick={handleRefreshClick}
                  title="Refresh"
                  aria-label="Refresh leaderboard"
                  disabled={loading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={16}
                    height={16}
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
                    <path
                      fillRule="evenodd"
                      d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"
                    />
                  </svg>
                  Refresh
                </button>

                {loading ? <span className="lb2-loading">Loading…</span> : null}
              </div>

              <div className="go-shop">
                <Button variant="success" onClick={() => navigate("/shop")}>
                  Go To Shop
                </Button>
              </div>
            </div>

            <div className="lb2-hero-right">
              <div className="lb2-tabsWrap" aria-label="Leaderboard Tabs">
                <label htmlFor="lb2-filter" className="lb2-switch" aria-label="Toggle XP / Streak">
                  <input
                    type="checkbox"
                    id="lb2-filter"
                    checked={tab === "streak"}
                    onChange={(e) => setTab(e.target.checked ? "streak" : "xp")}
                  />
                  <span>XP</span>
                  <span>Streak</span>
                </label>
              </div>

              {/* YOUR RANK */}
              <div className="lb2-meCard" aria-label="Your rank card">
                <div className="lb2-meTop">
                  <div className="lb2-meLabel">Your Rank</div>
                  <div className="lb2-meRank">{myRow ? `#${myRow.rank}` : "Not in Top 10"}</div>
                </div>

                <div className="lb2-meBody">
                  <span className="lb2-avatarRing">
                    <img
                      className="lb2-avatar"
                      src={resolveAvatarUrl(
                        me?.active_avatar_image_url || me?.active_avatar_image || me?.avatar || ""
                      )}
                      alt={me?.name || "You"}
                      onError={(e) => (e.currentTarget.src = "/avatars/a1.png")}
                    />
                  </span>

                  <div className="lb2-meMeta">
                    <div className="lb2-meName">{me?.name || "You"}</div>
                    <div className="lb2-meStat">
                      {tab === "xp" ? (
                        <span className="pill">
                          💎{" "}
                          {myRow
                            ? myRow.xp_peak.toLocaleString()
                            : safeNum(me?.xp_peak ?? 0, 0).toLocaleString()}{" "}
                          XP
                        </span>
                      ) : (
                        <span className="pill">
                          🔥 {myRow ? myRow.streak_best : safeNum(me?.streak_best ?? 0, 0)} days
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lb2-tip mini">
                  <div className="lb2-tip-dot" />
                  <div>
                    Ranking uses <b>{tab === "xp" ? "Peak XP" : "Longest Streak"}</b> (all-time
                    best), not current values.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="lb2-error">
              <div className="lb2-error-title">Something went wrong</div>
              <div className="lb2-error-text">{error}</div>
              <div className="lb2-error-actions">
                <button type="button" className="lb2-btn" onClick={() => fetchLeaderboard(true)}>
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          {/* PODIUM */}
          <section className="lb2-podium" aria-label="Top 3 podium">
            <PodiumCard2 user={activeTop3[1]} place={2} icon={mainIcon} suffix={mainSuffix} tab={tab} />
            <PodiumCard2
              user={activeTop3[0]}
              place={1}
              icon={mainIcon}
              suffix={mainSuffix}
              tab={tab}
              isWinner
            />
            <PodiumCard2 user={activeTop3[2]} place={3} icon={mainIcon} suffix={mainSuffix} tab={tab} />
          </section>

          {/* LIST */}
          <section className="lb2-list" aria-label="Top 10 list">
            <div className="lb2-table-head">
              <div>Rank</div>
              <div>User</div>
              <div className="right">{tab === "xp" ? "Peak XP" : "Longest Streak"}</div>
            </div>

            {activeTop10.length === 0 ? (
              <div className="lb2-empty">No users yet.</div>
            ) : (
              activeTop10.map((u) => {
                const isMe = safeNum(u?.id, 0) === safeNum(me?.id, 0);
                return (
                  <button
                    type="button"
                    key={u.id}
                    className={`lb2-row ${isMe ? "me" : ""}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    title={isMe ? "This is you" : "Scroll to top"}
                  >
                    <div className="lb2-rank">#{u.rank}</div>

                    <div className="lb2-user">
                      <span className="lb2-avatarRing">
                        <img
                          className="lb2-avatar"
                          src={u.avatar}
                          alt={u.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = "/avatars/a1.png";
                          }}
                        />
                      </span>

                      <div className="lb2-user-meta">
                        <div className="lb2-name">
                          {u.name} {isMe ? <span className="lb2-meTag">You</span> : null}
                        </div>

                        <div className="lb2-mini">
                          <span className="pill">
                            {mainIcon} {tab === "xp" ? `${u.xp_peak.toLocaleString()}` : `${u.streak_best}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="lb2-value right">
                      <span className="lb2-main">
                        {mainIcon} {tab === "xp" ? u.xp_peak.toLocaleString() : u.streak_best}
                        {mainSuffix}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </section>
        </div>
      </div>

      <AppFooter />
    </>
  );
}

function PodiumCard2({ user, place, icon, suffix, tab, isWinner = false }) {
  if (!user) return <div className={`lb2-podium-card ${isWinner ? "winner" : ""} ghost`} />;

  const main = tab === "xp" ? safeNum(user?.xp_peak ?? 0, 0) : safeNum(user?.streak_best ?? 0, 0);

  return (
    <div className={`lb2-podium-card ${isWinner ? "winner" : ""} p${place}`} role="group" aria-label={`Rank ${place}`}>
      <div className="lb2-podium-top">
        <div className="lb2-place">#{place}</div>
        {isWinner ? <div className="lb2-crown">👑</div> : <div className="lb2-chip">{place === 2 ? "Silver" : "Bronze"}</div>}
      </div>

      <div className="lb2-podium-avatarWrap">
        <span className="lb2-avatarRing big">
          <img
            className="lb2-podium-avatar"
            src={user.avatar}
            alt={user.name}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/avatars/a1.png";
            }}
          />
        </span>
      </div>

      <div className="lb2-podium-center">
        <div className="lb2-podium-name" title={user.name}>
          {user.name}
        </div>

        <div className="lb2-podium-main">
          <span className="lb2-ico">{icon}</span> {Number(main).toLocaleString()}
          {suffix}
        </div>
      </div>
    </div>
  );
}
