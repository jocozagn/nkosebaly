"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PlayCircle, BookOpen, Lock, CheckCircle2, Award, ClipboardList } from "lucide-react";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import ProgressBar from "@/components/nko/ProgressBar";
import CertificateRequestCard, { type CertificateEligibility } from "./CertificateRequestCard";

interface PublicLesson {
  id: string;
  course_id: string;
  chapter_id: string;
  title: string;
  order: number;
  duration_minutes: number;
  has_video: boolean;
  has_quiz?: boolean;
  quiz_count?: number;
}

interface PublicChapter {
  id: string;
  title: string;
  order: number;
}

interface CourseDetails {
  id: string;
  title: string;
  short_description: string;
  level: string;
  lessons_count: number;
  chapters: PublicChapter[];
  lessons: PublicLesson[];
}

interface LessonProgressEntry {
  lesson_id: string;
  completed: boolean;
  watch_percent: number;
  unlocked?: boolean;
  has_quiz?: boolean;
  quiz_score?: number | null;
  quiz_total?: number | null;
  quiz_passed?: boolean | null;
}

interface NkoCourseDetailPageProps {
  courseId: string;
}

/** Détail d'un cours avec progression par leçon */
const NkoCourseDetailPage = ({ courseId }: NkoCourseDetailPageProps) => {
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [coursePercent, setCoursePercent] = useState(0);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgressEntry>>({});
  const [quizPassed, setQuizPassed] = useState(false);
  const [quizCanAttempt, setQuizCanAttempt] = useState(false);
  const [quizQuestionCount, setQuizQuestionCount] = useState(0);
  const [certEligibility, setCertEligibility] = useState<CertificateEligibility | null>(null);
  const [certificatePrice, setCertificatePrice] = useState(50000);
  const [sequentialAccess, setSequentialAccess] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/courses/public?id=${courseId}`).then((r) => r.json()),
      fetch(`/api/progress?course_id=${courseId}`).then((r) => r.json()),
      fetch(`/api/courses/${courseId}/quiz`).then((r) => r.json()),
      fetch("/api/certificates/my").then((r) => r.json()),
    ]).then(([courseRes, progressRes, quizRes, certRes]) => {
      if (!courseRes.error) setCourse(courseRes.data);

      if (!progressRes.error && progressRes.data) {
        setCoursePercent(progressRes.data.course?.percent ?? 0);
        setSequentialAccess(progressRes.data.sequential_access !== false);
        const map: Record<string, LessonProgressEntry> = {};
        for (const entry of (progressRes.data.lessons ?? []) as LessonProgressEntry[]) {
          map[entry.lesson_id] = entry;
        }
        setLessonProgress(map);
      }

      if (!quizRes.error && quizRes.data) {
        setQuizPassed(quizRes.data.passed);
        setQuizCanAttempt(quizRes.data.can_attempt);
        setQuizQuestionCount(quizRes.data.question_count);
      }

      if (!certRes.error && certRes.data?.eligibility) {
        const item = (certRes.data.eligibility as CertificateEligibility[]).find(
          (e) => e.course_id === courseId
        );
        if (item) setCertEligibility(item);
        setCertificatePrice(certRes.data.certificate_price ?? 50000);
      }

      setIsLoading(false);
    });
  }, [courseId]);

  if (isLoading) {
    return (
      <NkoShell>
        <BrandLoader variant="inline" message="Chargement du cours..." />
      </NkoShell>
    );
  }

  if (!course) {
    return (
      <NkoShell>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <p className="text-sm mb-4" style={{ color: "var(--brand-gray)" }}>Cours introuvable</p>
          <Link href="/dashboard" className="text-sm underline" style={{ color: "var(--brand-brown)" }}>Retour au tableau de bord</Link>
        </div>
      </NkoShell>
    );
  }

  return (
    <NkoShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm mb-6 hover:underline" style={{ color: "var(--brand-brown)" }}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--brand-brown)" }}>{course.title}</h1>
          <p className="text-sm" style={{ color: "var(--brand-gray)" }}>{course.short_description}</p>
          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "var(--brand-gray-dark)" }}>
            <span className="capitalize">{course.level}</span>
            <span>·</span>
            <span>{course.lessons_count} leçon{course.lessons_count > 1 ? "s" : ""}</span>
          </div>
          <div className="mt-4">
            <ProgressBar percent={coursePercent} label="Progression du cours" />
          </div>
          {sequentialAccess && (
            <p className="text-xs mt-2" style={{ color: "var(--brand-gray)" }}>
              Parcours chronologique — terminez chaque leçon pour débloquer la suivante.
            </p>
          )}

          {quizQuestionCount > 0 && (
            <div className="mt-4 p-4 rounded-lg border border-[#e8ddd4]" style={{ backgroundColor: "var(--brand-bg)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" style={{ color: "var(--brand-gold)" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>Quiz certifiant</p>
                    <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
                      {quizPassed
                        ? "Réussi — certificat à l'étape suivante"
                        : coursePercent < 100
                          ? "Terminez toutes les leçons pour débloquer"
                          : "Prêt à passer le quiz"}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/courses/${courseId}/quiz`}
                  className={`text-xs px-4 py-2 rounded text-center font-semibold ${
                    quizPassed
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "text-white"
                  }`}
                  style={quizPassed ? undefined : { backgroundColor: "var(--brand-brown)" }}
                >
                  {quizPassed ? "Quiz réussi ✓" : quizCanAttempt ? "Passer le quiz" : "Voir le quiz"}
                </Link>
              </div>
            </div>
          )}
        </div>

        {certEligibility && (
          <div className="mb-6">
            <CertificateRequestCard
              item={certEligibility}
              certificatePrice={certificatePrice}
              onUpdated={() => {
                fetch("/api/certificates/my")
                  .then((r) => r.json())
                  .then((res) => {
                    if (!res.error) {
                      const item = (res.data.eligibility as CertificateEligibility[]).find(
                        (e) => e.course_id === courseId
                      );
                      if (item) setCertEligibility(item);
                      setCertificatePrice(res.data.certificate_price ?? 50000);
                    }
                  });
              }}
            />
          </div>
        )}

        {course.chapters.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-[#d4c4b5] p-10 text-center" style={{ backgroundColor: "var(--brand-bg)" }}>
            <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--brand-tan)" }} />
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>Le contenu de ce cours sera bientôt disponible.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {course.chapters.map((chapter) => (
              <div key={chapter.id} className="bg-white rounded-lg border border-[#e8ddd4] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#f0e8df]" style={{ backgroundColor: "var(--brand-bg)" }}>
                  <h2 className="font-semibold text-sm" style={{ color: "var(--brand-brown)" }}>
                    {chapter.order}. {chapter.title}
                  </h2>
                </div>
                <div className="divide-y divide-[#f0e8df]">
                  {course.lessons
                    .filter((l) => l.chapter_id === chapter.id)
                    .map((lesson) => {
                      const progress = lessonProgress[lesson.id];
                      const isCompleted = progress?.completed;
                      const isUnlocked = progress?.unlocked !== false;
                      const isLocked = lesson.has_video && !isUnlocked && !isCompleted;

                      return (
                        <div
                          key={lesson.id}
                          className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 px-3 sm:px-4 py-3 ${isLocked ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600 mt-0.5" aria-label="Leçon terminée" />
                          ) : isLocked ? (
                            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--brand-gray)" }} aria-label="Leçon verrouillée" />
                          ) : (
                            <PlayCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--brand-sky)" }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--brand-black)" }}>{lesson.title}</p>
                            <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
                              {lesson.duration_minutes} min
                              {progress && !isCompleted && progress.watch_percent > 0
                                ? ` · ${progress.watch_percent}% visionné`
                                : ""}
                              {isCompleted ? " · Terminée" : isLocked ? " · Verrouillée" : ""}
                            </p>
                            {(lesson.has_quiz || progress?.has_quiz) && (
                              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--brand-brown)" }}>
                                <ClipboardList className="w-3 h-3 flex-shrink-0" />
                                Exercice
                                {progress?.quiz_score != null && progress.quiz_total != null
                                  ? ` · Score ${progress.quiz_score}/${progress.quiz_total}${progress.quiz_passed ? " ✓" : ""}`
                                  : ""}
                              </p>
                            )}
                          </div>
                          </div>
                          {lesson.has_video ? (
                            isLocked ? (
                              <span
                                className="text-xs px-3 py-2 rounded flex-shrink-0 flex items-center justify-center gap-1 border border-[#e8ddd4] w-full sm:w-auto"
                                style={{ color: "var(--brand-gray)" }}
                              >
                                <Lock className="w-3 h-3" />
                                Bloquée
                              </span>
                            ) : (
                              <Link
                                href={`/dashboard/courses/${courseId}/lessons/${lesson.id}`}
                                className="text-xs px-3 py-2 rounded text-white flex-shrink-0 flex items-center justify-center gap-1 w-full sm:w-auto"
                                style={{ backgroundColor: "var(--brand-brown)" }}
                              >
                                <PlayCircle className="w-3 h-3" />
                                {isCompleted ? "Revoir" : "Lire"}
                              </Link>
                            )
                          ) : (
                            <span className="text-xs" style={{ color: "var(--brand-gray)" }}>Bientôt</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </NkoShell>
  );
};

export default NkoCourseDetailPage;
