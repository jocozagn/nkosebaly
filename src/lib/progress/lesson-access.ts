import type { AdminData, AdminLesson } from "@/lib/admin/types";

/** Par défaut, les cours N'ko suivent un parcours chronologique */
export const courseHasSequentialAccess = (sequentialAccess?: boolean): boolean =>
  sequentialAccess !== false;

/** Leçons vidéo triées par chapitre puis ordre */
export const getOrderedVideoLessons = (data: AdminData, courseId: string): AdminLesson[] =>
  data.lessons
    .filter((l) => l.course_id === courseId && l.video_id)
    .sort((a, b) => {
      const chapterA = data.chapters.find((c) => c.id === a.chapter_id);
      const chapterB = data.chapters.find((c) => c.id === b.chapter_id);
      const chapterOrder = (chapterA?.order ?? 0) - (chapterB?.order ?? 0);
      if (chapterOrder !== 0) return chapterOrder;
      return a.order - b.order;
    });

/** Vérifie si une leçon est marquée terminée (≥ 90 % visionnage) */
export const isLessonCompleted = (data: AdminData, userId: string, lessonId: string): boolean =>
  data.lesson_progress.some(
    (p) => p.user_id === userId && p.lesson_id === lessonId && p.completed
  );

/** Détermine si l'élève peut accéder à une leçon */
export const isLessonUnlocked = (
  data: AdminData,
  userId: string,
  courseId: string,
  lessonId: string,
  sequentialAccess?: boolean
): boolean => {
  if (!courseHasSequentialAccess(sequentialAccess)) return true;

  const ordered = getOrderedVideoLessons(data, courseId);
  const index = ordered.findIndex((l) => l.id === lessonId);
  if (index < 0) return false;
  if (index === 0) return true;

  for (let i = 0; i < index; i++) {
    if (!isLessonCompleted(data, userId, ordered[i].id)) return false;
  }
  return true;
};
