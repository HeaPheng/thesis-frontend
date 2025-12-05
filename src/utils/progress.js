// src/utils/progress.js

const key = (courseId) => `progress:${courseId}`;

export function getProgress(courseId) {
  try {
    return JSON.parse(localStorage.getItem(key(courseId))) || {};
  } catch {
    return {};
  }
}

export function setProgress(courseId, data) {
  localStorage.setItem(key(courseId), JSON.stringify(data));
}

// Ensure unit exists in storage with defaults
function ensureUnit(p, unitId) {
  p[unitId] =
    p[unitId] || {
      lessonUnlocked: 0, // max lesson index unlocked (0 means only lesson 0)
      codingUnlocked: false,
      qcmUnlocked: false,
      unitUnlocked: false, // gate for whole unit
    };
  return p[unitId];
}

/**
 * Unlock a unit (but does NOT unlock lessons beyond 0).
 * Use this when user passes previous unit.
 */
export function unlockUnit(courseId, unitId) {
  const p = getProgress(courseId);
  const u = ensureUnit(p, unitId);
  u.unitUnlocked = true;
  u.lessonUnlocked = Math.max(u.lessonUnlocked, 0);
  setProgress(courseId, p);
}

/**
 * Mark a lesson index as unlocked (keeps maximum).
 * Example: unlockLesson(courseId, unitId, 1) => lessons 0..1 open.
 */
export function unlockLesson(courseId, unitId, lessonIndex) {
  const p = getProgress(courseId);
  const u = ensureUnit(p, unitId);

  // if unit isn't unlocked yet, unlocking a lesson implies unit is unlocked
  u.unitUnlocked = true;

  u.lessonUnlocked = Math.max(u.lessonUnlocked, lessonIndex);
  setProgress(courseId, p);
}

export function unlockCoding(courseId, unitId) {
  const p = getProgress(courseId);
  const u = ensureUnit(p, unitId);
  u.unitUnlocked = true;
  u.codingUnlocked = true;
  setProgress(courseId, p);
}

export function unlockQCM(courseId, unitId) {
  const p = getProgress(courseId);
  const u = ensureUnit(p, unitId);
  u.unitUnlocked = true;
  u.qcmUnlocked = true;
  setProgress(courseId, p);
}

/**
 * Checks
 */
export function isUnitUnlocked(courseId, unitId, unitIndex) {
  const p = getProgress(courseId);
  const u = p[unitId];

  // Unit 0 is always unlocked by default
  if (unitIndex === 0) return true;

  return !!u && u.unitUnlocked === true;
}

export function canOpenLesson(courseId, unitId, unitIndex, lessonIndex) {
  // Unit must be unlocked (except first unit)
  if (!isUnitUnlocked(courseId, unitId, unitIndex)) return false;

  const p = getProgress(courseId);
  const u = p[unitId];

  // If no progress yet:
  // - allow lesson 0 only for unlocked units
  if (!u) return lessonIndex === 0;

  return lessonIndex <= u.lessonUnlocked;
}

export function canOpenCoding(courseId, unitId, unitIndex, lastLessonIndex) {
  // coding only after last lesson unlocked
  if (!isUnitUnlocked(courseId, unitId, unitIndex)) return false;

  const p = getProgress(courseId);
  const u = p[unitId];
  return !!u && u.lessonUnlocked >= lastLessonIndex;
}

export function canOpenQCM(courseId, unitId, unitIndex, hasCoding, lastLessonIndex) {
  if (!isUnitUnlocked(courseId, unitId, unitIndex)) return false;

  const p = getProgress(courseId);
  const u = p[unitId];

  if (!u) return false;

  // if unit has coding, QCM requires codingUnlocked
  if (hasCoding) return u.codingUnlocked === true;

  // if no coding, QCM opens after last lesson
  return u.lessonUnlocked >= lastLessonIndex;
}
