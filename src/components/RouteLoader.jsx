import React from "react";
import "./RouteLoader.css";

export default function RouteLoader({ show, label = "Loading..." }) {
  if (!show) return null;

  return (
    <div className="route-loader" role="status" aria-live="polite">
      <div className="route-loader__card">
        <div className="route-loader__spinner" />
        <div className="route-loader__text">
          <div className="route-loader__title">{label}</div>
          <div className="route-loader__sub">Please wait a moment</div>
        </div>
      </div>
    </div>
  );
}
