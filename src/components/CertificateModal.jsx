import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import html2canvas from "html2canvas";
import "./CertificateModal.css";

import CertificateSheet from "./CertificateSheet";

function pickNameFromStorage() {
  const keys = ["user", "auth_user", "me", "profile"];
  for (const k of keys) {
    try {
      const obj = JSON.parse(localStorage.getItem(k) || "null");
      if (!obj) continue;

      const name =
        obj?.name ||
        obj?.full_name ||
        obj?.username ||
        obj?.user?.name ||
        obj?.data?.name;

      if (String(name || "").trim()) return String(name).trim();

      const email = obj?.email || obj?.user?.email || obj?.data?.email;
      if (String(email || "").includes("@")) return String(email).split("@")[0];
    } catch {}
  }
  return "";
}

/**
 * Fetch remote image -> blob -> dataURL (base64).
 * This avoids CORS / tainted canvas issues when exporting with html2canvas.
 */
async function imageUrlToDataUrl(url) {
  if (!url) return null;
  try {
    // Ensure absolute URL
    const abs = new URL(url, window.location.origin).toString();

    const res = await fetch(abs, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;

    const blob = await res.blob();
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    return typeof dataUrl === "string" ? dataUrl : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort: find avatar url from localStorage user payloads.
 */
function pickAvatarUrlFromStorage() {
  const keys = ["user", "auth_user", "me", "profile"];
  for (const k of keys) {
    try {
      const obj = JSON.parse(localStorage.getItem(k) || "null");
      if (!obj) continue;

      const url =
        obj?.active_avatar_image_url ||
        obj?.avatar_url ||
        obj?.avatar?.url ||
        obj?.user?.active_avatar_image_url ||
        obj?.user?.avatar_url ||
        obj?.data?.active_avatar_image_url ||
        obj?.data?.avatar_url;

      if (String(url || "").trim()) return String(url).trim();
    } catch {}
  }
  return null;
}

export default function CertificateModal({
  show,
  onHide,
  userName,
  courseTitle,
  timeSpentMinutes,
  avatarKey: avatarKeyProp,
  avatarUrl: avatarUrlProp, // ✅ NEW optional prop (doesn't break if not provided)
}) {
  const exportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // Base64 version used only for export (most reliable)
  const [exportAvatarDataUrl, setExportAvatarDataUrl] = useState(null);

  const effectiveUserName = useMemo(() => {
    const p = String(userName || "").trim();
    if (p) return p;

    const fromLS = pickNameFromStorage();
    return fromLS || "Student";
  }, [userName]);

  const avatarKey = useMemo(() => {
    if (avatarKeyProp) return avatarKeyProp;
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u?.avatar_key || null;
    } catch {
      return null;
    }
  }, [avatarKeyProp]);

  // ✅ Try to get avatar URL from prop, else from localStorage payload
  const avatarUrl = useMemo(() => {
    if (avatarUrlProp) return avatarUrlProp;
    return pickAvatarUrlFromStorage();
  }, [avatarUrlProp]);

  // ✅ Prepare base64 avatar for EXPORT whenever modal opens / avatarUrl changes
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!show) return;
      if (!avatarUrl) {
        setExportAvatarDataUrl(null);
        return;
      }
      const dataUrl = await imageUrlToDataUrl(avatarUrl);
      if (!cancelled) setExportAvatarDataUrl(dataUrl);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [show, avatarUrl]);

  const waitForImages = useCallback(async (rootEl) => {
    if (!rootEl) return;

    const imgs = Array.from(rootEl.querySelectorAll("img"));

    // Force crossOrigin anonymous on export imgs (helps html2canvas)
    imgs.forEach((img) => {
      try {
        img.crossOrigin = "anonymous";
      } catch {}
    });

    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      })
    );
  }, []);

  const downloadPNG = async () => {
    if (!exportRef.current) return;

    try {
      setDownloading(true);

      // Small delay for layout + image decode
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => setTimeout(r, 120));

      await waitForImages(exportRef.current);

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) return;

      const safeTitle = String(courseTitle || "Course")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .slice(0, 60);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate - ${safeTitle}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      dialogClassName="cert-modal-dialog"
      contentClassName="cert-modal-content"
      backdropClassName="cert-modal-backdrop"
    >
      <Modal.Header closeButton className="cert-modal-header">
        <div className="cert-modal-titlewrap">
          <div className="cert-modal-kicker">🎉 Congratulations</div>
          <Modal.Title className="cert-modal-title">Course Completed</Modal.Title>
        </div>
      </Modal.Header>

      <Modal.Body className="cert-modal-body">
        <div className="flakes" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="flake" style={{ "--i": i }} />
          ))}
        </div>

        {/* ✅ Preview */}
        <div className="cert-stage">
          <CertificateSheet
            mode="preview"
            userName={effectiveUserName}
            courseTitle={courseTitle}
            timeSpentMinutes={timeSpentMinutes}
            avatarKey={avatarKey}
            avatarUrl={avatarUrl} // ✅ allow sheet to use URL if it supports it
          />
        </div>

        {/* ✅ Export (hidden) */}
        <div className="cert-export-hidden" aria-hidden="true">
          <div ref={exportRef}>
            <CertificateSheet
              mode="export"
              userName={effectiveUserName}
              courseTitle={courseTitle}
              timeSpentMinutes={timeSpentMinutes}
              avatarKey={avatarKey}
              avatarUrl={exportAvatarDataUrl || avatarUrl} // ✅ prefer base64 for export
            />
          </div>
        </div>

        <div className="cert-actions">
          <Button variant="outline-light" onClick={onHide} className="cert-btn">
            Close
          </Button>
          <Button
            variant="primary"
            onClick={downloadPNG}
            className="cert-btn cert-btn-primary"
            disabled={downloading}
          >
            {downloading ? "Downloading..." : "Download PNG"}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
