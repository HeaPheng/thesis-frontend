import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MilestoneModal({ open, xpBalance, milestone, onClose }) {
  const navigate = useNavigate();

  // Local state to allow "closing animation" before unmount
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // display XP safely
  const totalXp = useMemo(() => {
    if (typeof xpBalance === "number") return xpBalance;
    const n = Number(xpBalance);
    return Number.isFinite(n) ? n : "";
  }, [xpBalance]);

  // When open turns true -> show with enter animation
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      // if parent closes immediately, keep a smooth exit
      setClosing(true);
      const t = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 180);
      return () => clearTimeout(t);
    }
  }, [open, visible]);

  // ESC closes
  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      onClose?.();
    }, 180);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes mmBackdropIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mmCardIn {
          from { opacity: 0; transform: translateY(10px) scale(.98) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes mmCardOut {
          from { opacity: 1; transform: translateY(0) scale(1) }
          to { opacity: 0; transform: translateY(8px) scale(.98) }
        }
        @keyframes mmGlow {
          0%,100% { opacity: .45; transform: scale(1) }
          50% { opacity: .75; transform: scale(1.03) }
        }
        @keyframes mmShine {
          from { transform: translateX(-120%) rotate(18deg); opacity: 0 }
          25% { opacity: .30 }
          to { transform: translateX(120%) rotate(18deg); opacity: 0 }
        }
      `}</style>

      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(1200px 600px at 50% 25%, rgba(99,102,241,.18), rgba(0,0,0,.72) 55%, rgba(0,0,0,.82) 100%)",
          backdropFilter: "blur(8px)",
          animation: "mmBackdropIn .16s ease-out",
          opacity: closing ? 0 : 1,
          transition: "opacity .18s ease",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 560,
            maxWidth: "100%",
            borderRadius: 22,
            padding: 18,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,.10)",
            background:
              "linear-gradient(180deg, rgba(17,24,39,.92), rgba(11,18,32,.92))",
            boxShadow:
              "0 18px 55px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)",
            animation: closing ? "mmCardOut .18s ease-in forwards" : "mmCardIn .20s ease-out",
          }}
        >
          {/* Glow blobs */}
          <div
            style={{
              position: "absolute",
              inset: -140,
              background:
                "radial-gradient(circle at 30% 30%, rgba(34,197,94,.25), transparent 50%), radial-gradient(circle at 75% 55%, rgba(99,102,241,.22), transparent 55%)",
              filter: "blur(16px)",
              animation: "mmGlow 2.6s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          {/* Shine sweep */}
          <div
            style={{
              position: "absolute",
              top: -40,
              left: 0,
              width: "60%",
              height: "160%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent)",
              transform: "translateX(-120%) rotate(18deg)",
              animation: "mmShine 1.5s ease-out .2s 1",
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, position: "relative" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "linear-gradient(135deg, rgba(34,197,94,.95), rgba(99,102,241,.75))",
                  boxShadow: "0 10px 30px rgba(34,197,94,.18)",
                  fontSize: 18,
                }}
              >
                🎉
              </div>

              <div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>Milestone Reached</div>
                <div style={{ opacity: 0.9, marginTop: 4 }}>
                  You hit{" "}
                  <span
                    style={{
                      fontWeight: 900,
                      background:
                        "linear-gradient(90deg, rgba(34,197,94,1), rgba(99,102,241,1))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {milestone ?? "—"} XP
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 900,
                lineHeight: "38px",
              }}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* XP Card */}
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 18,
              position: "relative",
              border: "1px solid rgba(255,255,255,.10)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.04))",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.85 }}>Your total XP</div>
            <div style={{ marginTop: 6, fontSize: 44, fontWeight: 950, letterSpacing: 0.3 }}>
              {totalXp}
            </div>
            <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
              Spend XP in the Avatar Shop to unlock new items.
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", position: "relative" }}>
            <button
              onClick={() => {
                handleClose();
                setTimeout(() => navigate("/shop"), 190);
              }}
              style={{
                flex: 1,
                minWidth: 220,
                padding: "12px 14px",
                borderRadius: 16,
                border: "none",
                cursor: "pointer",
                fontWeight: 900,
                color: "#07110a",
                background:
                  "linear-gradient(135deg, rgba(34,197,94,1), rgba(16,185,129,1))",
                boxShadow: "0 16px 36px rgba(34,197,94,.18)",
                transform: "translateY(0)",
                transition: "transform .15s ease",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              Go to Avatar Shop
            </button>

            <button
              onClick={handleClose}
              style={{
                flex: 1,
                minWidth: 160,
                padding: "12px 14px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.16)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
