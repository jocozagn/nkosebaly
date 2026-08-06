"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import type { StudentLessonQuizAnswerPayload } from "@/lib/admin/types";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import TimedQuizPlayer, { type TimedQuizResult } from "./TimedQuizPlayer";
import type { QuizItemView } from "./LessonQuizQuestionField";
import CertificateRequestCard, { type CertificateEligibility } from "./CertificateRequestCard";

interface QuizState {
  course: { id: string; title: string };
  question_count: number;
  course_progress_percent: number;
  lessons_complete: boolean;
  lessons_watched?: boolean;
  lesson_quizzes_complete?: boolean;
  attempts_used: number;
  max_attempts: number;
  pass_required_score: number;
  pass_threshold_percent?: number;
  best_score: number;
  passed: boolean;
  can_attempt: boolean;
  time_limit_seconds?: number;
  questions: QuizItemView[];
}

interface CourseQuizPageProps {
  courseId: string;
}

type QuizStep = "intro" | "playing" | "result";

const CourseQuizPage = ({ courseId }: CourseQuizPageProps) => {
  const [state, setState] = useState<QuizState | null>(null);
  const [step, setStep] = useState<QuizStep>("intro");
  const [result, setResult] = useState<TimedQuizResult | null>(null);
  const [certEligibility, setCertEligibility] = useState<CertificateEligibility | null>(null);
  const [certificatePrice, setCertificatePrice] = useState(50000);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCertEligibility = async (): Promise<void> => {
    const res = await fetch("/api/certificates/my");
    const json = await res.json();
    if (!json.error) {
      const item = (json.data.eligibility as CertificateEligibility[]).find(
        (e) => e.course_id === courseId
      );
      if (item) setCertEligibility(item);
      setCertificatePrice(json.data.certificate_price ?? 50000);
    }
  };

  const loadQuiz = async (): Promise<void> => {
    setIsLoading(true);
    const res = await fetch(`/api/courses/${courseId}/quiz`);
    const json = await res.json();
    setIsLoading(false);

    if (json.error || !json.data) {
      toast.error(json.message ?? "Quiz indisponible");
      return;
    }

    setState(json.data);
    if (json.data.passed) setStep("result");
  };

  useEffect(() => {
    void loadQuiz();
    void loadCertEligibility();
  }, [courseId]);

  const handleSubmit = async (
    answers: StudentLessonQuizAnswerPayload[]
  ): Promise<TimedQuizResult | null> => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.message ?? "Échec de l'envoi");
        return null;
      }
      setResult(json.data);
      setStep("result");
      await loadQuiz();
      await loadCertEligibility();
      return json.data;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <NkoShell>
        <BrandLoader variant="inline" message="Chargement du quiz..." />
      </NkoShell>
    );
  }

  if (!state) {
    return (
      <NkoShell>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-sm mb-4" style={{ color: "var(--brand-gray)" }}>Quiz indisponible</p>
          <Link href={`/dashboard/courses/${courseId}`} className="text-sm underline" style={{ color: "var(--brand-brown)" }}>
            Retour au cours
          </Link>
        </div>
      </NkoShell>
    );
  }

  const passPercent = state.pass_threshold_percent ?? 80;

  return (
    <NkoShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm mb-6 hover:underline"
          style={{ color: "var(--brand-brown)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Retour au cours
        </Link>

        <div className="bg-white rounded-lg border border-[var(--border-color)] p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6" style={{ color: "var(--brand-gold)" }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--brand-brown)" }}>
                Quiz final certifiant
              </h1>
              <p className="text-sm" style={{ color: "var(--brand-gray)" }}>{state.course.title}</p>
            </div>
          </div>

          {step === "intro" && (
            <div className="space-y-4">
              {state.question_count === 0 ? (
                <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                  Ajoutez des exercices aux leçons pour activer le quiz final.
                </p>
              ) : (
                <>
                  <ul className="text-sm space-y-2" style={{ color: "var(--brand-gray-dark)" }}>
                    <li>{state.question_count} questions (tous les exercices du cours, mélangés)</li>
                    <li>Score requis : {state.pass_required_score} / {state.question_count} ({passPercent}%)</li>
                    <li>Tentatives : {state.attempts_used} / {state.max_attempts}</li>
                    <li>Progression vidéos : {state.course_progress_percent}%</li>
                  </ul>

                  {!state.lessons_watched && (
                    <p className="text-sm rounded-lg p-3 bg-amber-50 border border-amber-200 text-amber-800">
                      Terminez toutes les leçons vidéo avant le quiz final.
                    </p>
                  )}

                  {state.lessons_watched && state.lesson_quizzes_complete === false && (
                    <p className="text-sm rounded-lg p-3 bg-amber-50 border border-amber-200 text-amber-800">
                      Réussissez tous les exercices de leçon avant le quiz final.
                    </p>
                  )}

                  {state.passed && (
                    <p className="text-sm rounded-lg p-3 bg-green-50 border border-green-200 text-green-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Quiz déjà réussi — certificat disponible !
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setStep("playing")}
                    disabled={!state.can_attempt}
                    className="w-full px-4 py-3 text-white text-sm font-semibold rounded disabled:opacity-50"
                    style={{ backgroundColor: "var(--brand-brown)" }}
                  >
                    {state.can_attempt ? "Commencer le quiz final" : "Quiz non disponible"}
                  </button>
                </>
              )}
            </div>
          )}

          {step === "playing" && state.questions.length > 0 && (
            <TimedQuizPlayer
              items={state.questions}
              defaultTimeLimitSeconds={state.time_limit_seconds ?? 15}
              passPercent={passPercent}
              title="Quiz final"
              subtitle="Questions tirées de toutes les leçons"
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          )}

          {step === "result" && (
            <div className="text-center space-y-4">
              {(result?.passed || state.passed) ? (
                <CheckCircle2 className="w-16 h-16 mx-auto text-green-600" />
              ) : (
                <XCircle className="w-16 h-16 mx-auto text-red-400" />
              )}

              <h2 className="text-lg font-bold" style={{ color: "var(--brand-brown)" }}>
                {(result?.passed || state.passed) ? "Félicitations !" : "Quiz non réussi"}
              </h2>

              <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                Score : {result?.score ?? state.best_score} / {result?.total ?? state.question_count}
                {" "}(requis : {result?.pass_required ?? state.pass_required_score})
              </p>

              {(result?.passed || state.passed) ? (
                <div className="space-y-4">
                  <p className="text-sm text-green-700">
                    Quiz validé à {passPercent}% ou plus ! Vous pouvez obtenir votre certificat.
                  </p>
                  {certEligibility && (
                    <CertificateRequestCard
                      item={certEligibility}
                      compact
                      certificatePrice={certificatePrice}
                      onUpdated={loadCertEligibility}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                  Tentatives : {result?.attempts_used ?? state.attempts_used} / {state.max_attempts}
                </p>
              )}

              {!state.passed && state.can_attempt && (
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setStep("playing");
                  }}
                  className="px-5 py-2.5 text-white text-sm font-semibold rounded"
                  style={{ backgroundColor: "var(--brand-brown)" }}
                >
                  Réessayer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </NkoShell>
  );
};

export default CourseQuizPage;
