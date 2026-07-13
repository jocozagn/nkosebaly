import { promises as fs } from "fs";
import { deleteVideoFile } from "@/lib/videos/storage";
import { deleteAttachmentFile } from "@/lib/attachments/storage";
import path from "path";
import { isLessonUnlocked } from "@/lib/progress/lesson-access";
import { isPostgresEnabled } from "@/lib/db/config";
import {
  readAppDataFromPostgres,
  writeAppDataToPostgres,
} from "@/lib/db/app-data-repository";
import type {
  AdminCategory,
  AdminCertificate,
  AdminChapter,
  AdminCourse,
  AdminData,
  AdminLesson,
  AdminLessonAttachment,
  AdminLessonQuestion,
  AdminLessonReaction,
  AdminLessonQuizItem,
  AdminLicenseCard,
  AdminNotification,
  AdminNotificationType,
  AdminQuizQuestion,
  AdminSettings,
  AdminUser,
  PaymentStatus,
  StudentAuthSession,
  MobileAuthSession,
  StudentLessonProgress,
  StudentQuizAttempt,
  StudentProfileInput,
  WatchActivityPayload,
  AdminAnalyticsSummary,
  CardDurationMonths,
  LicenseOrder,
} from "./types";
import {
  applyWatchActivityBatch,
  buildAnalyticsSummary,
  recordWatchActivityOnData,
} from "./analytics";
import {
  DEFAULT_LICENSE_PLANS,
  getActiveLicensePlans,
  getDefaultLicensePlan,
  isValidLicenseDurationMonths,
  normalizeLicensePlans,
  resolveLicensePlanByDuration,
} from "@/lib/license/plans";

const DATA_DIR = path.join(process.cwd(), "data", "admin");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const DATA_FILE_TMP = path.join(DATA_DIR, "store.json.tmp");
const DATA_FILE_BACKUP = path.join(DATA_DIR, "store.backup.json");

const defaultSettings: AdminSettings = {
  app_name: "Karamoo Sêebaly",
  contact_email: "diallomoussa2003@gmail.com",
  contact_phone: "+224622873308",
  commission_rate: 10,
  instructor_auto_approve: false,
  license_price: 150000,
  license_duration_months: 3,
  license_plans: DEFAULT_LICENSE_PLANS,
  certificate_price: 50000,
  quiz_pass_threshold: 15,
  quiz_max_attempts: 3,
};

const defaultData: AdminData = {
  categories: [
    { id: "cat-1", name: "N'ko Mandingue", description: "Cours de langue N'ko", created_at: new Date().toISOString() },
  ],
  courses: [],
  chapters: [],
  lessons: [],
  lesson_attachments: [],
  lesson_questions: [],
  lesson_reactions: [],
  lesson_quiz_items: [],
  quiz_questions: [],
  license_cards: [],
  student_auth_sessions: [],
  mobile_auth_sessions: [],
  lesson_progress: [],
  student_daily_activity: [],
  content_watch_stats: [],
  quiz_attempts: [],
  lesson_quiz_attempts: [],
  users: [],
  certificates: [],
  notifications: [],
  license_orders: [],
  settings: defaultSettings,
};

/** Ajoute activation_token aux anciennes cartes */
const normalizeLicenseCards = (cards: AdminLicenseCard[]): AdminLicenseCard[] =>
  cards.map((c) => ({
    ...c,
    activation_token:
      c.activation_token ??
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    allowed_course_ids: Array.isArray(c.allowed_course_ids) ? c.allowed_course_ids : [],
    card_price_gnf: typeof c.card_price_gnf === "number" ? c.card_price_gnf : undefined,
    certificate_price_gnf: typeof c.certificate_price_gnf === "number" ? c.certificate_price_gnf : undefined,
  }));

/** Fusionne les anciennes données avec les nouveaux champs */
const normalizeData = (raw: Partial<AdminData>): AdminData => ({
  categories: raw.categories ?? defaultData.categories,
  courses: raw.courses ?? [],
  chapters: raw.chapters ?? [],
  lessons: raw.lessons ?? [],
  lesson_attachments: raw.lesson_attachments ?? [],
  lesson_questions: raw.lesson_questions ?? [],
  lesson_reactions: raw.lesson_reactions ?? [],
  lesson_quiz_items: raw.lesson_quiz_items ?? [],
  quiz_questions: raw.quiz_questions ?? [],
  license_cards: normalizeLicenseCards(raw.license_cards ?? []),
  student_auth_sessions: raw.student_auth_sessions ?? [],
  mobile_auth_sessions: (raw.mobile_auth_sessions ?? []) as MobileAuthSession[],
  lesson_progress: raw.lesson_progress ?? [],
  student_daily_activity: raw.student_daily_activity ?? [],
  content_watch_stats: raw.content_watch_stats ?? [],
  quiz_attempts: raw.quiz_attempts ?? [],
  lesson_quiz_attempts: raw.lesson_quiz_attempts ?? [],
  users: raw.users ?? [],
  certificates: raw.certificates ?? [],
  notifications: raw.notifications ?? [],
  license_orders: raw.license_orders ?? [],
  settings: normalizeAdminSettings({ ...defaultSettings, ...raw.settings }),
});

/** Paramètres admin — formules licence normalisées */
export const normalizeAdminSettings = (partial: AdminSettings): AdminSettings => {
  const merged = { ...defaultSettings, ...partial };
  const hasPlans = Array.isArray(merged.license_plans) && merged.license_plans.length > 0;
  return {
    ...merged,
    license_plans: hasPlans ? normalizeLicensePlans(merged) : DEFAULT_LICENSE_PLANS,
  };
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const tryParseStoreFile = async (filePath: string): Promise<AdminData | null> => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    if (!content.trim()) return null;
    return normalizeData(JSON.parse(content) as Partial<AdminData>);
  } catch {
    return null;
  }
};

export const readAdminData = async (): Promise<AdminData> => {
  // Phase Scale : backend PostgreSQL (snapshot JSONB) si activé
  if (isPostgresEnabled()) {
    const fromDb = await readAppDataFromPostgres();
    if (fromDb) return normalizeData(fromDb);
  }

  // Réessaye en cas de lecture pendant une écriture concurrente
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const data = await tryParseStoreFile(DATA_FILE);
    if (data) return data;
    if (attempt < 3) await sleep(40);
  }

  const backup = await tryParseStoreFile(DATA_FILE_BACKUP);
  if (backup) {
    await writeAdminData(backup);
    return backup;
  }

  try {
    await fs.access(DATA_FILE);
    throw new Error("store.json illisible");
  } catch {
    await writeAdminData(defaultData);
    return defaultData;
  }
};

