import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const isAuthed = () => localStorage.getItem("isLoggedIn") === "true";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthed()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return children;
}
