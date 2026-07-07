"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import toast from "react-hot-toast";
import type { AdminLessonQuestion } from "@/lib/admin/types";

interface LessonQuestionsFieldProps {
  lessonId: string;
  lessonTitle: string;
  questions: AdminLessonQuestion[];
  onChanged: () => void;
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Gestion et réponses aux questions d'une leçon (admin) */
const LessonQuestionsField = ({ lessonTitle, questions, onChanged }: LessonQuestionsFieldProps) => {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleReply = async (questionId: string): Promise<void> => {
    const reply = replyDrafts[questionId]?.trim();
    if (!reply || reply.length < 2) {
      toast.error("Écrivez une réponse d'au moins 2 caractères");
      return;
    }

    setSubmittingId(questionId);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: questionId, reply }),
      });
      const result = await res.json();

      if (result.error) {
        toast.error(result.message ?? "Échec de l'envoi");
        return;
      }

      setReplyDrafts((prev) => ({ ...prev, [questionId]: "" }));
      setEditingId(null);
      toast.success("Réponse publiée");
      onChanged();
    } catch {
      toast.error("Connexion au serveur impossible");
    } finally {
      setSubmittingId(null);
    }
  };

  const unanswered = questions.filter((q) => !q.admin_reply).length;

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-[#e8ddd4]">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-3 h-3" style={{ color: "var(--brand-brown)" }} />
        <span className="text-xs font-medium" style={{ color: "var(--brand-brown)" }}>
          Questions — {lessonTitle}
        </span>
        {unanswered > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
            {unanswered} sans réponse
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {questions.map((q) => (
          <li key={q.id} className="text-xs rounded p-2 border border-[#f0e8df]" style={{ backgroundColor: "var(--brand-bg)" }}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium" style={{ color: "var(--brand-black)" }}>{q.author_name}</span>
              <time style={{ color: "var(--brand-gray)" }} dateTime={q.created_at}>{formatDate(q.created_at)}</time>
            </div>
            <p className="mb-2" style={{ color: "var(--brand-black)" }}>{q.text}</p>

            {q.admin_reply && editingId !== q.id ? (
              <div className="rounded p-2 border border-green-200 bg-green-50">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="font-medium text-green-800">Votre réponse</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(q.id);
                      setReplyDrafts((prev) => ({ ...prev, [q.id]: q.admin_reply ?? "" }));
                    }}
                    className="text-[10px] underline text-green-800"
                  >
                    Modifier
                  </button>
                </div>
                <p className="text-green-900">{q.admin_reply}</p>
                {q.admin_replied_at && (
                  <time className="text-[10px] text-green-700 mt-1 block" dateTime={q.admin_replied_at}>
                    {formatDate(q.admin_replied_at)}
                  </time>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-1.5">
                <textarea
                  value={replyDrafts[q.id] ?? ""}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Écrire une réponse..."
                  className="flex-1 px-2 py-1.5 border border-[#e8ddd4] rounded text-xs min-h-[52px] resize-y"
                  maxLength={2000}
                />
                <button
                  type="button"
                  onClick={() => handleReply(q.id)}
                  disabled={submittingId === q.id}
                  className="sm:self-end inline-flex items-center justify-center gap-1 px-3 py-1.5 text-white text-xs font-semibold rounded disabled:opacity-50"
                  style={{ backgroundColor: "var(--brand-brown)" }}
                >
                  <Send className="w-3 h-3" />
                  {submittingId === q.id ? "..." : q.admin_reply ? "Mettre à jour" : "Répondre"}
                </button>
                {q.admin_reply && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setReplyDrafts((prev) => ({ ...prev, [q.id]: "" }));
                    }}
                    className="sm:self-end text-xs underline px-2"
                    style={{ color: "var(--brand-gray)" }}
                  >
                    Annuler
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LessonQuestionsField;