export const writeAdminData = async (data: AdminData): Promise<void> => {
  // Phase Scale : écriture PostgreSQL + backup JSON local (sécurité transition)
  if (isPostgresEnabled()) {
    await writeAppDataToPostgres(data);
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const content = JSON.stringify(data, null, 2);

  try {
    await fs.copyFile(DATA_FILE, DATA_FILE_BACKUP);
  } catch {
    // Pas encore de fichier principal
  }

  await fs.writeFile(DATA_FILE_TMP, content, "utf-8");
  await fs.rename(DATA_FILE_TMP, DATA_FILE);
};

const syncLessonCount = (data: AdminData, courseId: string): void => {
  const course = data.courses.find((c) => c.id === courseId);
  if (!course) return;
  course.lessons_count = data.lessons.filter((l) => l.course_id === courseId).length;
  course.updated_at = new Date().toISOString();
};

// --- Cours ---
export const getCourses = async (): Promise<AdminCourse[]> => {
  const data = await readAdminData();
  let changed = false;

  for (const course of data.courses) {
    const count = data.lessons.filter((l) => l.course_id === course.id).length;
    if (course.lessons_count !== count) {
      course.lessons_count = count;
      changed = true;
    }
  }

  if (changed) await writeAdminData(data);
  return data.courses;
};
export const getCourseById = async (id: string): Promise<AdminCourse | undefined> =>
  (await readAdminData()).courses.find((c) => c.id === id);

export const saveCourse = async (course: AdminCourse): Promise<AdminCourse> => {
  const data = await readAdminData();
  const i = data.courses.findIndex((c) => c.id === course.id);

  // Le nombre de leçons est toujours calculé depuis le curriculum réel
  course.lessons_count = data.lessons.filter((l) => l.course_id === course.id).length;

  if (i >= 0) data.courses[i] = course;
  else data.courses.push(course);
  await writeAdminData(data);
  return course;
};

export const deleteCourse = async (id: string): Promise<boolean> => {
  const data = await readAdminData();
  const before = data.courses.length;
  data.courses = data.courses.filter((c) => c.id !== id);
  data.chapters = data.chapters.filter((c) => c.course_id !== id);
  data.lessons = data.lessons.filter((l) => l.course_id !== id);
  data.quiz_questions = data.quiz_questions.filter((q) => q.course_id !== id);
  data.quiz_attempts = data.quiz_attempts.filter((a) => a.course_id !== id);
  data.lesson_quiz_attempts = data.lesson_quiz_attempts.filter((a) => a.course_id !== id);
  await writeAdminData(data);
  return data.courses.length < before;
};

// --- Catégories ---
export const getCategories = async (): Promise<AdminCategory[]> => (await readAdminData()).categories;
export const saveCategory = async (category: AdminCategory): Promise<AdminCategory> => {
  const data = await readAdminData();
  const i = data.categories.findIndex((c) => c.id === category.id);
  if (i >= 0) data.categories[i] = category; else data.categories.push(category);
  await writeAdminData(data);
  return category;
};

// --- Chapitres & leçons ---
export const getChaptersByCourse = async (courseId: string): Promise<AdminChapter[]> =>
  (await readAdminData()).chapters.filter((c) => c.course_id === courseId).sort((a, b) => a.order - b.order);

export const saveChapter = async (chapter: AdminChapter): Promise<AdminChapter> => {
  const data = await readAdminData();
  const i = data.chapters.findIndex((c) => c.id === chapter.id);
  if (i >= 0) data.chapters[i] = chapter; else data.chapters.push(chapter);
  await writeAdminData(data);
  return chapter;
};

export const deleteChapter = async (id: string): Promise<void> => {
  const data = await readAdminData();
  const chapter = data.chapters.find((c) => c.id === id);
  const removedLessons = data.lessons.filter((l) => l.chapter_id === id);
  for (const lesson of removedLessons) {
    if (lesson.video_id) await deleteVideoFile(lesson.video_id);
  }
  data.chapters = data.chapters.filter((c) => c.id !== id);
  data.lessons = data.lessons.filter((l) => l.chapter_id !== id);
  if (chapter) syncLessonCount(data, chapter.course_id);
  await writeAdminData(data);
};

export const getLessonsByCourse = async (courseId: string): Promise<AdminLesson[]> =>
  (await readAdminData()).lessons.filter((l) => l.course_id === courseId).sort((a, b) => a.order - b.order);

/** Toutes les données curriculum en une seule lecture (évite la tempête de requêtes) */
export const getCurriculumBundle = async (courseId: string) => {
  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId);
  if (!course) return null;

  const chapters = data.chapters
    .filter((c) => c.course_id === courseId)
    .sort((a, b) => a.order - b.order);

  const lessons = data.lessons
    .filter((l) => l.course_id === courseId)
    .sort((a, b) => a.order - b.order);

  const attachmentsByLesson: Record<string, AdminLessonAttachment[]> = {};
  for (const att of data.lesson_attachments.filter((a) => a.course_id === courseId)) {
    if (!attachmentsByLesson[att.lesson_id]) attachmentsByLesson[att.lesson_id] = [];
    attachmentsByLesson[att.lesson_id].push(att);
  }
  for (const lessonId of Object.keys(attachmentsByLesson)) {
    attachmentsByLesson[lessonId].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  const questionsByLesson: Record<string, AdminLessonQuestion[]> = {};
  for (const q of data.lesson_questions.filter((item) => item.course_id === courseId)) {
    if (!questionsByLesson[q.lesson_id]) questionsByLesson[q.lesson_id] = [];
    questionsByLesson[q.lesson_id].push(q);
  }
  for (const lessonId of Object.keys(questionsByLesson)) {
    questionsByLesson[lessonId].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const quizItemsByLesson: Record<string, AdminLessonQuizItem[]> = {};
  for (const item of data.lesson_quiz_items.filter((q) => q.course_id === courseId)) {
    if (!quizItemsByLesson[item.lesson_id]) quizItemsByLesson[item.lesson_id] = [];
    quizItemsByLesson[item.lesson_id].push(item);
  }
  for (const lessonId of Object.keys(quizItemsByLesson)) {
    quizItemsByLesson[lessonId].sort((a, b) => a.order - b.order);
  }

  return { course, chapters, lessons, attachmentsByLesson, questionsByLesson, quizItemsByLesson };
};

export const saveLesson = async (lesson: AdminLesson): Promise<AdminLesson> => {
  const data = await readAdminData();
  const i = data.lessons.findIndex((l) => l.id === lesson.id);
  if (i >= 0) data.lessons[i] = lesson; else data.lessons.push(lesson);
  syncLessonCount(data, lesson.course_id);
  await writeAdminData(data);
  return lesson;
};

/** Met à jour une leçon (titre, chapitre, vidéo, durée) */
export const updateLesson = async (
  id: string,
  updates: {
    title?: string;
    chapter_id?: string;
    video_id?: string;
    duration_minutes?: number;
  }
): Promise<AdminLesson | null> => {
  const data = await readAdminData();
  const index = data.lessons.findIndex((l) => l.id === id);
  if (index < 0) return null;

  const current = data.lessons[index];
  const nextVideoId = updates.video_id ?? current.video_id;

  // Supprime l'ancienne vidéo si une nouvelle est uploadée
  if (updates.video_id && updates.video_id !== current.video_id && current.video_id) {
    await deleteVideoFile(current.video_id);
  }

  const updated: AdminLesson = {
    ...current,
    title: updates.title?.trim() || current.title,
    chapter_id: updates.chapter_id ?? current.chapter_id,
    video_id: nextVideoId,
    duration_minutes: Math.max(1, updates.duration_minutes ?? current.duration_minutes),
  };

  data.lessons[index] = updated;
  syncLessonCount(data, current.course_id);
  await writeAdminData(data);
  return updated;
};

export const deleteLesson = async (id: string): Promise<void> => {
  const data = await readAdminData();
  const lesson = data.lessons.find((l) => l.id === id);
  if (lesson?.video_id) await deleteVideoFile(lesson.video_id);

  const attachments = data.lesson_attachments.filter((a) => a.lesson_id === id);
  for (const att of attachments) {
    await deleteAttachmentFile(att.file_id, att.mime_type);
  }

  data.lessons = data.lessons.filter((l) => l.id !== id);
  data.lesson_attachments = data.lesson_attachments.filter((a) => a.lesson_id !== id);
  data.lesson_questions = data.lesson_questions.filter((q) => q.lesson_id !== id);
  data.lesson_reactions = data.lesson_reactions.filter((r) => r.lesson_id !== id);
  data.lesson_quiz_items = data.lesson_quiz_items.filter((q) => q.lesson_id !== id);
  data.lesson_quiz_attempts = data.lesson_quiz_attempts.filter((a) => a.lesson_id !== id);

  if (lesson) syncLessonCount(data, lesson.course_id);
  await writeAdminData(data);
};

// --- Pièces jointes leçon ---
export const getLessonAttachments = async (lessonId: string): Promise<AdminLessonAttachment[]> =>
  (await readAdminData())
    .lesson_attachments.filter((a) => a.lesson_id === lessonId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

export const saveLessonAttachment = async (
  attachment: AdminLessonAttachment
): Promise<AdminLessonAttachment> => {
  const data = await readAdminData();
  data.lesson_attachments.push(attachment);
  await writeAdminData(data);
  return attachment;
};

export const deleteLessonAttachment = async (id: string): Promise<void> => {
  const data = await readAdminData();
  const att = data.lesson_attachments.find((a) => a.id === id);
  if (att) await deleteAttachmentFile(att.file_id, att.mime_type);
  data.lesson_attachments = data.lesson_attachments.filter((a) => a.id !== id);
  await writeAdminData(data);
};

export const getLessonAttachmentById = async (id: string): Promise<AdminLessonAttachment | undefined> =>
  (await readAdminData()).lesson_attachments.find((a) => a.id === id);

// --- Questions leçon ---
export const getLessonQuestions = async (lessonId: string): Promise<AdminLessonQuestion[]> =>
  (await readAdminData())
    .lesson_questions.filter((q) => q.lesson_id === lessonId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

export const addLessonQuestion = async (question: AdminLessonQuestion): Promise<AdminLessonQuestion> => {
  const data = await readAdminData();
  data.lesson_questions.push(question);

  const lesson = data.lessons.find((l) => l.id === question.lesson_id);
  const course = data.courses.find((c) => c.id === question.course_id);

  pushAdminNotification(data, {
    type: "lesson_question",
    title: "Nouvelle question élève",
    message: `${question.author_name} sur « ${lesson?.title ?? "leçon"} » (${course?.title ?? "cours"})`,
    link: `/admin/courses/${question.course_id}/curriculum`,
    metadata: { question_id: question.id, lesson_id: question.lesson_id },
  });

  await writeAdminData(data);
  return question;
};

export const getLessonQuestionsByCourse = async (courseId: string): Promise<AdminLessonQuestion[]> =>
  (await readAdminData())
    .lesson_questions.filter((q) => q.course_id === courseId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

export const replyToLessonQuestion = async (
  questionId: string,
  reply: string
): Promise<AdminLessonQuestion | null> => {
  const data = await readAdminData();
  const question = data.lesson_questions.find((q) => q.id === questionId);
  if (!question) return null;

  question.admin_reply = reply;
  question.admin_replied_at = new Date().toISOString();
  await writeAdminData(data);
  return question;
};

// --- Réactions like / dislike ---
export const getLessonReactionStats = async (
  lessonId: string,
  voterId?: string
): Promise<{ likes: number; dislikes: number; user_vote: "like" | "dislike" | null }> => {
  const votes = (await readAdminData()).lesson_reactions.filter((r) => r.lesson_id === lessonId);
  const likes = votes.filter((v) => v.vote === "like").length;
  const dislikes = votes.filter((v) => v.vote === "dislike").length;
  const userVote = voterId ? votes.find((v) => v.voter_id === voterId)?.vote ?? null : null;
  return { likes, dislikes, user_vote: userVote };
};

export const setLessonReaction = async (
  lessonId: string,
  voterId: string,
  vote: "like" | "dislike"
): Promise<{ likes: number; dislikes: number; user_vote: "like" | "dislike" }> => {
  const data = await readAdminData();
  const existing = data.lesson_reactions.find((r) => r.lesson_id === lessonId && r.voter_id === voterId);

  if (existing) {
    existing.vote = vote;
    existing.created_at = new Date().toISOString();
  } else {
    data.lesson_reactions.push({
      id: crypto.randomUUID(),
      lesson_id: lessonId,
      voter_id: voterId,
      vote,
      created_at: new Date().toISOString(),
    });
  }

  await writeAdminData(data);
  const stats = await getLessonReactionStats(lessonId, voterId);
  return { likes: stats.likes, dislikes: stats.dislikes, user_vote: vote };
};

// --- Quiz ---
export const getQuizQuestions = async (courseId?: string): Promise<AdminQuizQuestion[]> => {
  const data = await readAdminData();
  return courseId ? data.quiz_questions.filter((q) => q.course_id === courseId) : data.quiz_questions;
};

export const saveQuizQuestion = async (q: AdminQuizQuestion): Promise<AdminQuizQuestion> => {
  const data = await readAdminData();
  const i = data.quiz_questions.findIndex((x) => x.id === q.id);
  if (i >= 0) data.quiz_questions[i] = q; else data.quiz_questions.push(q);
  await writeAdminData(data);
  return q;
};

export const deleteQuizQuestion = async (id: string): Promise<void> => {
  const data = await readAdminData();
  data.quiz_questions = data.quiz_questions.filter((q) => q.id !== id);
  await writeAdminData(data);
};

// --- Quiz de leçon (exercices par leçon) ---
export const getLessonQuizItems = async (lessonId: string): Promise<AdminLessonQuizItem[]> =>
  (await readAdminData())
    .lesson_quiz_items.filter((item) => item.lesson_id === lessonId && item.active)
    .sort((a, b) => a.order - b.order);

export const getLessonQuizItemsAdmin = async (lessonId: string): Promise<AdminLessonQuizItem[]> =>
  (await readAdminData())
    .lesson_quiz_items.filter((item) => item.lesson_id === lessonId)
    .sort((a, b) => a.order - b.order);

export const saveLessonQuizItem = async (item: AdminLessonQuizItem): Promise<AdminLessonQuizItem> => {
  const data = await readAdminData();
  const index = data.lesson_quiz_items.findIndex((x) => x.id === item.id);
  if (index >= 0) data.lesson_quiz_items[index] = item;
  else data.lesson_quiz_items.push(item);
  await writeAdminData(data);
  return item;
};

export const deleteLessonQuizItem = async (id: string): Promise<void> => {
  const data = await readAdminData();
  data.lesson_quiz_items = data.lesson_quiz_items.filter((item) => item.id !== id);
  await writeAdminData(data);
};

const getLessonQuizPassScore = (total: number): number =>
  total === 0 ? 0 : Math.max(1, Math.ceil(total * 0.7));

/** Meilleure tentative d'exercice pour une leçon (score le plus élevé) */
export const getBestLessonQuizAttempt = (
  data: AdminData,
  userId: string,
  lessonId: string
): import("./types").StudentLessonQuizAttempt | undefined =>
  data.lesson_quiz_attempts
    .filter((a) => a.user_id === userId && a.lesson_id === lessonId)
    .sort((a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at))[0];

const saveLessonQuizAttempt = async (
  userId: string,
  courseId: string,
  lessonId: string,
  result: {
    score: number;
    total: number;
    passed: boolean;
    pass_required: number;
    details: { item_id: string; correct: boolean }[];
  }
): Promise<void> => {
  const data = await readAdminData();
  data.lesson_quiz_attempts.push({
    id: crypto.randomUUID(),
    user_id: userId,
    course_id: courseId,
    lesson_id: lessonId,
    score: result.score,
    total: result.total,
    passed: result.passed,
    pass_required: result.pass_required,
    details: result.details,
    created_at: new Date().toISOString(),
  });
  await writeAdminData(data);
};

const gradeStudentLessonQuizAnswers = async (
  courseId: string,
  lessonId: string,
  answers: import("./types").StudentLessonQuizAnswerPayload[]
): Promise<
  | {
      score: number;
      total: number;
      passed: boolean;
      pass_required: number;
      details: { item_id: string; correct: boolean }[];
    }
  | { error: string }
> => {
  const { gradeLessonQuizAnswer } = await import("@/lib/quiz/lesson-quiz");
  const data = await readAdminData();
  const items = data.lesson_quiz_items
    .filter((item) => item.lesson_id === lessonId && item.course_id === courseId && item.active)
    .sort((a, b) => a.order - b.order);

  if (items.length === 0) return { error: "Aucun exercice pour cette leçon" };

  const itemIds = new Set(items.map((item) => item.id));
  const validAnswers = answers.filter((a) => itemIds.has(a.item_id));
  if (validAnswers.length !== items.length) {
    return { error: "Veuillez répondre à tous les exercices" };
  }

  const details = items.map((item) => {
    const answer = validAnswers.find((a) => a.item_id === item.id)!;
    return { item_id: item.id, correct: gradeLessonQuizAnswer(item, answer) };
  });

  const score = details.filter((d) => d.correct).length;
  const total = items.length;
  const passRequired = getLessonQuizPassScore(total);

  return {
    score,
    total,
    passed: score >= passRequired,
    pass_required: passRequired,
    details,
  };
};

export const submitStudentLessonQuiz = async (
  authToken: string,
  courseId: string,
  lessonId: string,
  answers: import("./types").StudentLessonQuizAnswerPayload[]
): Promise<
  | {
      score: number;
      total: number;
      passed: boolean;
      pass_required: number;
      details: { item_id: string; correct: boolean }[];
    }
  | { error: string }
> => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return { error: "Profil introuvable" };

  const access = await canStudentAccessLesson(authToken, courseId, lessonId);
  if (!access.allowed) return { error: access.reason ?? "Accès refusé" };

  const result = await gradeStudentLessonQuizAnswers(courseId, lessonId, answers);
  if ("error" in result) return result;

  await saveLessonQuizAttempt(user.id, courseId, lessonId, result);
  return result;
};

export const submitStudentLessonQuizByUserId = async (
  userId: string,
  courseId: string,
  lessonId: string,
  answers: import("./types").StudentLessonQuizAnswerPayload[]
): Promise<
  | {
      score: number;
      total: number;
      passed: boolean;
      pass_required: number;
      details: { item_id: string; correct: boolean }[];
    }
  | { error: string }
> => {
  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId && c.status === "published");
  if (!course) return { error: "Cours introuvable" };

  const lesson = data.lessons.find((l) => l.id === lessonId && l.course_id === courseId);
  if (!lesson) return { error: "Leçon introuvable" };

  if (!isLessonUnlocked(data, userId, courseId, lessonId, course.sequential_access)) {
    return { error: "Leçon verrouillée" };
  }

  const result = await gradeStudentLessonQuizAnswers(courseId, lessonId, answers);
  if ("error" in result) return result;

  await saveLessonQuizAttempt(userId, courseId, lessonId, result);
  return result;
};

export const getStudentLessonQuizForPlayback = async (
  courseId: string,
  lessonId: string,
  mediaUrlBuilder: (file: { file_id: string; mime_type: string }) => string
) => {
  const { stripLessonQuizItemForStudent } = await import("@/lib/quiz/lesson-quiz");
  const data = await readAdminData();
  const items = data.lesson_quiz_items
    .filter((item) => item.lesson_id === lessonId && item.course_id === courseId && item.active)
    .sort((a, b) => a.order - b.order);

  return items.map((item) => stripLessonQuizItemForStudent(item, mediaUrlBuilder));
};

/** Questions actives d'un cours pour le quiz élève (sans réponses) */
export const getQuizPassRequired = (totalQuestions: number, threshold: number): number => {
  if (totalQuestions === 0) return 0;
  return Math.max(1, Math.ceil((threshold / 20) * totalQuestions));
};

/** Questions actives d'un cours pour le quiz élève (sans réponses) */
export const getStudentQuizQuestions = async (courseId: string) => {
  const data = await readAdminData();
  const questions = data.quiz_questions
    .filter((q) => q.course_id === courseId && q.active)
    .sort(() => Math.random() - 0.5)
    .map((q) => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options,
      category: q.category,
      difficulty: q.difficulty,
    }));
  return questions;
};

export const getQuizAttemptsByUser = async (
  userId: string,
  courseId: string
): Promise<StudentQuizAttempt[]> =>
  (await readAdminData())
    .quiz_attempts.filter((a) => a.user_id === userId && a.course_id === courseId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

/** État du quiz pour un élève sur un cours */
export const getStudentQuizState = async (authToken: string, courseId: string) => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return null;

  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId && c.status === "published");
  if (!course) return null;

  const activeCount = data.quiz_questions.filter((q) => q.course_id === courseId && q.active).length;
  const courseProgress = calculateCourseProgressPercent(data, user.id, courseId);
  const attempts = data.quiz_attempts.filter((a) => a.user_id === user.id && a.course_id === courseId);
  const passedAttempt = attempts.find((a) => a.passed);
  const maxAttempts = data.settings.quiz_max_attempts;
  const passThreshold = data.settings.quiz_pass_threshold;
  const passRequired = getQuizPassRequired(activeCount, passThreshold);
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;

  const lessonsComplete = courseProgress.total > 0 && courseProgress.percent >= 100;
  const canAttempt =
    activeCount > 0 &&
    lessonsComplete &&
    !passedAttempt &&
    attempts.length < maxAttempts;

  return {
    course: { id: course.id, title: course.title },
    question_count: activeCount,
    course_progress_percent: courseProgress.percent,
    lessons_complete: lessonsComplete,
    attempts_used: attempts.length,
    max_attempts: maxAttempts,
    pass_threshold: passThreshold,
    pass_required_score: passRequired,
    best_score: bestScore,
    passed: Boolean(passedAttempt),
    can_attempt: canAttempt,
    last_attempt: attempts[0] ?? null,
  };
};

