"use client";

import { useState } from "react";
import { X, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import VideoUploadField from "@/components/admin/VideoUploadField";
import { formatDurationMinutes } from "@/utils/videoDuration";
import type { AdminChapter, AdminLesson } from "@/lib/admin/types";

interface LessonEditFormProps {
  lesson: AdminLesson;
  chapters: AdminChapter[];
  onSaved: () => void;
  onCancel: () => void;
}

/** Formulaire de modification d'une leçon (titre, chapitre, vidéo) */
const LessonEditForm = ({ lesson, chapters, onSaved, onCancel }: LessonEditFormProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [chapterId, setChapterId] = useState(lesson.chapter_id);
  const [durationMinutes, setDurationMinutes] = useState(lesson.duration_minutes);
  const [videoId, setVideoId] = useState(lesson.video_id ?? "");
  const [newVideoUploaded, setNewVideoUploaded] = useState(false);

  const handleVideoUploaded = (id: string, minutes: number): void => {
    setVideoId(id);
    setDurationMinutes(minutes);
    setNewVideoUploaded(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (!videoId) {
      toast.error("Une vidéo est requise");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/lessons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lesson.id,
          title: title.trim(),
          chapter_id: chapterId,
          video_id: videoId,
          duration_minutes: durationMinutes,
        }),
      });
      const result = await res.json();

      if (result.error) {
        toast.error(result.message ?? "Échec de la modification");
        return;
      }

      toast.success("Leçon modifiée");
      onSaved();
    } catch {
      toast.error("Connexion au serveur impossible");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-3 p-3 rounded border border-[#e8ddd4] bg-[var(--brand-bg)] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "var(--brand-brown)" }}>
          Modifier la leçon
        </span>
        <button type="button" onClick={onCancel} aria-label="Annuler">
          <X className="w-4 h-4" style={{ color: "var(--brand-gray)" }} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de la leçon"
          className="px-3 py-2 border border-[#e8ddd4] rounded text-sm bg-white"
        />
        <select
          value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}
          className="px-3 py-2 border border-[#e8ddd4] rounded text-sm bg-white"
        >
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.order}. {ch.title}
            </option>
          ))}
        </select>
      </div>

      <div className="text-xs space-y-1" style={{ color: "var(--brand-gray)" }}>
        <p>
          Vidéo actuelle :{" "}
          {lesson.video_id ? (
            <span className="inline-flex items-center gap-1 text-green-700">
              <CheckCircle className="w-3 h-3" /> hébergée ({formatDurationMinutes(lesson.duration_minutes)})
            </span>
          ) : (
            "aucune"
          )}
        </p>
        <p>Remplacez la vidéo ci-dessous (optionnel) :</p>
      </div>

      <VideoUploadField onUploaded={handleVideoUploaded} disabled={isSaving} />

      {newVideoUploaded && (
        <p className="text-xs font-medium" style={{ color: "var(--brand-brown)" }}>
          Nouvelle vidéo : {formatDurationMinutes(durationMinutes)}
        </p>
      )}

      <button
        type="button"
        disabled={isSaving}
        onClick={() => void handleSave()}
        className="px-4 py-2 text-white text-xs font-semibold rounded disabled:opacity-50"
        style={{ backgroundColor: "var(--brand-brown)" }}
      >
        {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
      </button>
    </div>
  );
};

export default LessonEditForm;
