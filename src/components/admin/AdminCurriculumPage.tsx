"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Video, CheckCircle, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import BrandLoader from "@/components/ui/BrandLoader";
import VideoUploadField from "@/components/admin/VideoUploadField";
import LessonAttachmentField from "@/components/admin/LessonAttachmentField";
import LessonQuestionsField from "@/components/admin/LessonQuestionsField";
import LessonQuizField from "@/components/admin/LessonQuizField";
import LessonEditForm from "@/components/admin/LessonEditForm";
import { formatDurationMinutes } from "@/utils/videoDuration";
import type { AdminChapter, AdminCourse, AdminLesson, AdminLessonAttachment, AdminLessonQuestion, AdminLessonQuizItem } from "@/lib/admin/types";

interface AdminCurriculumPageProps {
  courseId: string;
}

/** Gestion chapitres et leçons d'un cours */
const AdminCurriculumPage = ({ courseId }: AdminCurriculumPageProps) => {
  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [attachmentsByLesson, setAttachmentsByLesson] = useState<Record<string, AdminLessonAttachment[]>>({});
  const [questionsByLesson, setQuestionsByLesson] = useState<Record<string, AdminLessonQuestion[]>>({});
  const [quizItemsByLesson, setQuizItemsByLesson] = useState<Record<string, AdminLessonQuizItem[]>>({});
  const [loadError, setLoadError] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [lessonForm, setLessonForm] = useState({ chapter_id: "", title: "", duration_minutes: 0 });
  const [uploadedVideoId, setUploadedVideoId] = useState("");
  const [hasVideo, setHasVideo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");

    try {
      const res = await fetch(`/api/admin/curriculum?course_id=${courseId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.error) {
        setLoadError(json.message ?? "Impossible de charger le curriculum");
        setIsLoading(false);
        return;
      }

      const bundle = json.data;
      setCourse(bundle.course ?? null);
      setChapters(bundle.chapters ?? []);
      setLessons(bundle.lessons ?? []);
      setAttachmentsByLesson(bundle.attachmentsByLesson ?? {});
      setQuestionsByLesson(bundle.questionsByLesson ?? {});
      setQuizItemsByLesson(bundle.quizItemsByLesson ?? {});
    } catch {
      setLoadError("Connexion au serveur impossible. Vérifiez que l'application tourne puis réessayez.");
      toast.error("Échec du chargement du curriculum");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId]);

  const handleAddChapter = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!chapterTitle.trim()) return;
    await fetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: courseId, title: chapterTitle }),
    });
    setChapterTitle("");
    toast.success("Chapitre ajouté");
    loadData();
  };

  const handleDeleteChapter = async (id: string): Promise<void> => {
    if (!confirm("Supprimer ce chapitre et ses leçons ?")) return;
    await fetch(`/api/admin/chapters?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const handleAddLesson = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!lessonForm.chapter_id || !lessonForm.title.trim()) return;
    if (!uploadedVideoId) {
      alert("Veuillez uploader une vidéo avant d'ajouter la leçon.");
      return;
    }

    setIsSubmitting(true);
    const res = await fetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lessonForm, course_id: courseId, video_id: uploadedVideoId }),
    });
    const result = await res.json();
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.message ?? "Échec de l'ajout");
      return;
    }

    toast.success(`Leçon ajoutée (${formatDurationMinutes(lessonForm.duration_minutes)})`);
    setLessonForm({ chapter_id: lessonForm.chapter_id, title: "", duration_minutes: 0 });
    setUploadedVideoId("");
    setHasVideo(false);
    loadData();
  };

  const handleVideoUploaded = (videoId: string, durationMinutes: number): void => {
    setUploadedVideoId(videoId);
    setHasVideo(true);
    setLessonForm((prev) => ({ ...prev, duration_minutes: durationMinutes }));
  };

  const handleDeleteLesson = async (id: string): Promise<void> => {
    if (!confirm("Supprimer cette leçon ?")) return;
    await fetch(`/api/admin/lessons?id=${id}`, { method: "DELETE" });
    loadData();
  };

  if (isLoading) {
    return <BrandLoader variant="inline" message="Chargement du curriculum..." />;
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-lg border border-[#e8ddd4] p-8 text-center space-y-4">
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>{loadError}</p>
        <button
          type="button"
          onClick={() => void loadData()}
          className="px-5 py-2.5 text-white text-sm font-semibold rounded"
          style={{ backgroundColor: "var(--brand-brown)" }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/admin/courses" className="p-2 rounded hover:bg-white border border-[#e8ddd4]" aria-label="Retour">
          <ArrowLeft className="w-5 h-5" style={{ color: "var(--brand-brown)" }} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Curriculum</h2>
          <p className="text-sm" style={{ color: "var(--brand-gray)" }}>{course?.title ?? "Cours"}</p>
          {course && (
            <p className="text-xs mt-1" style={{ color: "var(--brand-brown)" }}>
              {course.lessons_count} leçon{course.lessons_count > 1 ? "s" : ""} au total
            </p>
          )}
        </div>
      </div>

      {/* Ajouter chapitre */}
      <form onSubmit={handleAddChapter} className="bg-white rounded-lg border border-[#e8ddd4] p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={chapterTitle}
          onChange={(e) => setChapterTitle(e.target.value)}
          placeholder="Titre du chapitre"
          className="flex-1 px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
        />
        <button type="submit" className="px-5 py-2.5 text-white text-sm font-semibold rounded flex items-center gap-2" style={{ backgroundColor: "var(--brand-brown)" }}>
          <Plus className="w-4 h-4" /> Chapitre
        </button>
      </form>

      {/* Liste chapitres + leçons */}
      {chapters.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--brand-gray)" }}>Aucun chapitre. Ajoutez-en un ci-dessus.</p>
      ) : (
        <div className="space-y-4">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="bg-white rounded-lg border border-[#e8ddd4] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0e8df]" style={{ backgroundColor: "var(--brand-bg)" }}>
                <h3 className="font-semibold text-sm" style={{ color: "var(--brand-brown)" }}>{chapter.order}. {chapter.title}</h3>
                <button type="button" onClick={() => handleDeleteChapter(chapter.id)} className="p-1.5 rounded hover:bg-red-50" aria-label="Supprimer chapitre">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {lessons.filter((l) => l.chapter_id === chapter.id).map((lesson) => (
                  <div key={lesson.id} className="py-2 px-3 rounded border border-[#f0e8df] text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video className="w-4 h-4 flex-shrink-0" style={{ color: "var(--brand-sky)" }} />
                        <span className="truncate" style={{ color: "var(--brand-black)" }}>{lesson.title}</span>
                        <span className="text-xs flex-shrink-0" style={{ color: "var(--brand-gray)" }}>{lesson.duration_minutes} min</span>
                        {lesson.video_id && (
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" aria-label="Vidéo hébergée" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingLessonId(lesson.id)}
                          className="p-1 rounded hover:bg-[var(--brand-bg)]"
                          aria-label="Modifier la leçon"
                          title="Modifier la leçon"
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: "var(--brand-brown)" }} />
                        </button>
                        <button type="button" onClick={() => handleDeleteLesson(lesson.id)} className="p-1 rounded hover:bg-red-50" aria-label="Supprimer leçon">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>

                    {editingLessonId === lesson.id && (
                      <LessonEditForm
                        lesson={lesson}
                        chapters={chapters}
                        onCancel={() => setEditingLessonId(null)}
                        onSaved={() => {
                          setEditingLessonId(null);
                          loadData();
                        }}
                      />
                    )}

                    <LessonAttachmentField
                      lessonId={lesson.id}
                      courseId={courseId}
                      lessonTitle={lesson.title}
                      attachments={attachmentsByLesson[lesson.id] ?? []}
                      onChanged={loadData}
                    />
                    <LessonQuestionsField
                      lessonId={lesson.id}
                      lessonTitle={lesson.title}
                      questions={questionsByLesson[lesson.id] ?? []}
                      onChanged={loadData}
                    />
                    <LessonQuizField
                      lessonId={lesson.id}
                      courseId={courseId}
                      lessonTitle={lesson.title}
                      items={quizItemsByLesson[lesson.id] ?? []}
                      onChanged={loadData}
                    />
                  </div>
                ))}
                {lessons.filter((l) => l.chapter_id === chapter.id).length === 0 && (
                  <p className="text-xs py-2" style={{ color: "var(--brand-gray)" }}>Aucune leçon</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ajouter leçon */}
      {chapters.length > 0 && (
        <form onSubmit={handleAddLesson} className="bg-white rounded-lg border border-[#e8ddd4] p-4 space-y-3">
          <h4 className="font-medium text-sm" style={{ color: "var(--brand-brown)" }}>Ajouter une leçon</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={lessonForm.chapter_id}
              onChange={(e) => setLessonForm({ ...lessonForm, chapter_id: e.target.value })}
              className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
              required
            >
              <option value="">Chapitre</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <input
              value={lessonForm.title}
              onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
              placeholder="Titre de la leçon"
              className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
              required
            />
            <VideoUploadField onUploaded={handleVideoUploaded} disabled={isSubmitting} />
            {hasVideo && lessonForm.duration_minutes > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded text-sm border border-[#e8ddd4]" style={{ backgroundColor: "var(--brand-bg)" }}>
                <span className="text-xs" style={{ color: "var(--brand-gray)" }}>Durée vidéo :</span>
                <span className="font-semibold" style={{ color: "var(--brand-brown)" }}>
                  {formatDurationMinutes(lessonForm.duration_minutes)}
                </span>
                <span className="text-xs" style={{ color: "var(--brand-gray)" }}>(auto)</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !uploadedVideoId}
            className="px-5 py-2.5 text-white text-sm font-semibold rounded disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            {isSubmitting ? "Enregistrement..." : "Ajouter la leçon"}
          </button>
        </form>
      )}
    </div>
  );
};

export default AdminCurriculumPage;
