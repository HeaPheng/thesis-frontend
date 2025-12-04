import React from "react";
import { Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

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

import Dashboard from "../pages/User/Dashboard";
import Profile from "../pages/User/Profile";
import Settings from "../pages/User/Settings";

import Tips from "../pages/Tips/Tips";
import TipDetail from "../pages/Tips/TipDetail";

import ProtectedRoute from "./ProtectedRoute"; // ✅ add this

const AppRoutes = ({ lang, setLang }) => {
  return (
    <Routes>
      <Route element={<MainLayout lang={lang} setLang={setLang} />}>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ✅ Public list pages */}
        <Route path="/courses" element={<Courses />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/tips" element={<Tips />} />
        <Route path="/tips/:slug" element={<TipDetail />} />

        {/* 🔒 Protected: clicking "Start Learning" / details requires login */}
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

        {/* 🔒 Protected: lesson/qcm/coding pages */}
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
        <Route
          path="/course/:courseId/unit/:unitId/qcm"
          element={
            <ProtectedRoute>
              <QCMPage />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