/**
 * Mobile: état du quiz pour un élève identifié par device_id (X-Mobile-Token → deviceId stable).
 * On duplique la logique pour éviter de dépendre des cookies web (auth_token).
 */
export const getStudentQuizStateByDeviceId = async (deviceId: string, courseId: string) => {
  const user = await getStudentUserByDeviceId(deviceId);
  if (!user) return null;

  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId && c.status === "published");
  if (!course) return null;

  const activeCount = data.quiz_questions.filter((q) => q.course_id === courseId && q.active).length;
  const courseProgress = calculateCourseProgressPercent(data, user.id, courseId);
  const attempts = data.quiz_attempts.filter((a) => a.user_id === user.id && a.course_id === courseId);
  const passedAttempt = attempts.find((a) => a.passed);
  const maxAttempts = data.settings.quiz_max_attempts;
  const passThreshold = data.settings.quiz_pass_threshold;
  const passRequired = getQuizPassRequired(activeCount, passThreshold);
  const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;

  const lessonsComplete = courseProgress.total > 0 && courseProgress.percent >= 100;
  const canAttempt =
    activeCount > 0 &&
    lessonsComplete &&
    !passedAttempt &&
    attempts.length < maxAttempts;

  return {
    course: { id: course.id, title: course.title },
    question_count: activeCount,
    course_progress_percent: courseProgress.percent,
    lessons_complete: lessonsComplete,
    attempts_used: attempts.length,
    max_attempts: maxAttempts,
    pass_threshold: passThreshold,
    pass_required_score: passRequired,
    best_score: bestScore,
    passed: Boolean(passedAttempt),
    can_attempt: canAttempt,
    last_attempt: attempts[0] ?? null,
  };
};

/** Soumet et corrige un quiz */
export const submitStudentQuiz = async (
  authToken: string,
  courseId: string,
  answers: { question_id: string; selected: number }[]
): Promise<{
  score: number;
  total: number;
  passed: boolean;
  pass_required: number;
  attempts_used: number;
  max_attempts: number;
  details: { question_id: string; selected: number; correct: boolean }[];
} | { error: string }> => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return { error: "Profil introuvable" };

  const data = await readAdminData();
  const state = await getStudentQuizState(authToken, courseId);
  if (!state) return { error: "Cours introuvable" };
  if (!state.can_attempt) return { error: "Quiz non disponible ou tentatives épuisées" };

  const questions = data.quiz_questions.filter((q) => q.course_id === courseId && q.active);
  if (questions.length === 0) return { error: "Aucune question disponible" };

  const questionIds = new Set(questions.map((q) => q.id));
  const validAnswers = answers.filter((a) => questionIds.has(a.question_id));

  if (validAnswers.length !== questions.length) {
    return { error: "Veuillez répondre à toutes les questions" };
  }

  const details = validAnswers.map((a) => {
    const q = questions.find((item) => item.id === a.question_id)!;
    const correct = a.selected === q.correct_answer;
    return { question_id: a.question_id, selected: a.selected, correct };
  });

  const score = details.filter((d) => d.correct).length;
  const total = questions.length;
  const passRequired = getQuizPassRequired(total, data.settings.quiz_pass_threshold);
  const passed = score >= passRequired;

  const attempt: StudentQuizAttempt = {
    id: crypto.randomUUID(),
    user_id: user.id,
    course_id: courseId,
    score,
    total,
    passed,
    answers: details,
    created_at: new Date().toISOString(),
  };

  data.quiz_attempts.push(attempt);
  await writeAdminData(data);

  const attemptsUsed = data.quiz_attempts.filter(
    (a) => a.user_id === user.id && a.course_id === courseId
  ).length;

  return {
    score,
    total,
    passed,
    pass_required: passRequired,
    attempts_used: attemptsUsed,
    max_attempts: data.settings.quiz_max_attempts,
    details,
  };
};

