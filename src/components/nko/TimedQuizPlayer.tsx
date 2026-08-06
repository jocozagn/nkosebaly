"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import type { StudentLessonQuizAnswerPayload } from "@/lib/admin/types";
import ProgressBar from "@/components/nko/ProgressBar";
import LessonQuizQuestionField, { type QuizItemView } from "./LessonQuizQuestionField";

export interface TimedQuizResult {
  score: number;
  total: number;
  passed: boolean;
  pass_required: number;
  attempts_used?: number;
  max_attempts?: number;
  details?: { item_id: string; correct: boolean }[];
}

interface TimedQuizPlayerProps {
  items: QuizItemView[];
  defaultTimeLimitSeconds: number;
  passPercent: number;
  title: string;
  subtitle?: string;
  isSubmitting?: boolean;
  requirePass?: boolean;
  onSubmit: (answers: StudentLessonQuizAnswerPayload[]) => Promise<TimedQuizResult | null>;
  onPassed?: (result: TimedQuizResult) => void;
}

type QuizStep = "intro" | "playing" | "result";

const buildTimeoutAnswer = (item: QuizItemView): StudentLessonQuizAnswerPayload => {
  switch (item.type) {
    case "single_choice":
      return { item_id: item.id, type: "single_choice", selected: -1 };
    case "multiple_choice":
      return { item_id: item.id, type: "multiple_choice", selected: [] };
    case "audio_pick_image":
      return { item_id: item.id, type: "audio_pick_image", selected: -1 };
    case "dictation":
      return { item_id: item.id, type: "dictation", text: "" };
    case "fill_blank_suggestions":
      return { item_id: item.id, type: "fill_blank_suggestions", word: "" };
    default:
      return { item_id: item.id, type: "single_choice", selected: -1 };
  }
};

/** Minuteur par question + soumission groupée */
const TimedQuizPlayer = ({
  items,
  defaultTimeLimitSeconds,
  passPercent,
  title,
  subtitle,
  isSubmitting = false,
  requirePass = false,
  onSubmit,
  onPassed,
}: TimedQuizPlayerProps) => {
  const [step, setStep] = useState<QuizStep>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentLessonQuizAnswerPayload>>({});
  const [timeLeft, setTimeLeft] = useState(defaultTimeLimitSeconds);
  const [result, setResult] = useState<TimedQuizResult | null>(null);
  const answersRef = useRef(answers);
  const currentIndexRef = useRef(currentIndex);

  answersRef.current = answers;
  currentIndexRef.current = currentIndex;

  const passRequired = items.length === 0 ? 0 : Math.max(1, Math.ceil((passPercent / 100) * items.length));
  const currentItem = items[currentIndex];

  const getTimeLimit = (item: QuizItemView): number =>
    item.time_limit_seconds && item.time_limit_seconds > 0
      ? item.time_limit_seconds
      : defaultTimeLimitSeconds;

  const submitAll = useCallback(async (): Promise<void> => {
    const payload = items.map((item) => answersRef.current[item.id] ?? buildTimeoutAnswer(item));
    const res = await onSubmit(payload);
    if (res) {
      setResult(res);
      setStep("result");
      if (res.passed) onPassed?.(res);
    }
  }, [items, onPassed, onSubmit]);

  const advanceQuestion = useCallback(async (): Promise<void> => {
    const idx = currentIndexRef.current;
    if (idx < items.length - 1) {
      setCurrentIndex(idx + 1);
      return;
    }
    await submitAll();
  }, [items.length, submitAll]);

  useEffect(() => {
    if (step !== "playing" || !currentItem) return;

    const limit = getTimeLimit(currentItem);
    setTimeLeft(limit);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const item = items[currentIndexRef.current];
          setAnswers((prevAnswers) => ({
            ...prevAnswers,
            [item.id]: prevAnswers[item.id] ?? buildTimeoutAnswer(item),
          }));
          void advanceQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, currentIndex, currentItem, items, advanceQuestion]);

  const handleStart = (): void => {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setStep("playing");
  };

  const handleAnswer = (answer: StudentLessonQuizAnswerPayload): void => {
    setAnswers((prev) => ({ ...prev, [answer.item_id]: answer }));
  };

  const isCurrentAnswered = (): boolean => {
    if (!currentItem) return false;
    const answer = answers[currentItem.id];
    if (!answer) return false;
    if (answer.type === "dictation") return answer.text.trim().length > 0;
    if (answer.type === "multiple_choice") return answer.selected.length > 0;
    if (answer.type === "fill_blank_suggestions") return answer.word.trim().length > 0;
    if (answer.type === "single_choice") return answer.selected >= 0;
    if (answer.type === "audio_pick_image") return answer.selected >= 0;
    return true;
  };

  const handleNext = (): void => {
    void advanceQuestion();
  };

  const handleRetry = (): void => {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
    setStep("intro");
  };

  if (items.length === 0) return null;

  const progressPercent = step === "playing"
    ? Math.round(((currentIndex + 1) / items.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg" style={{ color: "var(--brand-brown)" }}>{title}</h3>
        {subtitle && (
          <p className="text-xs mt-1" style={{ color: "var(--brand-gray)" }}>{subtitle}</p>
        )}
      </div>

      {step === "intro" && (
        <div className="space-y-4">
          <ul className="text-sm space-y-1" style={{ color: "var(--brand-gray-dark)" }}>
            <li>{items.length} question{items.length > 1 ? "s" : ""}</li>
            <li>Minuteur : {defaultTimeLimitSeconds}s par question</li>
            <li>Seuil de réussite : {passPercent}% ({passRequired}/{items.length})</li>
          </ul>
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3 text-white font-semibold rounded"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            Commencer
          </button>
        </div>
      )}

      {step === "playing" && currentItem && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <ProgressBar percent={progressPercent} label={`Question ${currentIndex + 1} / ${items.length}`} size="sm" />
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 ${
                timeLeft <= 5 ? "bg-red-100 text-red-700" : "bg-[var(--brand-bg)]"
              }`}
              aria-live="polite"
            >
              <Clock className="w-4 h-4" />
              {timeLeft}s
            </div>
          </div>

          <LessonQuizQuestionField
            item={currentItem}
            index={currentIndex}
            answer={answers[currentItem.id]}
            onAnswer={handleAnswer}
          />

          <button
            type="button"
            onClick={handleNext}
            disabled={!isCurrentAnswered() || isSubmitting}
            className="w-full py-2.5 text-white font-semibold rounded disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {currentIndex < items.length - 1 ? "Question suivante" : "Terminer"}
          </button>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-lg ${
              result.passed ? "bg-green-50 border border-green-200" : "bg-orange-50 border border-orange-200"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold mb-1">
              {result.passed ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-orange-600" />
              )}
              Score : {result.score}/{result.total} ({Math.round((result.score / result.total) * 100)}%)
            </div>
            <p className="text-sm">
              {result.passed
                ? "Bravo ! Vous pouvez continuer."
                : `Il faut au moins ${result.pass_required}/${result.total}. Réessayez !`}
            </p>
          </div>

          {(!result.passed || !requirePass) && (
            <button
              type="button"
              onClick={handleRetry}
              className="w-full py-2.5 font-semibold rounded border border-[var(--border-color)] text-sm"
              style={{ color: "var(--brand-brown)" }}
            >
              {result.passed ? "Refaire" : "Réessayer"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TimedQuizPlayer;
