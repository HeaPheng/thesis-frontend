// AppRoutes.jsx (FULL MODIFIED)
// ✅ Fixes duplicate QCM route
// ✅ Restores legacy /qcm (unit-based) -> redirects to /qcm/:lastLessonId
// ✅ Keeps your lesson-based real QCM route

import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import api from "../lib/api";

import MainLayout from "../layouts/MainLayout";
import LeaderboardPage from "../pages/Leaderboard/LeaderboardPage";
import Home from "../pages/Home/Home";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Courses from "../pages/Courses/Courses";
import Careers from "../pages/Careers/Careers";
import CourseDetail from "../pages/CourseDetail/CourseDetail";
import CareerDetail from "../pages/CareerDetail/CareerDetail";
import LessonPage from "../pages/Lessons/LessonPage";
import QCMPage from "../pages/QCM/QCMPage";
import CodingPage from "../pages/Coding/CodingPage";
import MyLearning from "../pages/User/MyLearning";
import Dashboard from "../pages/User/Dashboard";
import Profile from "../pages/User/Profile";
import Settings from "../pages/User/Settings";
import XpHistory from "../pages/User/XpHistory";
import Tips from "../pages/Tips/Tips";
import TipDetail from "../pages/Tips/TipDetail";
import MyItemsPage from "../pages/User/MyItemsPage";

import ProtectedRoute from "./ProtectedRoute";

import Shop from "../pages/shop/Shop";

/** ✅ Legacy redirect: /qcm -> /qcm/:lastLessonId */
function LegacyQcmRedirectToLastLesson() {
  const { courseId, unitId } = useParams();
  const [target, setTarget] = React.useState(null);

  React.useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const { data } = await api.get(`/courses/${courseId}`);
        const unit = (data?.units || []).find((u) => Number(u.id) === Number(unitId));
        const lastLessonId = unit?.lessons?.[unit?.lessons?.length - 1]?.id;

        if (!alive) return;

        if (lastLessonId) {
          setTarget(`/course/${courseId}/unit/${unitId}/qcm/${Number(lastLessonId)}`);
        } else {
          setTarget(`/courses/${courseId}`);
        }
      } catch {
        if (!alive) return;
        setTarget(`/courses/${courseId}`);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [courseId, unitId]);

  if (!target) return null; // or a loading UI
  return <Navigate to={target} replace />;
}

const AppRoutes = ({ lang, setLang }) => {
  return (
    <Routes>
      <Route element={<MainLayout lang={lang} setLang={setLang} />}>
      

        <Route
          path="/shop"
          element={
            <ProtectedRoute>
              <Shop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-items"
          element={
            <ProtectedRoute>
              <MyItemsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ✅ Public list pages */}
        <Route path="/courses" element={<Courses />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/tips" element={<Tips />} />
        <Route path="/tips/:slug" element={<TipDetail />} />

        {/* 🔒 Protected: details */}
        <Route
          path="/courses/:id"
          element={
            <ProtectedRoute>
              <CourseDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/careers/:id"
          element={
            <ProtectedRoute>
              <CareerDetail />
            </ProtectedRoute>
          }
        />

        {/* 🔒 Protected: user pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-learning"
          element={
            <ProtectedRoute>
              <MyLearning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/xp-history"
          element={
            <ProtectedRoute>
              <XpHistory />
            </ProtectedRoute>
          }
        />

        {/* 🔒 Protected: learning pages */}
        <Route
          path="/course/:courseId/unit/:unitId/lesson/:lessonId"
          element={
            <ProtectedRoute>
              <LessonPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/course/:courseId/unit/:unitId/coding"
          element={
            <ProtectedRoute>
              <CodingPage />
            </ProtectedRoute>
          }
        />

        {/* ✅ REAL QCM route (lesson-based) */}
        <Route
          path="/course/:courseId/unit/:unitId/qcm"
          element={
            <ProtectedRoute>
              <QCMPage />
            </ProtectedRoute>
          }
        />

        {/* ✅ Legacy QCM route (unit-based URL) */}
        <Route
          path="/course/:courseId/unit/:unitId/qcm"
          element={<LegacyQcmRedirectToLastLesson />}
        />
      </Route>

      <Route path="/leaderboard" element={<LeaderboardPage />} />

    </Routes>
  );
};

export default AppRoutes;