/**
 * Mobile: soumission quiz par device_id.
 * Même règles: leçons terminées, tentatives max, toutes les réponses requises.
 */
export const submitStudentQuizByDeviceId = async (
  deviceId: string,
  courseId: string,
  answers: { question_id: string; selected: number }[]
): Promise<{
  score: number;
  total: number;
  passed: boolean;
  pass_required: number;
  attempts_used: number;
  max_attempts: number;
  details: { question_id: string; selected: number; correct: boolean }[];
} | { error: string }> => {
  const user = await getStudentUserByDeviceId(deviceId);
  if (!user) return { error: "Profil introuvable" };

  const data = await readAdminData();
  const state = await getStudentQuizStateByDeviceId(deviceId, courseId);
  if (!state) return { error: "Cours introuvable" };
  if (!state.can_attempt) return { error: "Quiz non disponible ou tentatives épuisées" };

  const questions = data.quiz_questions.filter((q) => q.course_id === courseId && q.active);
  if (questions.length === 0) return { error: "Aucune question disponible" };

  const questionIds = new Set(questions.map((q) => q.id));
  const validAnswers = answers.filter((a) => questionIds.has(a.question_id));

  if (validAnswers.length !== questions.length) {
    return { error: "Veuillez répondre à toutes les questions" };
  }

  const details = validAnswers.map((a) => {
    const q = questions.find((item) => item.id === a.question_id)!;
    const correct = a.selected === q.correct_answer;
    return { question_id: a.question_id, selected: a.selected, correct };
  });

  const score = details.filter((d) => d.correct).length;
  const total = questions.length;
  const passRequired = getQuizPassRequired(total, data.settings.quiz_pass_threshold);
  const passed = score >= passRequired;

  const attempt: StudentQuizAttempt = {
    id: crypto.randomUUID(),
    user_id: user.id,
    course_id: courseId,
    score,
    total,
    passed,
    answers: details,
    created_at: new Date().toISOString(),
  };

  data.quiz_attempts.push(attempt);
  await writeAdminData(data);

  const attemptsUsed = data.quiz_attempts.filter(
    (a) => a.user_id === user.id && a.course_id === courseId
  ).length;

  return {
    score,
    total,
    passed,
    pass_required: passRequired,
    attempts_used: attemptsUsed,
    max_attempts: data.settings.quiz_max_attempts,
    details,
  };
};

// --- Notifications admin ---
const pushAdminNotification = (
  data: AdminData,
  input: {
    type: AdminNotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, string>;
  }
): AdminNotification => {
  const notification: AdminNotification = {
    id: crypto.randomUUID(),
    type: input.type,
    title: input.title,
    message: input.message,
    read: false,
    link: input.link,
    metadata: input.metadata,
    created_at: new Date().toISOString(),
  };
  data.notifications.unshift(notification);
  if (data.notifications.length > 100) {
    data.notifications = data.notifications.slice(0, 100);
  }
  return notification;
};

export const getAdminNotifications = async (): Promise<AdminNotification[]> => {
  const data = await readAdminData();
  return data.notifications;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const data = await readAdminData();
  return data.notifications.filter((n) => !n.read).length;
};

export const markNotificationRead = async (id: string): Promise<boolean> => {
  const data = await readAdminData();
  const notification = data.notifications.find((n) => n.id === id);
  if (!notification) return false;
  notification.read = true;
  await writeAdminData(data);
  return true;
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const data = await readAdminData();
  for (const n of data.notifications) n.read = true;
  await writeAdminData(data);
};

/** Enregistre ou met à jour le profil élève après activation */
export const registerStudentProfile = async (
  deviceId: string,
  licenseCardId: string,
  profile: StudentProfileInput,
  options?: { notifyAdmin?: boolean }
): Promise<AdminUser> => {
  const data = await readAdminData();
  const now = new Date().toISOString();
  let user = data.users.find((u) => u.device_id === deviceId);
  const isNewUser = !user;

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      city: profile.city,
      occupation: profile.occupation,
      profile_completed: true,
      device_id: deviceId,
      license_card_id: licenseCardId,
      enrolled_course_ids: [],
      progress_percent: 0,
      created_at: now,
    };
    data.users.push(user);
  } else {
    user.name = profile.name;
    user.phone = profile.phone;
    user.email = profile.email;
    user.city = profile.city;
    user.occupation = profile.occupation;
    user.profile_completed = true;
    user.license_card_id = licenseCardId;
  }

  if (options?.notifyAdmin !== false && isNewUser) {
    const card = data.license_cards.find((c) => c.id === licenseCardId);
    pushAdminNotification(data, {
      type: "license_activated",
      title: "Nouvelle activation licence",
      message: `${profile.name} (${profile.phone}) a activé sa carte${card ? ` · ${card.duration_months} mois` : ""}`,
      link: "/admin/users",
      metadata: { user_id: user.id, license_card_id: licenseCardId },
    });
  }

  await writeAdminData(data);
  return user;
};

/** Vérifie si le profil élève est complet */
export const isStudentProfileComplete = (user: AdminUser): boolean =>
  Boolean(user.profile_completed && user.name && user.phone);

export const getStudentProfileByAuthToken = async (
  authToken: string
): Promise<AdminUser | null> => getStudentUserByAuthToken(authToken);

// --- Cartes licence ---
export const getLicenseCards = async (): Promise<AdminLicenseCard[]> => (await readAdminData()).license_cards;

export const saveLicenseCard = async (card: AdminLicenseCard): Promise<AdminLicenseCard> => {
  const data = await readAdminData();
  const i = data.license_cards.findIndex((c) => c.id === card.id);
  if (i >= 0) data.license_cards[i] = card; else data.license_cards.push(card);
  await writeAdminData(data);
  return card;
};

/**
 * Révoque (détache) une carte de son appareil actuel.
 * Cas d'usage: téléphone perdu/volé → permettre réactivation sur un autre téléphone.
 *
 * Politique: 1 carte = 1 téléphone à la fois.
 * Donc on remet la carte en "unused" et on efface device_id / dates d'activation.
 * On supprime aussi les sessions web liées à cette carte (règle "1 personne à la fois").
 */
export const revokeLicenseCardDevice = async (cardId: string): Promise<AdminLicenseCard | null> => {
  const data = await readAdminData();
  const card = data.license_cards.find((c) => c.id === cardId);
  if (!card) return null;

  // On libère la carte pour réactivation sur un autre téléphone.
  card.status = "unused";
  card.device_id = undefined;
  card.activated_at = undefined;
  card.expires_at = undefined;

  // On supprime toutes les sessions web associées à cette carte.
  data.student_auth_sessions = data.student_auth_sessions.filter((s) => s.license_card_id !== cardId);

  await writeAdminData(data);
  return card;
};

export const generateLicenseCards = async (
  count: number,
  durationMonths: CardDurationMonths,
  options?: {
    allowed_course_ids?: string[];
    card_price_gnf?: number;
    certificate_price_gnf?: number;
  }
): Promise<AdminLicenseCard[]> => {
  const data = await readAdminData();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const created: AdminLicenseCard[] = [];

  const randomBlock = (len: number): string =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  for (let n = 0; n < count; n++) {
    created.push({
      id: crypto.randomUUID(),
      code_text: `NKO-${randomBlock(4)}-${randomBlock(4)}`,
      activation_token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      duration_months: durationMonths,
      allowed_course_ids: options?.allowed_course_ids ?? [],
      card_price_gnf: options?.card_price_gnf,
      certificate_price_gnf: options?.certificate_price_gnf,
      status: "unused",
      created_at: new Date().toISOString(),
    });
  }

  data.license_cards.push(...created);
  await writeAdminData(data);
  return created;
};

/** Activation licence via scan QR (app mobile) */
export const activateLicenseCard = async (
  cardId: string,
  activationToken: string,
  deviceId: string
): Promise<{ success: true; card: AdminLicenseCard } | { success: false; message: string }> => {
  const data = await readAdminData();
  const card = data.license_cards.find((c) => c.id === cardId);

  if (!card) return { success: false, message: "Carte licence invalide" };
  if (card.activation_token !== activationToken) return { success: false, message: "QR code invalide ou falsifié" };
  if (card.status === "disabled") return { success: false, message: "Cette carte a été désactivée" };
  if (card.status === "expired") return { success: false, message: "Cette carte a expiré" };
  if (card.status === "active") {
    if (card.expires_at && new Date(card.expires_at) <= new Date()) {
      card.status = "expired";
      await writeAdminData(data);
      return { success: false, message: "Cette carte a expiré" };
    }
    if (card.device_id === deviceId) return { success: true, card };
    return { success: false, message: "Cette carte est déjà activée sur un autre appareil" };
  }

  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + card.duration_months);

  card.status = "active";
  card.device_id = deviceId;
  card.activated_at = now.toISOString();
  card.expires_at = expires.toISOString();

  await writeAdminData(data);
  return { success: true, card };
};

/** Activation licence par code texte (NKO-XXXX-XXXX) — sans scan QR */
export const activateLicenseByCodeText = async (
  codeText: string,
  deviceId: string
): Promise<{ success: true; card: AdminLicenseCard } | { success: false; message: string }> => {
  const { normalizeLicenseCodeText } = await import("@/lib/license/code-text");
  const normalized = normalizeLicenseCodeText(codeText);
  if (!normalized) {
    return { success: false, message: "Code invalide. Format attendu : NKO-XXXX-XXXX" };
  }

  const data = await readAdminData();
  const card = data.license_cards.find((c) => c.code_text.toUpperCase() === normalized);
  if (!card) return { success: false, message: "Code licence introuvable" };
  if (card.status === "disabled") return { success: false, message: "Cette licence a été désactivée" };
  if (card.status === "expired") return { success: false, message: "Cette licence a expiré" };
  if (card.status === "active") {
    if (card.expires_at && new Date(card.expires_at) <= new Date()) {
      card.status = "expired";
      await writeAdminData(data);
      return { success: false, message: "Cette licence a expiré" };
    }
    if (card.device_id === deviceId) return { success: true, card };
    return { success: false, message: "Cette licence est déjà utilisée sur un autre appareil" };
  }

  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + card.duration_months);

  card.status = "active";
  card.device_id = deviceId;
  card.activated_at = now.toISOString();
  card.expires_at = expires.toISOString();

  await writeAdminData(data);
  return { success: true, card };
};

/** Vérifie qu'une carte licence donne encore accès */
export const isLicenseCardValid = (card: AdminLicenseCard): boolean => {
  if (card.status !== "active") return false;
  if (!card.expires_at) return true;
  return new Date(card.expires_at) > new Date();
};

