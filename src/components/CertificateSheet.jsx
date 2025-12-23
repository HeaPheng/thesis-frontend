import React, { useMemo } from "react";
import "./CertificateModal.css";
import logo from "../assets/images/logo.png";

export default function CertificateSheet({ userName, courseTitle, timeSpentMinutes }) {
  const timeText = useMemo(() => {
    const total = Math.max(0, Number(timeSpentMinutes || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h <= 0 ? `${m} minutes` : `${h} hours ${m} minutes`;
  }, [timeSpentMinutes]);

  return (
    <div className="cert-sheet">
      <div className="cert-border-outer">
        <div className="cert-border-inner">
          <div className="cert-header">
            <img className="cert-logo" src={logo} alt="Logo" />
            <div className="cert-brand-block">
              <div className="cert-brand">KhmerCodeHub</div>
              <div className="cert-brand-sub">
                E-Learning Platform • Skills for Your Future
              </div>
            </div>
          </div>

          <div className="cert-title-wrap">
            <div className="cert-title">Certificate of Completion</div>
            <div className="cert-title-line" />
          </div>

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
                <div className="cert-meta-value">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

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
  );
}
