import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import parse, { domToReact } from "html-react-parser";
import CodeBlock from "./CodeBlock";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

function prefixStorageUrls(html = "") {
  html = html.replaceAll('src="/storage/', `src="${API_BASE}/storage/`);
  html = html.replaceAll("src='/storage/", `src='${API_BASE}/storage/`);
  return html;
}

export default function LessonContent({ content }) {
  const safeHtml = useMemo(() => {
    const fixed = prefixStorageUrls(content || "");
    return DOMPurify.sanitize(fixed, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["iframe"],
      ADD_ATTR: [
        "allow",
        "allowfullscreen",
        "frameborder",
        "scrolling",
        "src",
        "title",
        "width",
        "height",
        "referrerpolicy",
      ],
    });
  }, [content]);

  const rendered = useMemo(() => {
    return parse(safeHtml, {
      replace: (node) => {
        // target: <pre><code>...</code></pre>
        if (node?.name === "pre") {
          const codeChild = node.children?.find((c) => c?.name === "code");
          const codeText = codeChild
            ? domToReact(codeChild.children || [])
            : domToReact(node.children || []);

          // codeText can be React nodes; convert to plain text safely
          const asText =
            typeof codeText === "string"
              ? codeText
              : Array.isArray(codeText)
              ? codeText.map((x) => (typeof x === "string" ? x : "")).join("")
              : "";

          // fallback: pull raw text from the code node if possible
          const raw =
            codeChild?.children?.map((c) => c?.data || "").join("") ||
            node.children?.map((c) => c?.data || "").join("") ||
            asText;

          return <CodeBlock code={raw} label="Code" />;
        }

        return undefined;
      },
    });
  }, [safeHtml]);

  return <div className="lesson-html">{rendered}</div>;
}