/** Lie la session web (cookie auth) à une carte licence activée */
export const linkStudentAuthSession = async (
  authToken: string,
  deviceId: string,
  licenseCardId: string
): Promise<StudentAuthSession> => {
  const data = await readAdminData();
  // Règle "1 personne à la fois" côté web :
  // on supprime toutes les sessions web existantes pour cette carte (même si ouverture dans un autre navigateur).
  data.student_auth_sessions = data.student_auth_sessions.filter(
    (s) => s.license_card_id !== licenseCardId
  );

  const session: StudentAuthSession = {
    auth_token: authToken,
    device_id: deviceId,
    license_card_id: licenseCardId,
    linked_at: new Date().toISOString(),
  };
  data.student_auth_sessions.push(session);

  const user = data.users.find((u) => u.device_id === deviceId);
  if (user) {
    user.license_card_id = licenseCardId;
  }

  await writeAdminData(data);
  return session;
};

/** Licence active pour un appareil mobile (sans cookie web) */
export const getActiveLicenseByDeviceId = async (
  deviceId: string
): Promise<{ card: AdminLicenseCard; user: AdminUser | null } | null> => {
  const data = await readAdminData();
  const card = data.license_cards.find((c) => c.device_id === deviceId);
  if (!card || !isLicenseCardValid(card)) return null;
  const user = data.users.find((u) => u.device_id === deviceId) ?? null;
  return { card, user };
};

/** Cours autorisés par une carte licence (vide = tous) */
export const getAllowedCourseIdsForCard = (card: AdminLicenseCard): string[] | null => {
  if (!Array.isArray(card.allowed_course_ids)) return null;
  if (card.allowed_course_ids.length === 0) return null;
  return card.allowed_course_ids;
};

/** Session web étudiante liée au cookie auth (sans vérifier la licence) */
export const getStudentAuthSessionByToken = async (
  authToken: string
): Promise<StudentAuthSession | null> => {
  const data = await readAdminData();
  return data.student_auth_sessions.find((s) => s.auth_token === authToken) ?? null;
};

/** Récupère la licence active liée au cookie auth étudiant */
export const getStudentLicenseByAuthToken = async (
  authToken: string
): Promise<{ card: AdminLicenseCard; session: StudentAuthSession } | null> => {
  const session = await getStudentAuthSessionByToken(authToken);
  if (!session) return null;

  const data = await readAdminData();

  const card = data.license_cards.find((c) => c.id === session.license_card_id);
  if (!card || !isLicenseCardValid(card)) return null;
  if (card.device_id && card.device_id !== session.device_id) return null;

  return { card, session };
};

/** Crée une session mobile (token) pour une carte licence */
export const createMobileAuthSession = async (licenseCardId: string): Promise<MobileAuthSession> => {
  const data = await readAdminData();
  const session: MobileAuthSession = {
    mobile_token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
    license_card_id: licenseCardId,
    linked_at: new Date().toISOString(),
  };
  data.mobile_auth_sessions.push(session);
  // Limite simple pour éviter croissance infinie
  if (data.mobile_auth_sessions.length > 5000) {
    data.mobile_auth_sessions = data.mobile_auth_sessions.slice(-5000);
  }
  await writeAdminData(data);
  return session;
};

/** Licence active via token mobile (remplace device_id) */
export const getActiveLicenseByMobileToken = async (
  mobileToken: string
): Promise<{ card: AdminLicenseCard; user: AdminUser | null; session: MobileAuthSession } | null> => {
  const data = await readAdminData();
  const session = data.mobile_auth_sessions.find((s) => s.mobile_token === mobileToken);
  if (!session) return null;
  const card = data.license_cards.find((c) => c.id === session.license_card_id);
  if (!card || !isLicenseCardValid(card)) return null;
  const user = data.users.find((u) => u.license_card_id === card.id) ?? null;
  return { card, user, session };
};

/** Première carte non utilisée (mode test admin/dev) */
export const getFirstUnusedLicenseCard = async (): Promise<AdminLicenseCard | undefined> =>
  (await readAdminData()).license_cards.find((c) => c.status === "unused");

// --- Utilisateurs ---
/** Liste des étudiants avec progression recalculée depuis lesson_progress */
export const getUsers = async (): Promise<
  (AdminUser & { lessons_completed: number; lessons_total: number })[]
> => {
  const data = await readAdminData();
  return data.users
    .map((user) => {
      const stats = getUserProgressStats(data, user.id);
      return {
        ...user,
        progress_percent: stats.percent,
        lessons_completed: stats.completed,
        lessons_total: stats.total,
      };
    })
    .sort((a, b) => b.progress_percent - a.progress_percent);
};

/** Seuil de visionnage pour marquer une leçon comme terminée */
export const LESSON_COMPLETION_THRESHOLD = 90;

export const getStudentUserByAuthToken = async (authToken: string): Promise<AdminUser | null> => {
  const data = await readAdminData();
  const session = data.student_auth_sessions.find((s) => s.auth_token === authToken);
  if (!session) return null;
  return data.users.find((u) => u.device_id === session.device_id) ?? null;
};

/** Utilisateur lié à l'appareil mobile (sans cookie web) */
export const getStudentUserByDeviceId = async (deviceId: string): Promise<AdminUser | null> => {
  const data = await readAdminData();
  return data.users.find((u) => u.device_id === deviceId) ?? null;
};

const calculateCourseProgressPercent = (
  data: AdminData,
  userId: string,
  courseId: string
): { percent: number; completed: number; total: number } => {
  const lessons = data.lessons.filter((l) => l.course_id === courseId && l.video_id);
  const total = lessons.length;
  if (total === 0) return { percent: 0, completed: 0, total: 0 };

  const completed = lessons.filter((lesson) =>
    data.lesson_progress.some(
      (p) => p.user_id === userId && p.lesson_id === lesson.id && p.completed
    )
  ).length;

  return { percent: Math.round((completed / total) * 100), completed, total };
};

const getUserProgressStats = (
  data: AdminData,
  userId: string
): { percent: number; completed: number; total: number } => {
  const publishedCourseIds = new Set(
    data.courses.filter((c) => c.status === "published").map((c) => c.id)
  );
  const lessons = data.lessons.filter((l) => publishedCourseIds.has(l.course_id) && l.video_id);
  const total = lessons.length;
  if (total === 0) return { percent: 0, completed: 0, total: 0 };

  const completed = lessons.filter((lesson) =>
    data.lesson_progress.some(
      (p) => p.user_id === userId && p.lesson_id === lesson.id && p.completed
    )
  ).length;

  return { percent: Math.round((completed / total) * 100), completed, total };
};

const calculateGlobalProgressPercent = (data: AdminData, userId: string): number =>
  getUserProgressStats(data, userId).percent;

/** Met à jour la progression de visionnage d'une leçon (+ analytics optionnels) */
const applyLessonProgressUpdate = async (
  user: AdminUser,
  courseId: string,
  lessonId: string,
  watchPercent: number,
  activity?: Omit<WatchActivityPayload, "course_id" | "lesson_id" | "watch_percent">
): Promise<{
  completed: boolean;
  watch_percent: number;
  course_percent: number;
  global_percent: number;
} | null> => {
  const data = await readAdminData();

  const lesson = data.lessons.find((l) => l.id === lessonId && l.course_id === courseId);
  if (!lesson?.video_id) return null;

  const pct = Math.min(100, Math.max(0, Math.round(watchPercent)));
  const isComplete = pct >= LESSON_COMPLETION_THRESHOLD;
  const now = new Date().toISOString();

  let record = data.lesson_progress.find((p) => p.user_id === user.id && p.lesson_id === lessonId);
  if (!record) {
    record = {
      id: crypto.randomUUID(),
      user_id: user.id,
      course_id: courseId,
      lesson_id: lessonId,
      completed: isComplete,
      watch_percent: pct,
      completed_at: isComplete ? now : undefined,
      updated_at: now,
    };
    data.lesson_progress.push(record);
  } else {
    record.watch_percent = Math.max(record.watch_percent, pct);
    if (isComplete) {
      record.completed = true;
      record.completed_at = record.completed_at ?? now;
      record.watch_percent = Math.max(record.watch_percent, LESSON_COMPLETION_THRESHOLD);
    }
    record.updated_at = now;
  }

  if (!user.enrolled_course_ids.includes(courseId)) {
    user.enrolled_course_ids.push(courseId);
  }
  user.progress_percent = calculateGlobalProgressPercent(data, user.id);

  // Temps passé + stats leçon/cours (heartbeat ou ouverture)
  if (activity) {
    recordWatchActivityOnData(data, user.id, courseId, lessonId, {
      ...activity,
      watch_percent: pct,
    });
  }

  await writeAdminData(data);

  const courseStats = calculateCourseProgressPercent(data, user.id, courseId);
  return {
    completed: record.completed,
    watch_percent: record.watch_percent,
    course_percent: courseStats.percent,
    global_percent: user.progress_percent,
  };
};

export const updateLessonProgress = async (
  authToken: string,
  courseId: string,
  lessonId: string,
  watchPercent: number,
  activity?: Omit<WatchActivityPayload, "course_id" | "lesson_id" | "watch_percent">
): Promise<{
  completed: boolean;
  watch_percent: number;
  course_percent: number;
  global_percent: number;
} | null> => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return null;
  return applyLessonProgressUpdate(user, courseId, lessonId, watchPercent, activity);
};

/** Progression depuis l'app mobile (auth par device_id) */
export const updateLessonProgressByDeviceId = async (
  deviceId: string,
  courseId: string,
  lessonId: string,
  watchPercent: number,
  activity?: Omit<WatchActivityPayload, "course_id" | "lesson_id" | "watch_percent">
): Promise<{
  completed: boolean;
  watch_percent: number;
  course_percent: number;
  global_percent: number;
} | null> => {
  const user = await getStudentUserByDeviceId(deviceId);
  if (!user) return null;
  return applyLessonProgressUpdate(user, courseId, lessonId, watchPercent, activity);
};

/** Enregistre l'ouverture d'une leçon (web) */
export const recordLessonOpenByAuthToken = async (
  authToken: string,
  courseId: string,
  lessonId: string,
  clientTimestamp?: string
): Promise<boolean> => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return false;

  const data = await readAdminData();
  recordWatchActivityOnData(data, user.id, courseId, lessonId, {
    event_type: "lesson_open",
    source: "web",
    client_timestamp: clientTimestamp,
  });
  await writeAdminData(data);
  return true;
};

/** Enregistre l'ouverture d'une leçon (mobile) */
export const recordLessonOpenByDeviceId = async (
  deviceId: string,
  courseId: string,
  lessonId: string,
  clientTimestamp?: string
): Promise<boolean> => {
  const user = await getStudentUserByDeviceId(deviceId);
  if (!user) return false;

  const data = await readAdminData();
  recordWatchActivityOnData(data, user.id, courseId, lessonId, {
    event_type: "lesson_open",
    source: "mobile",
    client_timestamp: clientTimestamp,
  });
  await writeAdminData(data);
  return true;
};

