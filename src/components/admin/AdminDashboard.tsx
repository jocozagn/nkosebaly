"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FolderOpen, Users, Award } from "lucide-react";
import type { AdminCourse } from "@/lib/admin/types";

/** Tableau de bord admin */
const AdminDashboard = () => {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [certCount, setCertCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/courses")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setCourses(res.data ?? []);
      });
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setUserCount((res.data ?? []).length);
      });
    fetch("/api/admin/certificates")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setCertCount((res.data ?? []).length);
      });
  }, []);

  const published = courses.filter((c) => c.status === "published").length;
  const drafts = courses.filter((c) => c.status === "draft").length;

  const stats = [
    { label: "Cours publiés", value: published, icon: BookOpen, color: "var(--brand-brown)" },
    { label: "Brouillons", value: drafts, icon: FolderOpen, color: "var(--brand-sky)" },
    { label: "Étudiants", value: userCount, icon: Users, color: "var(--brand-green)" },
    { label: "Certificats", value: certCount, icon: Award, color: "var(--brand-gold)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--brand-black)" }}>
          Tableau de bord
        </h2>
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
          Vue d&apos;ensemble de votre plateforme N&apos;ko
        </p>
        <div className="h-1 w-16 mt-3 bg-[var(--brand-gold)]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-[#e8ddd4] p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.color }}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--brand-gray)" }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#e8ddd4] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="font-semibold" style={{ color: "var(--brand-brown)" }}>Cours récents</h3>
          <Link
            href="/admin/courses/new"
            className="text-sm font-medium px-4 py-2 text-white rounded"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            + Nouveau cours
          </Link>
        </div>

        {courses.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "var(--brand-gray)" }}>
            Aucun cours pour le moment.{" "}
            <Link href="/admin/courses/new" className="underline" style={{ color: "var(--brand-brown)" }}>
              Créer le premier cours
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8ddd4] text-left" style={{ color: "var(--brand-gray)" }}>
                  <th className="pb-3 font-medium">Titre</th>
                  <th className="pb-3 font-medium">Niveau</th>
                  <th className="pb-3 font-medium">Statut</th>
                  <th className="pb-3 font-medium">Leçons</th>
                </tr>
              </thead>
              <tbody>
                {courses.slice(0, 5).map((course) => (
                  <tr key={course.id} className="border-b border-[#f0e8df]">
                    <td className="py-3 font-medium" style={{ color: "var(--brand-black)" }}>{course.title}</td>
                    <td className="py-3 capitalize">{course.level}</td>
                    <td className="py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: course.status === "published" ? "var(--brand-green)" : "var(--brand-gray)" }}
                      >
                        {course.status === "published" ? "Publié" : "Brouillon"}
                      </span>
                    </td>
                    <td className="py-3">{course.lessons_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
