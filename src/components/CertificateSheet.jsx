import React, { useMemo } from "react";
import "./CertificateSheet.css";
import logo from "../assets/images/logo.png";

function initialsFromName(n = "") {
  const parts = n.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "S";
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

export default function CertificateSheet({
  userName,
  courseTitle,
  timeSpentMinutes,
  avatarKey: avatarKeyProp,
}) {
  // ✅ avatar from props or localStorage
  const avatarKey = useMemo(() => {
    if (avatarKeyProp) return avatarKeyProp;
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u?.avatar_key || null;
    } catch {
      return null;
    }
  }, [avatarKeyProp]);

  const avatarSrc = avatarKey ? `/avatars/${avatarKey}.png` : null;

  const timeText = useMemo(() => {
    const total = Math.max(0, Number(timeSpentMinutes || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h <= 0) return `${m} minutes`;
    if (m === 0) return `${h} hours`;
    return `${h} hours ${m} minutes`;
  }, [timeSpentMinutes]);

  const niceDate = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }, []);

  /**
   * ✅ IMPORTANT:
   * We wrap the certificate in a fixed-size export frame (landscape)
   * so html2canvas captures the whole design without cutting.
   *
   * Your CSS should style:
   *  - .cert-export-frame (fixed W/H)
   *  - .cert-export-scale (optional scaling if needed)
   */
  return (
    <div className="cert-export-frame">
      <div className="cert-export-scale">
        <div className="cert-sheet">
          <div className="cert-border-outer">
            <div className="cert-border-inner">
              {/* Header */}
              <div className="cert-header">
                <div className="cert-logo-wrap">
                  <img className="cert-logo" src={logo} alt="KhmerCodeHub Logo" />
                </div>

                <div className="cert-brand-block">
                  <div className="cert-brand">KhmerCodeHub</div>
                  <div className="cert-brand-sub">E-Learning Platform • Skills for Your Future</div>
                </div>

                {/* Avatar bubble */}
                <div className="cert-userbubble" title={userName || "Student"}>
                  {avatarSrc ? (
                    <img className="cert-useravatar" src={avatarSrc} alt="User avatar" />
                  ) : (
                    <div className="cert-userinitials">{initialsFromName(userName || "Student")}</div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div className="cert-title-wrap">
                <div className="cert-title">Certificate of Completion</div>
                <div className="cert-title-line" />
              </div>

              {/* Body */}
              <div className="cert-body">
                <div className="cert-text">This certificate is proudly awarded to</div>
                <div className="cert-name">{userName || "Student"}</div>

                <div className="cert-text">for successfully completing</div>
                <div className="cert-course">{courseTitle || "Course"}</div>

                <div className="cert-meta">
                  <div className="cert-meta-item">
                    <div className="cert-meta-label">Time Spent</div>
                    <div className="cert-meta-value">{timeText}</div>
                  </div>

                  <div className="cert-meta-item">
                    <div className="cert-meta-label">Date</div>
                    <div className="cert-meta-value">{niceDate}</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="cert-footer">
                <div className="cert-sign">
                  <div className="cert-line" />
                  <div className="cert-small">Instructor Signature</div>
                </div>

                <div className="cert-seal">
                  <div className="cert-seal-circle">
                    <div className="cert-seal-inner">
                      <div className="cert-seal-top">OFFICIAL</div>
                      <div className="cert-seal-mid">SEAL</div>
                      <div className="cert-seal-bot">KhmerCodeHub</div>
                    </div>
                  </div>
                </div>

                <div className="cert-sign">
                  <div className="cert-line" />
                  <div className="cert-small">Program Director</div>
                </div>
              </div>
            </div>
          </div>

          {/* Watermark */}
          <div className="cert-watermark" aria-hidden="true">
            KhmerCodeHub
          </div>
        </div>
      </div>
    </div>
  );
}
