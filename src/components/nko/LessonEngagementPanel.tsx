"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp, Paperclip, MessageCircle, Send, Download } from "lucide-react";
import toast from "react-hot-toast";

interface LessonAttachment {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  download_url: string;
}

interface LessonQuestion {
  id: string;
  author_name: string;
  text: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
}

interface LessonReactions {
  likes: number;
  dislikes: number;
  user_vote: "like" | "dislike" | null;
}

interface LessonEngagementPanelProps {
  courseId: string;
  lessonId: string;
  attachments: LessonAttachment[];
  questions: LessonQuestion[];
  reactions: LessonReactions;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** Likes, pièces jointes et questions sur une leçon */
const LessonEngagementPanel = ({
  courseId,
  lessonId,
  attachments,
  questions: initialQuestions,
  reactions: initialReactions,
}: LessonEngagementPanelProps) => {
  const [reactions, setReactions] = useState(initialReactions);
  const [questions, setQuestions] = useState(initialQuestions);
  const [questionText, setQuestionText] = useState("");
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("nko_student_name") ?? "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (vote: "like" | "dislike"): Promise<void> => {
    if (isVoting) return;
    setIsVoting(true);
    const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote }),
    });
    const result = await res.json();
    setIsVoting(false);

    if (result.error) {
      toast.error(result.message ?? "Impossible d'enregistrer le vote");
      return;
    }

    setReactions({
      likes: result.data.likes,
      dislikes: result.data.dislikes,
      user_vote: result.data.user_vote,
    });
  };

  const handleSubmitQuestion = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const text = questionText.trim();
    if (text.length < 3) {
      toast.error("Écrivez au moins 3 caractères");
      return;
    }

    if (authorName.trim()) {
      localStorage.setItem("nko_student_name", authorName.trim());
    }

    setIsSubmitting(true);
    const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, author_name: authorName.trim() || "Étudiant" }),
    });
    const result = await res.json();
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.message ?? "Impossible d'envoyer la question");
      return;
    }

    setQuestions((prev) => [result.data, ...prev]);
    setQuestionText("");
    toast.success("Question envoyée");
  };

  return (
    <div className="space-y-6">
      {/* Like / dislike */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium" style={{ color: "var(--brand-brown)" }}>
          Cette vidéo vous a plu ?
        </span>
        <button
          type="button"
          onClick={() => handleVote("like")}
          disabled={isVoting}
          aria-label="J'aime"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            reactions.user_vote === "like"
              ? "border-green-500 bg-green-50 text-green-700"
              : "border-[#e8ddd4] hover:bg-white"
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          {reactions.likes}
        </button>
        <button
          type="button"
          onClick={() => handleVote("dislike")}
          disabled={isVoting}
          aria-label="Je n'aime pas"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
            reactions.user_vote === "dislike"
              ? "border-red-400 bg-red-50 text-red-600"
              : "border-[#e8ddd4] hover:bg-white"
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          {reactions.dislikes}
        </button>
      </div>

      {/* Pièces jointes */}
      {attachments.length > 0 && (
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: "var(--brand-brown)" }}>
            <Paperclip className="w-4 h-4" />
            Documents de la leçon
          </h3>
          <ul className="space-y-2">
            {attachments.map((att) => (
              <li key={att.id}>
                <a
                  href={att.download_url}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-[#f0e8df] hover:bg-[var(--brand-bg)] text-sm transition-colors"
                  download
                >
                  <span className="truncate" style={{ color: "var(--brand-black)" }}>{att.original_name}</span>
                  <span className="flex items-center gap-2 flex-shrink-0 text-xs" style={{ color: "var(--brand-gray)" }}>
                    {formatFileSize(att.size_bytes)}
                    <Download className="w-3.5 h-3.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions */}
      <div className="bg-white rounded-lg border border-[#e8ddd4] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: "var(--brand-brown)" }}>
          <MessageCircle className="w-4 h-4" />
          Poser une question
        </h3>

        <form onSubmit={handleSubmitQuestion} className="space-y-3 mb-4">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Votre prénom (optionnel)"
            className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
            maxLength={60}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Écrivez votre question sur cette leçon..."
              className="flex-1 px-3 py-2 border border-[#e8ddd4] rounded text-sm min-h-[80px] resize-y"
              maxLength={1000}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="sm:self-end inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </form>

        {questions.length > 0 ? (
          <ul className="space-y-3 border-t border-[#f0e8df] pt-4">
            {questions.map((q) => (
              <li key={q.id} className="text-sm rounded-lg p-3" style={{ backgroundColor: "var(--brand-bg)" }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium" style={{ color: "var(--brand-brown)" }}>{q.author_name}</span>
                  <time className="text-xs" style={{ color: "var(--brand-gray)" }} dateTime={q.created_at}>
                    {formatDate(q.created_at)}
                  </time>
                </div>
                <p style={{ color: "var(--brand-black)" }}>{q.text}</p>
                {q.admin_reply && (
                  <div className="mt-2 rounded-lg p-3 border border-green-200 bg-green-50">
                    <p className="text-xs font-semibold text-green-800 mb-1">Réponse de l'équipe</p>
                    <p className="text-green-900">{q.admin_reply}</p>
                    {q.admin_replied_at && (
                      <time className="text-[10px] text-green-700 mt-1 block" dateTime={q.admin_replied_at}>
                        {formatDate(q.admin_replied_at)}
                      </time>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs border-t border-[#f0e8df] pt-4" style={{ color: "var(--brand-gray)" }}>
            Aucune question pour le moment. Soyez le premier à poser la vôtre.
          </p>
        )}
      </div>
    </div>
  );
};

export default LessonEngagementPanel;
