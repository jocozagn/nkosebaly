"use client";

import { useEffect, useState } from "react";
import { BarChart3, Clock, Eye, Users } from "lucide-react";
import BrandLoader from "@/components/ui/BrandLoader";
import { formatWatchDuration } from "@/lib/admin/analytics";
import type { AdminAnalyticsSummary } from "@/lib/admin/types";

/** Page admin — analyse du comportement des élèves */
const AdminAnalyticsPage = () => {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<AdminAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSummary = (): void => {
    setIsLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setSummary(res.data ?? null);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSummary();
  }, [days]);

  const stats = summary
    ? [
        {
          label: `Temps total (${days} j)`,
          value: formatWatchDuration(summary.totals.watch_seconds),
          icon: Clock,
          color: "var(--brand-brown)",
        },
        {
          label: "Élèves actifs",
          value: String(summary.totals.active_students),
          icon: Users,
          color: "var(--brand-green)",
        },
        {
          label: "Ouvertures de leçons",
          value: String(summary.totals.lesson_views),
          icon: Eye,
          color: "var(--brand-sky)",
        },
        {
          label: "Période",
          value: `${days} jours`,
          icon: BarChart3,
          color: "var(--brand-gold)",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>
            Statistiques élèves
          </h2>
          <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
            Temps passé, activité quotidienne et contenus les plus suivis
          </p>
        </div>

        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm bg-white"
          aria-label="Période d'analyse"
        >
          <option value={7}>7 derniers jours</option>
          <option value={14}>14 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
        </select>
      </div>

      {isLoading ? (
        <BrandLoader variant="inline" message="Chargement des statistiques..." />
      ) : !summary ? (
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
          Aucune donnée disponible pour le moment.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-lg border border-[#e8ddd4] p-5 flex items-center gap-4"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: stat.color }}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--brand-gray)" }}>
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold" style={{ color: "var(--brand-black)" }}>
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Temps par élève */}
            <div className="bg-white rounded-lg border border-[#e8ddd4] overflow-x-auto">
              <div className="px-4 py-3 border-b border-[#f0e8df]">
                <h3 className="font-semibold" style={{ color: "var(--brand-brown)" }}>
                  Temps par élève
                </h3>
              </div>
              {summary.students.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: "var(--brand-gray)" }}>
                  Aucune activité enregistrée
                </p>
              ) : (
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="bg-[var(--brand-bg)]">
                    <tr className="text-left" style={{ color: "var(--brand-gray)" }}>
                      <th className="px-4 py-3 font-medium">Élève</th>
                      <th className="px-4 py-3 font-medium">Aujourd&apos;hui</th>
                      <th className="px-4 py-3 font-medium">Total</th>
                      <th className="px-4 py-3 font-medium">Activité ({days}j)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.students.map((student) => {
                      const maxDaily = Math.max(...student.daily.map((d) => d.seconds), 1);
                      return (
                        <tr key={student.user_id} className="border-t border-[#f0e8df]">
                          <td className="px-4 py-3 font-medium" style={{ color: "var(--brand-black)" }}>
                            {student.name}
                          </td>
                          <td className="px-4 py-3">{formatWatchDuration(student.today_seconds)}</td>
                          <td className="px-4 py-3">{formatWatchDuration(student.total_seconds)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-end gap-0.5 h-8">
                              {student.daily.map((day) => (
                                <div
                                  key={day.date}
                                  title={`${day.date} — ${formatWatchDuration(day.seconds)}`}
                                  className="flex-1 rounded-sm min-w-[6px]"
                                  style={{
                                    height: `${Math.max(8, (day.seconds / maxDaily) * 100)}%`,
                                    backgroundColor:
                                      day.seconds > 0 ? "var(--brand-sky)" : "#e8ddd4",
                                  }}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Leçons les plus suivies */}
            <div className="bg-white rounded-lg border border-[#e8ddd4] overflow-x-auto">
              <div className="px-4 py-3 border-b border-[#f0e8df]">
                <h3 className="font-semibold" style={{ color: "var(--brand-brown)" }}>
                  Leçons les plus suivies
                </h3>
              </div>
              {summary.top_lessons.length === 0 ? (
                <p className="p-6 text-sm text-center" style={{ color: "var(--brand-gray)" }}>
                  Pas encore de données
                </p>
              ) : (
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-[var(--brand-bg)]">
                    <tr className="text-left" style={{ color: "var(--brand-gray)" }}>
                      <th className="px-4 py-3 font-medium">Leçon</th>
                      <th className="px-4 py-3 font-medium">Temps</th>
                      <th className="px-4 py-3 font-medium">Vues</th>
                      <th className="px-4 py-3 font-medium">Élèves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_lessons.map((lesson) => (
                      <tr key={lesson.lesson_id} className="border-t border-[#f0e8df]">
                        <td className="px-4 py-3">
                          <p className="font-medium" style={{ color: "var(--brand-black)" }}>
                            {lesson.lesson_title}
                          </p>
                          <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
                            {lesson.course_title}
                          </p>
                        </td>
                        <td className="px-4 py-3">{formatWatchDuration(lesson.total_seconds)}</td>
                        <td className="px-4 py-3">{lesson.view_count}</td>
                        <td className="px-4 py-3">{lesson.unique_students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Cours les plus suivis */}
          <div className="bg-white rounded-lg border border-[#e8ddd4] overflow-x-auto">
            <div className="px-4 py-3 border-b border-[#f0e8df]">
              <h3 className="font-semibold" style={{ color: "var(--brand-brown)" }}>
                Cours les plus suivis
              </h3>
            </div>
            {summary.top_courses.length === 0 ? (
              <p className="p-6 text-sm text-center" style={{ color: "var(--brand-gray)" }}>
                Pas encore de données
              </p>
            ) : (
              <table className="w-full text-sm min-w-[480px]">
                <thead className="bg-[var(--brand-bg)]">
                  <tr className="text-left" style={{ color: "var(--brand-gray)" }}>
                    <th className="px-4 py-3 font-medium">Cours</th>
                    <th className="px-4 py-3 font-medium">Temps total</th>
                    <th className="px-4 py-3 font-medium">Élèves uniques</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.top_courses.map((course) => (
                    <tr key={course.course_id} className="border-t border-[#f0e8df]">
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--brand-black)" }}>
                        {course.course_title}
                      </td>
                      <td className="px-4 py-3">{formatWatchDuration(course.total_seconds)}</td>
                      <td className="px-4 py-3">{course.unique_students}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
