import React, { useMemo, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import html2canvas from "html2canvas";
import "./CertificateModal.css";

// ✅ Put your logo in: src/assets/images/khmercodehub-logo.png
import logo from "../assets/images/logo.png";

export default function CertificateModal({
  show,
  onHide,
  userName,
  courseTitle,
  timeSpentMinutes,
}) {
  const certRef = useRef(null);

  const timeText = useMemo(() => {
    const total = Math.max(0, Number(timeSpentMinutes || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h <= 0 ? `${m} minutes` : `${h} hours ${m} minutes`;
  }, [timeSpentMinutes]);

  const downloadPNG = async () => {
    if (!certRef.current) return;

    const canvas = await html2canvas(certRef.current, {
      scale: 2.5,
      backgroundColor: "#ffffff", // ✅ looks like real paper
      useCORS: true,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `Certificate - ${courseTitle}.png`;
    link.click();
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>🎉 Course Completed</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Falling flakes */}
        <div className="flakes">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="flake" style={{ "--i": i }} />
          ))}
        </div>

        {/* ✅ Certificate paper */}
        <div className="cert-sheet" ref={certRef}>
          {/* border */}
          <div className="cert-border-outer">
            <div className="cert-border-inner">
              {/* ✅ Top center: logo + brand */}
              <div className="cert-header">
                <img className="cert-logo" src={logo} alt="KhmerCodeHub Logo" />
                <div className="cert-brand-block">
                  <div className="cert-brand">KhmerCodeHub</div>
                  <div className="cert-brand-sub">
                    E-Learning Platform • Skills for Your Future
                  </div>
                </div>
              </div>

              {/* title */}
              <div className="cert-title-wrap">
                <div className="cert-title">Certificate of Completion</div>
                <div className="cert-title-line" />
              </div>

              {/* body */}
              <div className="cert-body">
                <div className="cert-text">This certificate is proudly awarded to</div>
                <div className="cert-name">{userName || "Student"}</div>

                <div className="cert-text">for successfully completing</div>
                <div className="cert-course">{courseTitle}</div>

                <div className="cert-meta">
                  <div className="cert-meta-item">
                    <div className="cert-meta-label">Time Spent</div>
                    <div className="cert-meta-value">{timeText}</div>
                  </div>

                  <div className="cert-meta-item">
                    <div className="cert-meta-label">Date</div>
                    <div className="cert-meta-value">
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ footer (same style idea, remove ID) */}
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
        </div>

        {/* buttons */}
        <div className="cert-actions">
          <Button variant="primary" onClick={downloadPNG}>
            Download Certificate (PNG)
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