/** Synchronise un lot d'événements hors-ligne (mobile) */
export const syncWatchActivitiesByDeviceId = async (
  deviceId: string,
  events: WatchActivityPayload[]
): Promise<{ synced: number }> => {
  const user = await getStudentUserByDeviceId(deviceId);
  if (!user) return { synced: 0 };

  const data = await readAdminData();
  const synced = applyWatchActivityBatch(data, user, events);

  // Met à jour la progression pour chaque heartbeat avec watch_percent
  for (const event of events) {
    const courseId = event.course_id?.trim();
    const lessonId = event.lesson_id?.trim();
    const watchPercent = Number(event.watch_percent ?? NaN);
    if (!courseId || !lessonId || Number.isNaN(watchPercent)) continue;

    const lesson = data.lessons.find((l) => l.id === lessonId && l.course_id === courseId);
    if (!lesson?.video_id) continue;

    const pct = Math.min(100, Math.max(0, Math.round(watchPercent)));
    const isComplete = pct >= LESSON_COMPLETION_THRESHOLD;
    const now = new Date().toISOString();

    let record = data.lesson_progress.find((p) => p.user_id === user.id && p.lesson_id === lessonId);
    if (!record) {
      record = {
        id: crypto.randomUUID(),
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        completed: isComplete,
        watch_percent: pct,
        completed_at: isComplete ? now : undefined,
        updated_at: now,
      };
      data.lesson_progress.push(record);
    } else {
      record.watch_percent = Math.max(record.watch_percent, pct);
      if (isComplete) {
        record.completed = true;
        record.completed_at = record.completed_at ?? now;
        record.watch_percent = Math.max(record.watch_percent, LESSON_COMPLETION_THRESHOLD);
      }
      record.updated_at = now;
    }

    if (!user.enrolled_course_ids.includes(courseId)) {
      user.enrolled_course_ids.push(courseId);
    }
  }

  user.progress_percent = calculateGlobalProgressPercent(data, user.id);
  await writeAdminData(data);
  return { synced };
};

/** Résumé analytics pour la page admin */
export const getAnalyticsSummary = async (days = 7): Promise<AdminAnalyticsSummary> => {
  const data = await readAdminData();
  return buildAnalyticsSummary(data, days);
};

/** Résumé progression globale et par cours */
const buildStudentProgressSummary = (
  data: AdminData,
  user: AdminUser,
  courseId?: string,
  allowedCourseIds?: string[] | null
) => {
  const globalPercent = calculateGlobalProgressPercent(data, user.id);

  const publishedCourses = data.courses.filter((c) => c.status === "published");
  const scopedCourses = allowedCourseIds
    ? publishedCourses.filter((c) => allowedCourseIds.includes(c.id))
    : publishedCourses;

  const courses = scopedCourses.map((course) => {
    const stats = calculateCourseProgressPercent(data, user.id, course.id);
    const completedLessonIds = data.lesson_progress
      .filter((p) => p.user_id === user.id && p.course_id === course.id && p.completed)
      .map((p) => p.lesson_id);

    return {
      course_id: course.id,
      course_title: course.title,
      percent: stats.percent,
      completed_lessons: stats.completed,
      total_lessons: stats.total,
      completed_lesson_ids: completedLessonIds,
    };
  });

  if (courseId) {
    if (allowedCourseIds && !allowedCourseIds.includes(courseId)) {
      return null;
    }
    const course = data.courses.find((c) => c.id === courseId);
    const courseEntry = courses.find((c) => c.course_id === courseId);
    const videoLessons = data.lessons.filter((l) => l.course_id === courseId && l.video_id);

    const lessonProgress = videoLessons.map((lesson) => {
      const record = data.lesson_progress.find(
        (p) => p.user_id === user.id && p.lesson_id === lesson.id
      );
      const quizCount = data.lesson_quiz_items.filter(
        (q) => q.lesson_id === lesson.id && q.course_id === courseId && q.active
      ).length;
      const bestQuiz = getBestLessonQuizAttempt(data, user.id, lesson.id);

      return {
        lesson_id: lesson.id,
        completed: record?.completed ?? false,
        watch_percent: record?.watch_percent ?? 0,
        unlocked: isLessonUnlocked(data, user.id, courseId, lesson.id, course?.sequential_access),
        has_quiz: quizCount > 0,
        quiz_count: quizCount,
        quiz_score: bestQuiz?.score ?? null,
        quiz_total: bestQuiz?.total ?? null,
        quiz_passed: bestQuiz?.passed ?? null,
      };
    });

    return {
      global_percent: globalPercent,
      sequential_access: course?.sequential_access !== false,
      course: courseEntry ?? {
        course_id: courseId,
        course_title: course?.title ?? "Cours",
        percent: 0,
        completed_lessons: 0,
        total_lessons: 0,
        completed_lesson_ids: [],
      },
      lessons: lessonProgress,
    };
  }

  return { global_percent: globalPercent, courses };
};

export const getStudentProgressSummary = async (authToken: string, courseId?: string) => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return null;

  const license = await getStudentLicenseByAuthToken(authToken);
  const allowed = license ? getAllowedCourseIdsForCard(license.card) : null;
  const data = await readAdminData();
  return buildStudentProgressSummary(data, user, courseId, allowed);
};

/** Progression depuis l'app mobile (auth par device_id) */
export const getStudentProgressSummaryByDeviceId = async (deviceId: string, courseId?: string) => {
  const user = await getStudentUserByDeviceId(deviceId);
  if (!user) return null;

  const license = await getActiveLicenseByDeviceId(deviceId);
  const allowed = license ? getAllowedCourseIdsForCard(license.card) : null;
  const data = await readAdminData();
  return buildStudentProgressSummary(data, user, courseId, allowed);
};

export const saveUser = async (user: AdminUser): Promise<AdminUser> => {
  const data = await readAdminData();
  const i = data.users.findIndex((u) => u.id === user.id);
  if (i >= 0) data.users[i] = user; else data.users.push(user);
  await writeAdminData(data);
  return user;
};

// --- Certificats ---
export const getCertificates = async (): Promise<AdminCertificate[]> => (await readAdminData()).certificates;

export const getCertificateById = async (id: string): Promise<AdminCertificate | undefined> =>
  (await readAdminData()).certificates.find((c) => c.id === id);

export const getCertificateForUserCourse = async (
  userId: string,
  courseId: string
): Promise<AdminCertificate | undefined> =>
  (await readAdminData()).certificates.find((c) => c.user_id === userId && c.course_id === courseId);

/** Éligibilité : leçons 100 % + quiz réussi (si questions existent) */
export const getCertificateEligibility = (
  data: AdminData,
  userId: string,
  courseId: string
): { eligible: boolean; reason: string } => {
  const course = data.courses.find((c) => c.id === courseId && c.status === "published");
  if (!course) return { eligible: false, reason: "Cours introuvable" };

  const progress = calculateCourseProgressPercent(data, userId, courseId);
  if (progress.total === 0) return { eligible: false, reason: "Ce cours n'a pas encore de leçons" };
  if (progress.percent < 100) return { eligible: false, reason: "Terminez toutes les leçons du cours" };

  const quizCount = data.quiz_questions.filter((q) => q.course_id === courseId && q.active).length;
  if (quizCount > 0) {
    const quizPassed = data.quiz_attempts.some(
      (a) => a.user_id === userId && a.course_id === courseId && a.passed
    );
    if (!quizPassed) return { eligible: false, reason: "Réussissez le quiz certifiant" };
  }

  return { eligible: true, reason: "" };
};

const createCertificateRecord = (
  data: AdminData,
  userId: string,
  courseId: string,
  status: PaymentStatus
): AdminCertificate => {
  const year = new Date().getFullYear();
  const num = String(data.certificates.length + 1).padStart(5, "0");
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    user_id: userId,
    course_id: courseId,
    unique_code: `NKO-CERT-${year}-${num}`,
    payment_status: status,
    verification_hash: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    issued_at: status === "paid" ? now : undefined,
    requested_at: status === "pending" ? now : undefined,
    created_at: now,
  };
};

/** Émission directe par l'admin */
export const issueCertificate = async (
  userId: string,
  courseId: string,
  force = false
): Promise<AdminCertificate | { error: string }> => {
  const data = await readAdminData();
  const existing = data.certificates.find((c) => c.user_id === userId && c.course_id === courseId);

  if (existing?.payment_status === "paid") {
    return { error: "Un certificat existe déjà pour cet élève et ce cours" };
  }

  if (existing?.payment_status === "pending") {
    existing.payment_status = "paid";
    existing.issued_at = new Date().toISOString();
    await writeAdminData(data);
    return existing;
  }

  if (!force) {
    const check = getCertificateEligibility(data, userId, courseId);
    if (!check.eligible) return { error: check.reason };
  }

  const cert = createCertificateRecord(data, userId, courseId, "paid");
  data.certificates.push(cert);
  await writeAdminData(data);
  return cert;
};

/** Demande de certificat par un élève (sans paiement — conservé pour compatibilité admin) */
export const requestCertificateByAuth = async (
  authToken: string,
  courseId: string
): Promise<AdminCertificate | { error: string }> => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return { error: "Profil introuvable" };

  const data = await readAdminData();
  const existing = data.certificates.find((c) => c.user_id === user.id && c.course_id === courseId);

  if (existing?.payment_status === "paid") return { error: "Certificat déjà délivré" };
  if (existing?.payment_status === "pending") return { error: "Paiement déjà initié — finalisez ou attendez la confirmation" };

  const check = getCertificateEligibility(data, user.id, courseId);
  if (!check.eligible) return { error: check.reason };

  const cert = createCertificateRecord(data, user.id, courseId, "pending");
  data.certificates.push(cert);
  await writeAdminData(data);
  return cert;
};

/** Marque un certificat comme payé après vérification Djomy */
export const fulfillCertificatePayment = async (
  certificateId: string,
  transactionId: string
): Promise<AdminCertificate | null> => {
  const { verifyDjomyPayment } = await import("@/lib/djomy/client");
  const payment = await verifyDjomyPayment(transactionId);

  if (payment.status !== "SUCCESS") return null;

  const data = await readAdminData();
  const cert = data.certificates.find((c) => c.id === certificateId);
  if (!cert) return null;

  const merchantRef = payment.merchantPaymentReference;
  if (merchantRef && merchantRef !== certificateId && merchantRef !== cert.unique_code) {
    return null;
  }

  if (cert.payment_status === "paid") return cert;

  cert.payment_status = "paid";
  cert.issued_at = new Date().toISOString();
  cert.djomy_transaction_id = transactionId;

  const user = data.users.find((u) => u.id === cert.user_id);
  const course = data.courses.find((c) => c.id === cert.course_id);
  pushAdminNotification(data, {
    type: "certificate_paid",
    title: "Certificat payé",
    message: `${user?.name ?? "Élève"} a payé le certificat · ${course?.title ?? "cours"}`,
    link: "/admin/certificates",
    metadata: { certificate_id: cert.id, user_id: cert.user_id },
  });

  await writeAdminData(data);
  return cert;
};

