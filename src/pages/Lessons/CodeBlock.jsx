import React, { useState } from "react";

export default function CodeBlock({ code = "", label = "Code" }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.error(e);
      alert("Copy failed (clipboard permission).");
    }
  };

  return (
    <div
      style={{
        margin: "12px 0",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.10)",
        background: "#0b1220",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          color: "rgba(255,255,255,0.9)",
          fontSize: 13,
        }}
      >
        <div>{label}</div>

        <button
          type="button"
          onClick={onCopy}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            cursor: "pointer",
          }}
        >
          {copied ? "✅ Copied" : "📋 Copy"}
        </button>
      </div>

      <pre style={{ margin: 0, padding: 14, overflowX: "auto" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
