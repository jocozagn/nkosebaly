"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import ProgressBar from "@/components/nko/ProgressBar";
import CertificateRequestCard, { type CertificateEligibility } from "./CertificateRequestCard";

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  category: string;
  difficulty: string;
}

interface QuizState {
  course: { id: string; title: string };
  question_count: number;
  course_progress_percent: number;
  lessons_complete: boolean;
  attempts_used: number;
  max_attempts: number;
  pass_required_score: number;
  best_score: number;
  passed: boolean;
  can_attempt: boolean;
  questions: QuizQuestion[];
}

interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  pass_required: number;
  attempts_used: number;
  max_attempts: number;
}

interface CourseQuizPageProps {
  courseId: string;
}

type QuizStep = "intro" | "playing" | "result";

/** Quiz certifiant d'un cours */
const CourseQuizPage = ({ courseId }: CourseQuizPageProps) => {
  const [state, setState] = useState<QuizState | null>(null);
  const [step, setStep] = useState<QuizStep>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
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

  const handleStart = (): void => {
    setAnswers({});
    setCurrentIndex(0);
    setStep("playing");
  };

  const handleSelect = (questionId: string, optionIndex: number): void => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNext = (): void => {
    if (!state) return;
    if (currentIndex < state.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      return;
    }
    void handleSubmit();
  };

  const handleSubmit = async (): Promise<void> => {
    if (!state) return;

    const payload = state.questions.map((q) => ({
      question_id: q.id,
      selected: answers[q.id] ?? -1,
    }));

    if (payload.some((a) => a.selected < 0)) {
      toast.error("Répondez à toutes les questions");
      return;
    }

    setIsSubmitting(true);
    const res = await fetch(`/api/courses/${courseId}/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    const json = await res.json();
    setIsSubmitting(false);

    if (json.error) {
      toast.error(json.message ?? "Échec de l'envoi");
      return;
    }

    setResult(json.data);
    setStep("result");
    await loadQuiz();
    await loadCertEligibility();
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

  const currentQuestion = state.questions[currentIndex];
  const questionProgress = state.questions.length > 0
    ? Math.round(((currentIndex + 1) / state.questions.length) * 100)
    : 0;

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

        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6" style={{ color: "var(--brand-gold)" }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--brand-brown)" }}>
                Quiz certifiant
              </h1>
              <p className="text-sm" style={{ color: "var(--brand-gray)" }}>{state.course.title}</p>
            </div>
          </div>

          {step === "intro" && (
            <div className="space-y-4">
              {state.question_count === 0 ? (
                <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
                  Aucune question n&apos;a encore été ajoutée pour ce cours.
                </p>
              ) : (
                <>
                  <ul className="text-sm space-y-2" style={{ color: "var(--brand-gray-dark)" }}>
                    <li>{state.question_count} question{state.question_count > 1 ? "s" : ""}</li>
                    <li>Score requis : {state.pass_required_score} / {state.question_count}</li>
                    <li>Tentatives : {state.attempts_used} / {state.max_attempts}</li>
                    <li>Progression cours : {state.course_progress_percent}%</li>
                  </ul>

                  {!state.lessons_complete && (
                    <p className="text-sm rounded-lg p-3 bg-amber-50 border border-amber-200 text-amber-800">
                      Terminez toutes les leçons du cours avant de passer le quiz.
                    </p>
                  )}

                  {state.passed && (
                    <p className="text-sm rounded-lg p-3 bg-green-50 border border-green-200 text-green-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Quiz déjà réussi !
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={!state.can_attempt}
                    className="w-full px-4 py-3 text-white text-sm font-semibold rounded disabled:opacity-50"
                    style={{ backgroundColor: "var(--brand-brown)" }}
                  >
                    {state.can_attempt ? "Commencer le quiz" : "Quiz non disponible"}
                  </button>
                </>
              )}
            </div>
          )}

          {step === "playing" && currentQuestion && (
            <div className="space-y-5">
              <ProgressBar percent={questionProgress} label={`Question ${currentIndex + 1} / ${state.questions.length}`} size="sm" />

              <div>
                <p className="text-xs capitalize mb-2" style={{ color: "var(--brand-gray)" }}>
                  {currentQuestion.category} · {currentQuestion.difficulty}
                </p>
                <h2 className="text-base font-semibold" style={{ color: "var(--brand-black)" }}>
                  {currentQuestion.question_text}
                </h2>
              </div>

              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelect(currentQuestion.id, index)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                      answers[currentQuestion.id] === index
                        ? "border-[var(--brand-brown)] bg-[var(--brand-bg)]"
                        : "border-[#e8ddd4] hover:bg-[var(--brand-bg)]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={answers[currentQuestion.id] === undefined || isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-semibold rounded disabled:opacity-50"
                style={{ backgroundColor: "var(--brand-brown)" }}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {currentIndex < state.questions.length - 1 ? "Question suivante" : "Terminer le quiz"}
              </button>
            </div>
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
                    Quiz validé ! Vous pouvez maintenant payer et obtenir votre certificat.
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
                  Tentatives utilisées : {result?.attempts_used ?? state.attempts_used} / {state.max_attempts}
                </p>
              )}

              {!state.passed && state.can_attempt && (
                <button
                  type="button"
                  onClick={handleStart}
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
