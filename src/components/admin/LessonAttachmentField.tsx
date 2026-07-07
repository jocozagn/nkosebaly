"use client";

import { useRef, useState } from "react";
import { Paperclip, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import type { AdminLessonAttachment } from "@/lib/admin/types";

interface LessonAttachmentFieldProps {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
  attachments: AdminLessonAttachment[];
  onChanged: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

/** Upload et gestion des pièces jointes d'une leçon (admin) */
const LessonAttachmentField = ({
  lessonId,
  courseId,
  lessonTitle,
  attachments,
  onChanged,
}: LessonAttachmentFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("lesson_id", lessonId);
    formData.append("course_id", courseId);

    try {
      const res = await fetch("/api/admin/attachments", { method: "POST", body: formData });
      const result = await res.json();

      if (result.error) {
        toast.error(result.message ?? "Échec de l'upload");
        return;
      }

      toast.success("Pièce jointe ajoutée");
      onChanged();
    } catch {
      toast.error("Connexion au serveur impossible");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Supprimer cette pièce jointe ?")) return;

    try {
      await fetch(`/api/admin/attachments?id=${id}`, { method: "DELETE" });
      toast.success("Pièce jointe supprimée");
      onChanged();
    } catch {
      toast.error("Connexion au serveur impossible");
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-[#e8ddd4]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs flex items-center gap-1" style={{ color: "var(--brand-gray)" }}>
          <Paperclip className="w-3 h-3" />
          Pièces jointes — {lessonTitle}
        </span>
        <label className="cursor-pointer">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.ppt,.pptx,.txt"
            onChange={handleUpload}
            disabled={isUploading}
            aria-label={`Ajouter une pièce jointe pour ${lessonTitle}`}
          />
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-[#e8ddd4] hover:bg-[var(--brand-bg)]"
            style={{ color: "var(--brand-brown)" }}
          >
            <Upload className="w-3 h-3" />
            {isUploading ? "Upload..." : "Ajouter"}
          </span>
        </label>
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--brand-gray)" }}>Aucune pièce jointe</p>
      ) : (
        <ul className="space-y-1">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded bg-[var(--brand-bg)]">
              <span className="truncate" style={{ color: "var(--brand-black)" }}>{att.original_name}</span>
              <span className="flex items-center gap-2 flex-shrink-0">
                <span style={{ color: "var(--brand-gray)" }}>{formatFileSize(att.size_bytes)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(att.id)}
                  className="p-0.5 rounded hover:bg-red-50"
                  aria-label="Supprimer pièce jointe"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LessonAttachmentField;
