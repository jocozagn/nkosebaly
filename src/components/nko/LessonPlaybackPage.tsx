"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import ProtectedVideoPlayer from "./ProtectedVideoPlayer";
import LessonEngagementPanel from "./LessonEngagementPanel";
import LessonQuizPanel from "./LessonQuizPanel";

interface LessonPlaybackPageProps {
  courseId: string;
  lessonId: string;
}

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

interface PlaybackData {
  title: string;
  course_title: string;
  stream_url: string;
  attachments: LessonAttachment[];
  questions: LessonQuestion[];
  reactions: { likes: number; dislikes: number; user_vote: "like" | "dislike" | null };
}

interface QuizMeta {
  score: number;
  total: number;
  passed: boolean;
}

/** Page de lecture vidéo — quiz ouvrable après la leçon ou via bouton Exercice */
const LessonPlaybackPage = ({ courseId, lessonId }: LessonPlaybackPageProps) => {
  const [data, setData] = useState<PlaybackData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [quizMeta, setQuizMeta] = useState<QuizMeta | null>(null);
  const quizSectionRef = useRef<HTMLDivElement>(null);
  const pendingQuizOpenRef = useRef(false);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/lessons/${lessonId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) {
          setError(res.message ?? "Accès refusé");
        } else {
          setData(res.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger la vidéo");
        setIsLoading(false);
      });
  }, [courseId, lessonId]);

  const handleOpenQuiz = useCallback((): void => {
    setQuizOpen(true);
    setTimeout(() => {
      quizSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleLessonCompleted = useCallback((): void => {
    setVideoCompleted(true);
    pendingQuizOpenRef.current = true;
    if (hasQuiz) {
      setQuizOpen(true);
      pendingQuizOpenRef.current = false;
      setTimeout(() => {
        quizSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [hasQuiz]);

  const handleHasQuiz = useCallback((exists: boolean, previous: QuizMeta | null): void => {
    setHasQuiz(exists);
    if (previous) setQuizMeta(previous);
    if (exists && pendingQuizOpenRef.current) {
      pendingQuizOpenRef.current = false;
      setQuizOpen(true);
      setTimeout(() => {
        quizSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, []);

  const handleQuizSubmitted = useCallback((result: QuizMeta): void => {
    setQuizMeta(result);
  }, []);

  return (
    <NkoShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm mb-6 hover:underline"
          style={{ color: "var(--brand-brown)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Retour au cours
        </Link>

        {isLoading ? (
          <BrandLoader variant="inline" message="Préparation de la vidéo..." />
        ) : error || !data ? (
          <div className="bg-white rounded-lg border border-[#e8ddd4] p-8 text-center">
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>{error || "Vidéo indisponible"}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--brand-gray)" }}>{data.course_title}</p>
              <h1 className="text-xl font-bold" style={{ color: "var(--brand-brown)" }}>{data.title}</h1>
            </div>

            <ProtectedVideoPlayer
              streamUrl={data.stream_url}
              title={data.title}
              courseId={courseId}
              lessonId={lessonId}
              onLessonCompleted={handleLessonCompleted}
            />

            {/* Bouton Exercice — visible si la leçon a un quiz et que le panneau est fermé */}
            {hasQuiz && !quizOpen && (
              <div className="bg-white rounded-lg border border-[#e8ddd4] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 flex-shrink-0" style={{ color: "var(--brand-brown)" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>
                      Exercice
                    </p>
                    <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
                      {videoCompleted
                        ? "Leçon terminée — passez le quiz pour valider vos acquis"
                        : "Quiz disponible — vous pouvez le faire maintenant ou après la vidéo"}
                      {quizMeta ? ` · Dernier score : ${quizMeta.score}/${quizMeta.total}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenQuiz}
                  className="text-sm px-5 py-2.5 rounded text-white font-semibold flex-shrink-0"
                  style={{ backgroundColor: "var(--brand-brown)" }}
                  aria-label="Ouvrir l'exercice quiz"
                >
                  {quizMeta ? "Refaire l'exercice" : "Faire l'exercice"}
                </button>
              </div>
            )}

            <div ref={quizSectionRef}>
              <LessonQuizPanel
                courseId={courseId}
                lessonId={lessonId}
                isOpen={quizOpen}
                onHasQuiz={handleHasQuiz}
                onSubmitted={handleQuizSubmitted}
              />
            </div>

            <LessonEngagementPanel
              courseId={courseId}
              lessonId={lessonId}
              attachments={data.attachments}
              questions={data.questions}
              reactions={data.reactions}
            />
          </div>
        )}
      </div>
    </NkoShell>
  );
};

export default LessonPlaybackPage;
