"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookMarked, Pencil, Trash2 } from "lucide-react";
import BrandLoader from "@/components/ui/BrandLoader";
import type { AdminCourse } from "@/lib/admin/types";

/** Liste des cours admin */
const AdminCoursesPage = () => {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCourses = (): void => {
    setIsLoading(true);
    fetch("/api/admin/courses")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setCourses(res.data ?? []);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Supprimer ce cours ?")) return;
    await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    loadCourses();
  };

  const handleTogglePublish = async (course: AdminCourse): Promise<void> => {
    const newStatus = course.status === "published" ? "draft" : "published";
    await fetch(`/api/admin/courses/${course.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadCourses();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Gestion des cours</h2>
          <p className="text-sm" style={{ color: "var(--brand-gray)" }}>Créez et publiez vos cours N&apos;ko</p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center justify-center px-5 py-2.5 text-white text-sm font-semibold rounded"
          style={{ backgroundColor: "var(--brand-brown)" }}
        >
          + Ajouter un cours
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-[#e8ddd4] overflow-hidden">
        {isLoading ? (
          <BrandLoader variant="inline" message="Chargement des cours..." />
        ) : courses.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: "var(--brand-gray)" }}>
            Aucun cours. <Link href="/admin/courses/new" className="underline" style={{ color: "var(--brand-brown)" }}>Créer un cours</Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--brand-bg)]">
                <tr className="text-left" style={{ color: "var(--brand-gray)" }}>
                  <th className="px-4 py-3 font-medium">Titre</th>
                  <th className="px-4 py-3 font-medium">Niveau</th>
                  <th className="px-4 py-3 font-medium">Leçons</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-t border-[#f0e8df]">
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: "var(--brand-black)" }}>{course.title}</p>
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--brand-gray)" }}>{course.short_description}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{course.level}</td>
                    <td className="px-4 py-3">{course.lessons_count}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(course)}
                        className="px-2 py-0.5 rounded text-xs font-medium text-white cursor-pointer"
                        style={{ backgroundColor: course.status === "published" ? "var(--brand-green)" : "var(--brand-gray)" }}
                      >
                        {course.status === "published" ? "Publié" : "Brouillon"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/courses/${course.id}/curriculum`}
                          className="p-2 rounded hover:bg-[var(--brand-bg)]"
                          aria-label="Curriculum"
                          title="Curriculum"
                        >
                          <BookMarked className="w-4 h-4" style={{ color: "var(--brand-sky)" }} />
                        </Link>
                        <Link
                          href={`/admin/courses/${course.id}/edit`}
                          className="p-2 rounded hover:bg-[var(--brand-bg)]"
                          aria-label="Modifier"
                        >
                          <Pencil className="w-4 h-4" style={{ color: "var(--brand-brown)" }} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(course.id)}
                          className="p-2 rounded hover:bg-red-50"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
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

export default AdminCoursesPage;
