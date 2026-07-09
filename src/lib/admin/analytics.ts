import type {
  AdminAnalyticsSummary,
  AdminData,
  AdminUser,
  ContentWatchStats,
  StudentDailyActivity,
  WatchActivityPayload,
} from "./types";

/** Limite par événement pour éviter les abus (10 min max) */
export const MAX_SECONDS_PER_EVENT = 600;

/** Extrait la date YYYY-MM-DD depuis un timestamp ISO */
export const getDateKey = (timestamp?: string): string => {
  const source = timestamp?.trim() ? new Date(timestamp) : new Date();
  if (Number.isNaN(source.getTime())) return new Date().toISOString().slice(0, 10);
  return source.toISOString().slice(0, 10);
};

/** Enregistre le temps de visionnage et les ouvertures de leçon */
export const recordWatchActivityOnData = (
  data: AdminData,
  userId: string,
  courseId: string,
  lessonId: string,
  input: Omit<WatchActivityPayload, "course_id" | "lesson_id">
): void => {
  const now = new Date().toISOString();
  const dateKey = getDateKey(input.client_timestamp);
  const seconds = Math.min(
    MAX_SECONDS_PER_EVENT,
    Math.max(0, Math.round(Number(input.seconds_watched ?? 0)))
  );

  // --- Temps journalier par élève ---
  const dailyId = `${userId}:${dateKey}`;
  let daily = data.student_daily_activity.find((entry) => entry.id === dailyId);
  if (!daily) {
    daily = {
      id: dailyId,
      user_id: userId,
      date: dateKey,
      total_seconds: 0,
      by_lesson: {},
      updated_at: now,
    };
    data.student_daily_activity.push(daily);
  }

  if (seconds > 0) {
    daily.total_seconds += seconds;
    daily.by_lesson[lessonId] = (daily.by_lesson[lessonId] ?? 0) + seconds;
  }
  daily.updated_at = now;

  // --- Stats leçon ---
  const lessonStat = getOrCreateContentStat(data, `lesson:${lessonId}`, {
    content_id: lessonId,
    type: "lesson",
    course_id: courseId,
  });

  if (input.event_type === "lesson_open") {
    lessonStat.view_count += 1;
    pushUniqueUser(lessonStat, userId);
  }
  if (seconds > 0) lessonStat.total_seconds += seconds;
  lessonStat.updated_at = now;

  // --- Stats cours ---
  const courseStat = getOrCreateContentStat(data, `course:${courseId}`, {
    content_id: courseId,
    type: "course",
  });

  if (input.event_type === "lesson_open") {
    pushUniqueUser(courseStat, userId);
  }
  if (seconds > 0) courseStat.total_seconds += seconds;
  courseStat.updated_at = now;
};

const getOrCreateContentStat = (
  data: AdminData,
  statId: string,
  seed: Pick<ContentWatchStats, "content_id" | "type" | "course_id">
): ContentWatchStats => {
  const existing = data.content_watch_stats.find((stat) => stat.id === statId);
  if (existing) return existing;

  const created: ContentWatchStats = {
    id: statId,
    content_id: seed.content_id,
    type: seed.type,
    course_id: seed.course_id,
    total_seconds: 0,
    view_count: 0,
    unique_users: [],
    updated_at: new Date().toISOString(),
  };
  data.content_watch_stats.push(created);
  return created;
};

const pushUniqueUser = (stat: ContentWatchStats, userId: string): void => {
  if (!stat.unique_users.includes(userId)) stat.unique_users.push(userId);
};

/** Formate les secondes en texte lisible (ex: 1 h 05 min) */
export const formatWatchDuration = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (restMinutes === 0) return `${hours} h`;
  return `${hours} h ${restMinutes} min`;
};

