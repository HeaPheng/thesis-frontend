import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const isAuthed = () => !!localStorage.getItem("token"); // ✅ token is the source of truth

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthed()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }} // keeps your "redirect back" behavior
      />
    );
  }

  return children;
}