/** Initie le paiement Djomy pour un certificat */
export const initiateCertificatePayment = async (
  authToken: string,
  courseId: string
): Promise<{ paymentUrl: string; certificateId: string } | { error: string }> => {
  const { isDjomyConfigured } = await import("@/lib/djomy/config");
  if (!isDjomyConfigured()) {
    return { error: "Paiement en ligne non configuré. Contactez l'administrateur." };
  }

  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return { error: "Profil introuvable" };

  const license = await getStudentLicenseByAuthToken(authToken);
  const allowed = license ? getAllowedCourseIdsForCard(license.card) : null;
  if (allowed && !allowed.includes(courseId)) {
    return { error: "Accès refusé pour ce cours" };
  }

  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId);
  if (!course) return { error: "Cours introuvable" };

  const existing = data.certificates.find((c) => c.user_id === user.id && c.course_id === courseId);
  if (existing?.payment_status === "paid") return { error: "Certificat déjà délivré" };

  const check = getCertificateEligibility(data, user.id, courseId);
  if (!check.eligible) return { error: check.reason };

  const amount = license?.card.certificate_price_gnf ?? data.settings.certificate_price;
  if (!amount || amount <= 0) return { error: "Prix du certificat non configuré" };

  let cert = existing;
  if (!cert) {
    cert = createCertificateRecord(data, user.id, courseId, "pending");
    data.certificates.push(cert);
  }

  const { createDjomyPaymentLink } = await import("@/lib/djomy/client");
  const { getDjomyConfig } = await import("@/lib/djomy/config");
  const djomyConfig = getDjomyConfig();

  try {
    const link = await createDjomyPaymentLink({
      countryCode: "GN",
      amountToPay: amount,
      linkName: `Certificat — ${course.title}`,
      description: `Certificat N'ko — ${course.title}`,
      merchantReference: cert.id,
      returnUrl: `${djomyConfig.webUrl}/dashboard/certificates/payment/return?cert_id=${cert.id}`,
      cancelUrl: `${djomyConfig.webUrl}/dashboard/certificates/payment/cancel?cert_id=${cert.id}`,
      metadata: {
        certificate_id: cert.id,
        course_id: courseId,
        user_id: user.id,
      },
    });

    cert.djomy_link_reference = link.paymentLinkReference;
    cert.requested_at = cert.requested_at ?? new Date().toISOString();

    const courseTitle = course.title;
    pushAdminNotification(data, {
      type: "certificate_pending",
      title: "Paiement certificat initié",
      message: `${user.name} a lancé le paiement pour « ${courseTitle} »`,
      link: "/admin/certificates",
      metadata: { certificate_id: cert.id, user_id: user.id },
    });

    await writeAdminData(data);

    return { paymentUrl: link.paymentPageUrl, certificateId: cert.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur paiement Djomy";
    return { error: message };
  }
};

/** Initie le paiement Djomy pour un certificat — app mobile (device_id) */
export const initiateCertificatePaymentByDeviceId = async (
  deviceId: string,
  courseId: string
): Promise<{ paymentUrl: string; certificateId: string } | { error: string }> => {
  const license = await getActiveLicenseByDeviceId(deviceId);
  if (!license) return { error: "Licence invalide ou expirée" };

  const user = license.user ?? (await getStudentUserByDeviceId(deviceId));
  if (!user) return { error: "Profil introuvable" };

  const allowed = getAllowedCourseIdsForCard(license.card);
  if (allowed && !allowed.includes(courseId)) {
    return { error: "Accès refusé pour ce cours" };
  }

  const { isDjomyConfigured } = await import("@/lib/djomy/config");
  if (!isDjomyConfigured()) {
    return { error: "Paiement en ligne non configuré. Contactez l'administrateur." };
  }

  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId);
  if (!course) return { error: "Cours introuvable" };

  const existing = data.certificates.find((c) => c.user_id === user.id && c.course_id === courseId);
  if (existing?.payment_status === "paid") return { error: "Certificat déjà délivré" };

  const check = getCertificateEligibility(data, user.id, courseId);
  if (!check.eligible) return { error: check.reason };

  const amount = license.card.certificate_price_gnf ?? data.settings.certificate_price;
  if (!amount || amount <= 0) return { error: "Prix du certificat non configuré" };

  let cert = existing;
  if (!cert) {
    cert = createCertificateRecord(data, user.id, courseId, "pending");
    data.certificates.push(cert);
  }

  const { createDjomyPaymentLink } = await import("@/lib/djomy/client");
  const { getDjomyConfig } = await import("@/lib/djomy/config");
  const djomyConfig = getDjomyConfig();

  try {
    const link = await createDjomyPaymentLink({
      countryCode: "GN",
      amountToPay: amount,
      linkName: `Certificat — ${course.title}`,
      description: `Certificat N'ko — ${course.title}`,
      merchantReference: cert.id,
      returnUrl: `${djomyConfig.webUrl}/dashboard/certificates/payment/return?cert_id=${cert.id}&source=mobile`,
      cancelUrl: `${djomyConfig.webUrl}/dashboard/certificates/payment/cancel?cert_id=${cert.id}&source=mobile`,
      metadata: {
        certificate_id: cert.id,
        course_id: courseId,
        user_id: user.id,
        source: "mobile",
      },
    });

    cert.djomy_link_reference = link.paymentLinkReference;
    cert.requested_at = cert.requested_at ?? new Date().toISOString();

    pushAdminNotification(data, {
      type: "certificate_pending",
      title: "Paiement certificat initié (mobile)",
      message: `${user.name} a lancé le paiement mobile pour « ${course.title} »`,
      link: "/admin/certificates",
      metadata: { certificate_id: cert.id, user_id: user.id },
    });

    await writeAdminData(data);

    return { paymentUrl: link.paymentPageUrl, certificateId: cert.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur paiement Djomy";
    return { error: message };
  }
};

/** Approuve une demande en attente */
export const approveCertificate = async (certId: string): Promise<AdminCertificate | null> => {
  const data = await readAdminData();
  const cert = data.certificates.find((c) => c.id === certId);
  if (!cert || cert.payment_status !== "pending") return null;

  cert.payment_status = "paid";
  cert.issued_at = new Date().toISOString();
  await writeAdminData(data);
  return cert;
};

/** Certificats et éligibilité pour l'élève connecté */
const buildStudentCertificatesOverview = (data: AdminData, user: AdminUser, allowedCourseIds?: string[] | null, certificatePriceOverride?: number) => {
  const myCerts = data.certificates.filter((c) => c.user_id === user.id);

  const publishedCourses = data.courses.filter((c) => c.status === "published");
  const scopedCourses = allowedCourseIds
    ? publishedCourses.filter((c) => allowedCourseIds.includes(c.id))
    : publishedCourses;

  const eligibility = scopedCourses.map((course) => {
    const cert = myCerts.find((c) => c.course_id === course.id);
    const check = getCertificateEligibility(data, user.id, course.id);

    let status: "none" | "pending" | "issued" = "none";
    if (cert?.payment_status === "paid") status = "issued";
    else if (cert?.payment_status === "pending") status = "pending";

    return {
      course_id: course.id,
      course_title: course.title,
      eligible: check.eligible,
      reason: check.reason,
      status,
      certificate_id: cert?.id,
      unique_code: cert?.unique_code,
      awaiting_payment: cert?.payment_status === "pending" && Boolean(cert.djomy_link_reference),
    };
  });

  const certificates = myCerts.map((cert) => {
    const course = data.courses.find((c) => c.id === cert.course_id);
    return {
      id: cert.id,
      course_id: cert.course_id,
      course_title: course?.title ?? "Cours",
      unique_code: cert.unique_code,
      verification_hash: cert.verification_hash,
      payment_status: cert.payment_status,
      issued_at: cert.issued_at,
      requested_at: cert.requested_at ?? cert.created_at,
    };
  });

  const issuedCount = certificates.filter((c) => c.payment_status === "paid").length;

  return {
    user_name: user.name,
    certificates,
    eligibility,
    issued_count: issuedCount,
    certificate_price: certificatePriceOverride ?? data.settings.certificate_price,
  };
};

export const getStudentCertificatesOverview = async (authToken: string) => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return null;

  const license = await getStudentLicenseByAuthToken(authToken);
  const allowed = license ? getAllowedCourseIdsForCard(license.card) : null;
  const certPrice = license?.card.certificate_price_gnf;
  const data = await readAdminData();
  return buildStudentCertificatesOverview(data, user, allowed, certPrice);
};

/** Certificats depuis l'app mobile (auth par device_id) */
export const getStudentCertificatesOverviewByDeviceId = async (deviceId: string) => {
  const user = await getStudentUserByDeviceId(deviceId);
  if (!user) return null;

  const license = await getActiveLicenseByDeviceId(deviceId);
  const allowed = license ? getAllowedCourseIdsForCard(license.card) : null;
  const certPrice = license?.card.certificate_price_gnf;
  const data = await readAdminData();
  return buildStudentCertificatesOverview(data, user, allowed, certPrice);
};

// --- Paramètres ---
export const getSettings = async (): Promise<AdminSettings> => (await readAdminData()).settings;
export const saveSettings = async (settings: AdminSettings): Promise<AdminSettings> => {
  const data = await readAdminData();
  data.settings = normalizeAdminSettings(settings);
  await writeAdminData(data);
  return data.settings;
};

/** Données publiques — sans URL vidéo directe (streaming protégé uniquement) */
export const getPublicCourseDetails = async (courseId: string) => {
  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId && c.status === "published");
  if (!course) return null;

  const quizCountByLesson = new Map<string, number>();
  for (const item of data.lesson_quiz_items) {
    if (item.course_id === courseId && item.active) {
      quizCountByLesson.set(item.lesson_id, (quizCountByLesson.get(item.lesson_id) ?? 0) + 1);
    }
  }

  return {
    ...course,
    chapters: data.chapters.filter((c) => c.course_id === courseId).sort((a, b) => a.order - b.order),
    lessons: data.lessons
      .filter((l) => l.course_id === courseId)
      .sort((a, b) => a.order - b.order)
      .map((l) => {
        const quizCount = quizCountByLesson.get(l.id) ?? 0;
        return {
          id: l.id,
          course_id: l.course_id,
          chapter_id: l.chapter_id,
          title: l.title,
          order: l.order,
          duration_minutes: l.duration_minutes,
          has_video: Boolean(l.video_id),
          has_quiz: quizCount > 0,
          quiz_count: quizCount,
        };
      }),
  };
};