const buildDailySeries = (
  activities: StudentDailyActivity[],
  userId: string,
  days: number
): { date: string; seconds: number }[] => {
  const today = new Date();
  const series: { date: string; seconds: number }[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    const dateKey = date.toISOString().slice(0, 10);
    const match = activities.find((entry) => entry.user_id === userId && entry.date === dateKey);
    series.push({ date: dateKey, seconds: match?.total_seconds ?? 0 });
  }

  return series;
};

/** Construit le résumé analytics pour la page admin */
export const buildAnalyticsSummary = (data: AdminData, days = 7): AdminAnalyticsSummary => {
  const safeDays = Math.min(90, Math.max(1, days));
  const todayKey = new Date().toISOString().slice(0, 10);
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - (safeDays - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const recentActivities = data.student_daily_activity.filter((entry) => entry.date >= cutoffKey);
  const activeStudentIds = new Set(recentActivities.map((entry) => entry.user_id));

  const students = data.users
    .map((user) => {
      const userActivities = data.student_daily_activity.filter((entry) => entry.user_id === user.id);
      const totalSeconds = userActivities.reduce((sum, entry) => sum + entry.total_seconds, 0);
      const todaySeconds =
        userActivities.find((entry) => entry.date === todayKey)?.total_seconds ?? 0;
      const lastActive = userActivities
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;

      return {
        user_id: user.id,
        name: user.name,
        total_seconds: totalSeconds,
        today_seconds: todaySeconds,
        last_active_date: lastActive,
        daily: buildDailySeries(data.student_daily_activity, user.id, safeDays),
      };
    })
    .sort((a, b) => b.total_seconds - a.total_seconds);

  const lessonStats = data.content_watch_stats.filter((stat) => stat.type === "lesson");
  const topLessons = lessonStats
    .map((stat) => {
      const lesson = data.lessons.find((item) => item.id === stat.content_id);
      const course = data.courses.find((item) => item.id === lesson?.course_id);
      return {
        lesson_id: stat.content_id,
        lesson_title: lesson?.title ?? "Leçon supprimée",
        course_title: course?.title ?? "—",
        total_seconds: stat.total_seconds,
        view_count: stat.view_count,
        unique_students: stat.unique_users.length,
      };
    })
    .sort((a, b) => b.total_seconds - a.total_seconds || b.view_count - a.view_count)
    .slice(0, 10);

  const courseStats = data.content_watch_stats.filter((stat) => stat.type === "course");
  const topCourses = courseStats
    .map((stat) => {
      const course = data.courses.find((item) => item.id === stat.content_id);
      return {
        course_id: stat.content_id,
        course_title: course?.title ?? "Cours supprimé",
        total_seconds: stat.total_seconds,
        view_count: stat.view_count,
        unique_students: stat.unique_users.length,
      };
    })
    .sort((a, b) => b.total_seconds - a.total_seconds || b.unique_students - a.unique_students)
    .slice(0, 10);

  const totalWatchSeconds = recentActivities.reduce((sum, entry) => sum + entry.total_seconds, 0);
  const lessonViews = lessonStats.reduce((sum, stat) => sum + stat.view_count, 0);

  return {
    days: safeDays,
    totals: {
      watch_seconds: totalWatchSeconds,
      active_students: activeStudentIds.size,
      lesson_views: lessonViews,
    },
    students,
    top_lessons: topLessons,
    top_courses: topCourses,
  };
};

/** Applique une liste d'événements (sync mobile hors-ligne) */
export const applyWatchActivityBatch = (
  data: AdminData,
  user: AdminUser,
  events: WatchActivityPayload[]
): number => {
  let synced = 0;

  for (const event of events) {
    const courseId = event.course_id?.trim();
    const lessonId = event.lesson_id?.trim();
    if (!courseId || !lessonId) continue;

    recordWatchActivityOnData(data, user.id, courseId, lessonId, {
      watch_percent: event.watch_percent,
      seconds_watched: event.seconds_watched,
      event_type: event.event_type,
      source: event.source,
      client_timestamp: event.client_timestamp,
      offline: event.offline,
    });
    synced += 1;
  }

  return synced;
};
