import React from "react";
import ReactMarkdown from "react-markdown";
import "./LessonPage.css";

export default function LessonContent({ content }) {
  return (
    <div className="lesson-content">
      <div className="lesson-markdown">
        <ReactMarkdown
          components={{
            code({ children }) {
              return (
                <pre className="lesson-code-block">
                  <code>{children}</code>
                </pre>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