/** Vérifie l'accès élève à une leçon (licence + parcours chronologique) */
export const canStudentAccessLesson = async (
  authToken: string,
  courseId: string,
  lessonId: string
): Promise<{ allowed: boolean; reason?: string }> => {
  const user = await getStudentUserByAuthToken(authToken);
  if (!user) return { allowed: false, reason: "Profil introuvable" };

  const license = await getStudentLicenseByAuthToken(authToken);
  const allowed = license ? getAllowedCourseIdsForCard(license.card) : null;
  if (allowed && !allowed.includes(courseId)) {
    return { allowed: false, reason: "Accès refusé pour ce cours" };
  }

  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId && c.status === "published");
  if (!course) return { allowed: false, reason: "Cours introuvable" };

  const lesson = data.lessons.find((l) => l.id === lessonId && l.course_id === courseId);
  if (!lesson?.video_id) return { allowed: false, reason: "Leçon ou vidéo introuvable" };

  if (!isLessonUnlocked(data, user.id, courseId, lessonId, course.sequential_access)) {
    return { allowed: false, reason: "Terminez les leçons précédentes pour débloquer celle-ci" };
  }

  return { allowed: true };
};

export const getLessonForPlayback = async (courseId: string, lessonId: string) => {
  const data = await readAdminData();
  const course = data.courses.find((c) => c.id === courseId && c.status === "published");
  if (!course) return null;
  const lesson = data.lessons.find((l) => l.id === lessonId && l.course_id === courseId);
  if (!lesson?.video_id) return null;

  const attachments = data.lesson_attachments
    .filter((a) => a.lesson_id === lessonId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((a) => ({
      id: a.id,
      original_name: a.original_name,
      mime_type: a.mime_type,
      size_bytes: a.size_bytes,
      download_url: `/api/attachments/${a.id}/download`,
    }));

  const questions = data.lesson_questions
    .filter((q) => q.lesson_id === lessonId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((q) => ({
      id: q.id,
      author_name: q.author_name,
      text: q.text,
      created_at: q.created_at,
      admin_reply: q.admin_reply ?? null,
      admin_replied_at: q.admin_replied_at ?? null,
    }));

  const votes = data.lesson_reactions.filter((r) => r.lesson_id === lessonId);
  const likes = votes.filter((v) => v.vote === "like").length;
  const dislikes = votes.filter((v) => v.vote === "dislike").length;

  return {
    course,
    lesson: {
      id: lesson.id,
      title: lesson.title,
      video_id: lesson.video_id,
      duration_minutes: lesson.duration_minutes,
    },
    attachments,
    questions,
    reactions: { likes, dislikes },
  };
};

/** Prix public licence en ligne — plusieurs formules */
export const getLicensePricing = async (): Promise<{
  plans: ReturnType<typeof getActiveLicensePlans>;
  djomy_enabled: boolean;
  /** @deprecated compatibilité mobile/web anciennes versions */
  license_price: number;
  license_duration_months: number;
}> => {
  const data = await readAdminData();
  const { isDjomyConfigured } = await import("@/lib/djomy/config");
  const plans = getActiveLicensePlans(data.settings);
  const fallback = getDefaultLicensePlan(data.settings);

  return {
    plans,
    djomy_enabled: isDjomyConfigured(),
    license_price: fallback?.price_gnf ?? data.settings.license_price,
    license_duration_months: fallback?.duration_months ?? data.settings.license_duration_months,
  };
};

/** Initie l'achat licence en ligne (Djomy) — formule choisie par l'élève */
export const initiateLicensePurchase = async (
  authToken: string,
  deviceId: string,
  profile: StudentProfileInput,
  durationMonths: number
): Promise<{ paymentUrl: string; orderId: string } | { error: string }> => {
  const { isDjomyConfigured } = await import("@/lib/djomy/config");
  if (!isDjomyConfigured()) {
    return { error: "Paiement en ligne non configuré. Contactez l'administrateur." };
  }

  const existing = await getStudentLicenseByAuthToken(authToken);
  if (existing) return { error: "Vous avez déjà une licence active" };

  const data = await readAdminData();
  const plan = resolveLicensePlanByDuration(data.settings, durationMonths);
  if (!plan) {
    return { error: "Formule licence invalide ou indisponible" };
  }

  const amount = plan.price_gnf;
  const duration = plan.duration_months;

  const orderId = crypto.randomUUID();
  const order: LicenseOrder = {
    id: orderId,
    auth_token: authToken,
    device_id: deviceId,
    profile_snapshot: profile,
    amount_gnf: amount,
    duration_months: duration,
    payment_status: "pending" as const,
    source: "web",
    created_at: new Date().toISOString(),
  };
  data.license_orders.push(order);

  const { createDjomyPaymentLink } = await import("@/lib/djomy/client");
  const { getDjomyConfig } = await import("@/lib/djomy/config");
  const djomyConfig = getDjomyConfig();

  try {
    const link = await createDjomyPaymentLink({
      countryCode: "GN",
      amountToPay: amount,
      linkName: `Licence Karamoo Sêebaly — ${duration} mois`,
      description: `Accès plateforme N'ko — ${duration} mois`,
      merchantReference: orderId,
      returnUrl: `${djomyConfig.webUrl}/dashboard/activate-license/payment/return?order_id=${orderId}`,
      cancelUrl: `${djomyConfig.webUrl}/dashboard/activate-license/payment/cancel?order_id=${orderId}`,
      metadata: {
        license_order_id: orderId,
        type: "license",
      },
    });

    order.djomy_link_reference = link.paymentLinkReference;
    pushAdminNotification(data, {
      type: "license_activated",
      title: "Achat licence en ligne",
      message: `${profile.name} a lancé un paiement licence (${amount} GNF)`,
      link: "/admin/cards",
      metadata: { license_order_id: orderId },
    });
    await writeAdminData(data);

    return { paymentUrl: link.paymentPageUrl, orderId };
  } catch (err) {
    data.license_orders = data.license_orders.filter((o) => o.id !== orderId);
    await writeAdminData(data);
    const message = err instanceof Error ? err.message : "Erreur paiement Djomy";
    return { error: message };
  }
};

/** Initie l'achat licence en ligne depuis l'app mobile (Djomy) */
export const initiateLicensePurchaseByDeviceId = async (
  deviceId: string,
  profile: StudentProfileInput,
  durationMonths: number
): Promise<{ paymentUrl: string; orderId: string } | { error: string }> => {
  const { isDjomyConfigured } = await import("@/lib/djomy/config");
  if (!isDjomyConfigured()) {
    return { error: "Paiement en ligne non configuré. Contactez l'administrateur." };
  }

  const existing = await getActiveLicenseByDeviceId(deviceId);
  if (existing) return { error: "Vous avez déjà une licence active" };

  const data = await readAdminData();
  const plan = resolveLicensePlanByDuration(data.settings, durationMonths);
  if (!plan) {
    return { error: "Formule licence invalide ou indisponible" };
  }

  const amount = plan.price_gnf;
  const duration = plan.duration_months;

  const orderId = crypto.randomUUID();
  const order: LicenseOrder = {
    id: orderId,
    auth_token: `mobile:${deviceId}`,
    device_id: deviceId,
    profile_snapshot: profile,
    amount_gnf: amount,
    duration_months: duration,
    payment_status: "pending",
    source: "mobile",
    created_at: new Date().toISOString(),
  };
  data.license_orders.push(order);

  const { createDjomyPaymentLink } = await import("@/lib/djomy/client");
  const { getDjomyConfig } = await import("@/lib/djomy/config");
  const djomyConfig = getDjomyConfig();

  try {
    const link = await createDjomyPaymentLink({
      countryCode: "GN",
      amountToPay: amount,
      linkName: `Licence Karamoo Sêebaly — ${duration} mois`,
      description: `Accès plateforme N'ko (mobile) — ${duration} mois`,
      merchantReference: orderId,
      returnUrl: `${djomyConfig.webUrl}/dashboard/activate-license/payment/return?order_id=${orderId}&source=mobile`,
      cancelUrl: `${djomyConfig.webUrl}/dashboard/activate-license/payment/cancel?order_id=${orderId}&source=mobile`,
      metadata: {
        license_order_id: orderId,
        type: "license",
        source: "mobile",
        device_id: deviceId,
      },
    });

    order.djomy_link_reference = link.paymentLinkReference;
    pushAdminNotification(data, {
      type: "license_activated",
      title: "Achat licence mobile",
      message: `${profile.name} a lancé un paiement licence mobile (${amount} GNF)`,
      link: "/admin/cards",
      metadata: { license_order_id: orderId, source: "mobile" },
    });
    await writeAdminData(data);

    return { paymentUrl: link.paymentPageUrl, orderId };
  } catch (err) {
    data.license_orders = data.license_orders.filter((o) => o.id !== orderId);
    await writeAdminData(data);
    const message = err instanceof Error ? err.message : "Erreur paiement Djomy";
    return { error: message };
  }
};

/** Confirme paiement licence et active automatiquement */
export const fulfillLicensePayment = async (
  orderId: string,
  transactionId: string
): Promise<{ success: true; cardId: string } | { success: false; message: string }> => {
  const data = await readAdminData();
  const order = data.license_orders.find((o) => o.id === orderId);
  if (!order) return { success: false, message: "Commande introuvable" };
  if (order.payment_status === "paid" && order.license_card_id) {
    return { success: true, cardId: order.license_card_id };
  }

  const { verifyDjomyPayment } = await import("@/lib/djomy/client");
  const payment = await verifyDjomyPayment(transactionId);
  if (payment.status !== "SUCCESS") {
    return { success: false, message: "Paiement non confirmé" };
  }

  if (!isValidLicenseDurationMonths(order.duration_months)) {
    return { success: false, message: "Durée licence invalide sur la commande" };
  }

  const [card] = await generateLicenseCards(1, order.duration_months as CardDurationMonths);
  if (!card) return { success: false, message: "Impossible de créer la licence" };

  const activation = await activateLicenseCard(card.id, card.activation_token, order.device_id);
  if (!activation.success) return { success: false, message: activation.message };

  await registerStudentProfile(order.device_id, activation.card.id, order.profile_snapshot);

  // Session web uniquement pour les achats navigateur
  if (order.source !== "mobile" && order.auth_token && !order.auth_token.startsWith("mobile:")) {
    await linkStudentAuthSession(order.auth_token, order.device_id, activation.card.id);
  }

  // Relecture après écritures intermédiaires pour mettre à jour la commande
  const finalData = await readAdminData();
  const finalOrder = finalData.license_orders.find((o) => o.id === orderId);
  if (!finalOrder) return { success: false, message: "Commande introuvable" };

  finalOrder.payment_status = "paid";
  finalOrder.djomy_transaction_id = transactionId;
  finalOrder.license_card_id = activation.card.id;

  pushAdminNotification(finalData, {
    type: "license_activated",
    title: "Licence achetée en ligne",
    message: `${order.profile_snapshot.name} — ${activation.card.code_text}`,
    link: "/admin/cards",
    metadata: { license_card_id: activation.card.id, license_order_id: orderId },
  });

  await writeAdminData(finalData);
  return { success: true, cardId: activation.card.id };
};
