import React, { useEffect, useRef } from "react";

export default function CodeBlockEnhancer({ html }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Remove old wrappers (so it won't duplicate on re-render)
    root.querySelectorAll("[data-codewrap='1']").forEach((wrap) => {
      const original = wrap.querySelector("pre[data-original='1']");
      if (original) wrap.replaceWith(original);
      else wrap.remove();
    });

    const pres = Array.from(root.querySelectorAll("pre"));

    pres.forEach((pre) => {
      // already wrapped?
      if (pre.closest("[data-codewrap='1']")) return;

      const codeEl = pre.querySelector("code");
      const codeText = (codeEl?.innerText || pre.innerText || "").trimEnd();

      // clone pre (DO NOT move original node)
      const preClone = pre.cloneNode(true);
      preClone.setAttribute("data-original", "1");

      // wrapper
      const wrap = document.createElement("div");
      wrap.dataset.codewrap = "1";
      wrap.style.margin = "12px 0";
      wrap.style.borderRadius = "14px";
      wrap.style.overflow = "hidden";
      wrap.style.border = "1px solid rgba(255,255,255,0.10)";
      wrap.style.background = "#0b1220";

      // top bar
      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.alignItems = "center";
      top.style.justifyContent = "space-between";
      top.style.padding = "10px 12px";
      top.style.borderBottom = "1px solid rgba(255,255,255,0.10)";
      top.style.background = "rgba(255,255,255,0.03)";
      top.style.color = "rgba(255,255,255,0.9)";
      top.style.fontSize = "13px";

      const left = document.createElement("div");
      left.textContent = "Code";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "📋 Copy";
      btn.style.padding = "6px 10px";
      btn.style.borderRadius = "10px";
      btn.style.border = "1px solid rgba(255,255,255,0.14)";
      btn.style.background = "rgba(0,0,0,0.35)";
      btn.style.color = "white";
      btn.style.cursor = "pointer";

      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(codeText);
          const old = btn.textContent;
          btn.textContent = "✅ Copied";
          setTimeout(() => (btn.textContent = old), 1200);
        } catch (e) {
          console.error(e);
          alert("Copy failed (clipboard permission).");
        }
      });

      top.appendChild(left);
      top.appendChild(btn);

      // style the cloned pre a bit (keep your code styling)
      preClone.style.margin = "0";
      preClone.style.padding = "14px";
      preClone.style.background = "transparent";
      preClone.style.overflowX = "auto";

      wrap.appendChild(top);
      wrap.appendChild(preClone);

      // replace original pre with wrapper (wrapper does NOT contain original => safe)
      pre.replaceWith(wrap);
    });
  }, [html]);

  return (
    <div
      ref={rootRef}
      className="lesson-html"
      dangerouslySetInnerHTML={{ __html: html || "" }}
    />
  );
}
