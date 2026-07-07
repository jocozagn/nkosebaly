"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import BrandLoader from "@/components/ui/BrandLoader";
import type { AdminCategory, AdminCourse, CourseLevel } from "@/lib/admin/types";

interface CourseFormProps {
  courseId?: string;
}

/** Formulaire création / édition de cours */
const AdminCourseForm = ({ courseId }: CourseFormProps) => {
  const router = useRouter();
  const isEdit = Boolean(courseId);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [level, setLevel] = useState<CourseLevel>("debutant");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [sequentialAccess, setSequentialAccess] = useState(true);
  const [lessonCount, setLessonCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error && res.data?.length) {
          setCategories(res.data);
          setCategoryId(res.data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!courseId) return;

    fetch(`/api/admin/courses/${courseId}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.error && res.data) {
          const c = res.data as AdminCourse;
          setTitle(c.title);
          setShortDescription(c.short_description);
          setLevel(c.level);
          setCategoryId(c.category_id);
          setLessonCount(c.lessons_count);
          setStatus(c.status);
          setSequentialAccess(c.sequential_access !== false);
        }
        setIsFetching(false);
      });
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const payload = {
      title,
      short_description: shortDescription,
      level,
      category_id: categoryId,
      status,
      sequential_access: sequentialAccess,
    };

    const url = isEdit ? `/api/admin/courses/${courseId}` : "/api/admin/courses";
    const method = isEdit ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    setIsLoading(false);

    if (result.error) {
      setError(result.message ?? "Une erreur est survenue");
      toast.error(result.message ?? "Échec de l'enregistrement");
      return;
    }

    if (isEdit) {
      toast.success("Cours mis à jour avec succès");
      router.push("/admin/courses");
      return;
    }

    toast.success("Cours créé avec succès ! Ajoutez vos leçons.");
    router.push(`/admin/courses/${result.data.id}/curriculum`);
  };

  if (isFetching) {
    return <BrandLoader variant="inline" message="Chargement du cours..." />;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--brand-black)" }}>
        {isEdit ? "Modifier le cours" : "Nouveau cours"}
      </h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#e8ddd4] p-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">Titre du cours *</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-brown)]"
            placeholder="Introduction au N'ko Mandingue"
          />
        </div>

        <div>
          <label htmlFor="desc" className="block text-sm font-medium mb-1">Description courte</label>
          <textarea
            id="desc"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-brown)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="level" className="block text-sm font-medium mb-1">Niveau</label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value as CourseLevel)}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-brown)]"
            >
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="avance">Avancé</option>
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-1">Catégorie</label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-brown)]"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-start gap-3 p-4 rounded-lg border border-[#e8ddd4] cursor-pointer" style={{ backgroundColor: "var(--brand-bg)" }}>
          <input
            type="checkbox"
            checked={sequentialAccess}
            onChange={(e) => setSequentialAccess(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[#e8ddd4]"
            aria-label="Parcours chronologique"
          />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--brand-brown)" }}>Parcours chronologique</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--brand-gray)" }}>
              L&apos;élève doit terminer chaque leçon avant d&apos;accéder à la suivante. Recommandé pour le N&apos;ko.
            </p>
          </div>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isEdit && (
            <div>
              <label className="block text-sm font-medium mb-1">Leçons dans le curriculum</label>
              <p
                className="px-4 py-2.5 rounded text-sm font-semibold"
                style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-brown)" }}
              >
                {lessonCount} leçon{lessonCount > 1 ? "s" : ""} — calculé automatiquement
              </p>
            </div>
          )}

          <div>
            <label htmlFor="status" className="block text-sm font-medium mb-1">Statut</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-brown)]"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
            </select>
          </div>
        </div>

        {!isEdit && (
          <p className="text-xs rounded-lg p-3 border border-[#e8ddd4]" style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-gray)" }}>
            Après la création, vous serez redirigé vers le <strong>curriculum</strong> pour ajouter chapitres et leçons. Le nombre de leçons se met à jour tout seul.
          </p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 text-white font-semibold rounded flex items-center gap-2"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer le cours"}
          </button>
          <Link
            href="/admin/courses"
            className="px-6 py-2.5 border rounded font-medium"
            style={{ borderColor: "var(--brand-brown)", color: "var(--brand-brown)" }}
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
};

export default AdminCourseForm;
