import React, { createContext, useContext, useState } from "react";

const CourseContext = createContext(null);

export const CourseProvider = ({ children }) => {
  // Map: courseId -> { is_saved, is_favourite }
  const [courseState, setCourseState] = useState({});

  const setCourse = (courseId, data) => {
    setCourseState((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        ...data,
      },
    }));
  };

  return (
    <CourseContext.Provider value={{ courseState, setCourse }}>
      {children}
    </CourseContext.Provider>
  );
};

export const useCourse = () => {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used inside CourseProvider");
  return ctx;
};
