"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ClipboardList, Loader2, XCircle } from "lucide-react";
import type { StudentLessonQuizAnswerPayload } from "@/lib/admin/types";

interface QuizItem {
  id: string;
  type: string;
  order: number;
  prompt_text?: string;
  options?: string[];
  audio_url?: string;
  image_options?: { index: number; url: string; label?: string }[];
  sentence_template?: string;
  suggestions?: string[];
}

interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  pass_required: number;
  details?: { item_id: string; correct: boolean }[];
}

interface PreviousAttempt {
  score: number;
  total: number;
  passed: boolean;
  pass_required: number;
}

interface LessonQuizPanelProps {
  courseId: string;
  lessonId: string;
  isOpen: boolean;
  onHasQuiz?: (hasQuiz: boolean, previousAttempt: PreviousAttempt | null) => void;
  onSubmitted?: (result: QuizResult) => void;
}

/** Charge les métadonnées quiz même quand le panneau est fermé */
const LessonQuizMetaLoader = ({
  courseId,
  lessonId,
  onHasQuiz,
}: Pick<LessonQuizPanelProps, "courseId" | "lessonId" | "onHasQuiz">) => {
  useEffect(() => {
    fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) {
          const count = res.data?.count ?? res.data?.items?.length ?? 0;
          onHasQuiz?.(count > 0, (res.data?.previous_attempt as PreviousAttempt | null) ?? null);
        }
      })
      .catch(() => onHasQuiz?.(false, null));
  }, [courseId, lessonId, onHasQuiz]);

  return null;
};

/** Exercices quiz interactifs — score ≥ 70 % pour réussir */
const LessonQuizPanel = ({
  courseId,
  lessonId,
  isOpen,
  onHasQuiz,
  onSubmitted,
}: LessonQuizPanelProps) => {
  const [items, setItems] = useState<QuizItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, StudentLessonQuizAnswerPayload>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [lastScore, setLastScore] = useState<PreviousAttempt | null>(null);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) {
          const quizItems = res.data?.items ?? [];
          setItems(quizItems);
          const prev = (res.data?.previous_attempt as PreviousAttempt | null) ?? null;
          setLastScore(prev);
          onHasQuiz?.(quizItems.length > 0, prev);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [courseId, lessonId, onHasQuiz]);

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: Object.values(answers) }),
      });
      const json = await res.json();
      if (json.error) {
        alert(json.message ?? "Erreur");
        return;
      }
      setResult(json.data);
      onSubmitted?.(json.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return <LessonQuizMetaLoader courseId={courseId} lessonId={lessonId} onHasQuiz={onHasQuiz} />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-brown)" }} />
      </div>
    );
  }

  if (items.length === 0) return null;

  const allAnswered = items.every((item) => {
    const answer = answers[item.id];
    if (!answer) return false;
    if (answer.type === "dictation") return answer.text.trim().length > 0;
    if (answer.type === "multiple_choice") return answer.selected.length > 0;
    if (answer.type === "fill_blank_suggestions") return answer.word.trim().length > 0;
    return true;
  });

  const scorePercent = result ? Math.round((result.score / result.total) * 100) : 0;
  const hasSubmittedDetails = Boolean(result?.details?.length);

  return (
    <div id="lesson-quiz-panel" className="bg-white rounded-lg border border-[#e8ddd4] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5" style={{ color: "var(--brand-brown)" }} />
        <div>
          <h3 className="font-semibold" style={{ color: "var(--brand-brown)" }}>
            Exercice — Quiz de la leçon
          </h3>
          <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
            {items.length} question{items.length > 1 ? "s" : ""} · Seuil de réussite : 70 %
          </p>
        </div>
      </div>

      {lastScore && !hasSubmittedDetails && (
        <p className="text-xs px-3 py-2 rounded bg-[var(--brand-bg)]" style={{ color: "var(--brand-gray)" }}>
          Dernier score enregistré : {lastScore.score}/{lastScore.total}
          {lastScore.passed ? " — Réussi ✓" : ""}
        </p>
      )}

      {result && hasSubmittedDetails && (
        <div
          className={`p-4 rounded-lg space-y-1 ${result.passed ? "bg-green-50 text-green-900 border border-green-200" : "bg-orange-50 text-orange-900 border border-orange-200"}`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {result.passed ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            Score : {result.score}/{result.total} ({scorePercent}%)
          </div>
          <p className="text-sm">
            {result.passed
              ? "Bravo ! Vous avez réussi l'exercice."
              : `Il faut au moins ${result.pass_required}/${result.total} bonnes réponses. Réessayez !`}
          </p>
        </div>
      )}

      {items.map((item, idx) => {
        const detail = result?.details?.find((d) => d.item_id === item.id);

        return (
          <div
            key={item.id}
            className={`border rounded p-4 space-y-3 ${
              hasSubmittedDetails
                ? detail?.correct
                  ? "border-green-300 bg-green-50/50"
                  : "border-red-200 bg-red-50/30"
                : "border-[#f0e8df]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">
                {idx + 1}. {item.prompt_text || "Question"}
              </p>
              {hasSubmittedDetails &&
                (detail?.correct ? (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-label="Bonne réponse" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" aria-label="Mauvaise réponse" />
                ))}
            </div>

            {item.type === "single_choice" && item.options && (
              <div className="space-y-2">
                {item.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={hasSubmittedDetails}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [item.id]: { item_id: item.id, type: "single_choice", selected: i },
                      }))
                    }
                    className={`w-full text-left px-3 py-2 rounded border text-sm ${
                      (answers[item.id] as { selected?: number })?.selected === i
                        ? "border-[var(--brand-brown)] bg-[var(--brand-bg)]"
                        : "border-[#e8ddd4]"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {item.type === "multiple_choice" && item.options && (
              <div className="space-y-2">
                {item.options.map((opt, i) => {
                  const current = answers[item.id] as { selected?: number[] } | undefined;
                  const selected = current?.selected ?? [];
                  return (
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={hasSubmittedDetails}
                        checked={selected.includes(i)}
                        onChange={() => {
                          const next = selected.includes(i)
                            ? selected.filter((v) => v !== i)
                            : [...selected, i].sort();
                          setAnswers((prev) => ({
                            ...prev,
                            [item.id]: { item_id: item.id, type: "multiple_choice", selected: next },
                          }));
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}

            {(item.type === "audio_pick_image" || item.type === "dictation") && item.audio_url && (
              <div className="space-y-2">
                {item.type === "audio_pick_image" && (
                  <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
                    Écoutez le son, puis choisissez la bonne image parmi les 4 propositions.
                  </p>
                )}
                <audio controls src={item.audio_url} className="w-full" />
              </div>
            )}

            {item.type === "audio_pick_image" && item.image_options && (
              <div className="grid grid-cols-2 gap-3">
                {item.image_options.map((img) => (
                  <button
                    key={img.index}
                    type="button"
                    disabled={hasSubmittedDetails}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [item.id]: { item_id: item.id, type: "audio_pick_image", selected: img.index },
                      }))
                    }
                    className={`border rounded p-2 text-left ${
                      (answers[item.id] as { selected?: number })?.selected === img.index
                        ? "border-[var(--brand-brown)] ring-2 ring-[var(--brand-gold)] bg-[var(--brand-bg)]"
                        : "border-[#e8ddd4]"
                    }`}
                  >
                    <span className="text-xs font-semibold block mb-1" style={{ color: "var(--brand-brown)" }}>
                      {String.fromCharCode(65 + img.index)}
                    </span>
                    <img src={img.url} alt={img.label ?? `Image ${img.index + 1}`} className="w-full h-28 object-cover rounded" />
                  </button>
                ))}
              </div>
            )}

            {item.type === "dictation" && (
              <input
                type="text"
                placeholder="Écrivez le mot entendu"
                disabled={hasSubmittedDetails}
                className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [item.id]: { item_id: item.id, type: "dictation", text: e.target.value },
                  }))
                }
              />
            )}

            {item.type === "fill_blank_suggestions" && (
              <div className="space-y-3">
                <p className="text-sm">{item.sentence_template?.replace("___", "______")}</p>
                <div className="flex flex-wrap gap-2">
                  {item.suggestions?.map((word) => (
                    <button
                      key={word}
                      type="button"
                      disabled={hasSubmittedDetails}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [item.id]: { item_id: item.id, type: "fill_blank_suggestions", word },
                        }))
                      }
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        (answers[item.id] as { word?: string })?.word === word
                          ? "bg-[var(--brand-brown)] text-white border-[var(--brand-brown)]"
                          : "border-[#e8ddd4]"
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!hasSubmittedDetails ? (
        <button
          type="button"
          disabled={!allAnswered || isSubmitting}
          onClick={() => void handleSubmit()}
          className="w-full py-2.5 text-white font-semibold rounded disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: "var(--brand-brown)" }}
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider mes réponses"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setAnswers({});
          }}
          className="w-full py-2.5 font-semibold rounded border border-[#e8ddd4] text-sm"
          style={{ color: "var(--brand-brown)" }}
        >
          Refaire l&apos;exercice
        </button>
      )}
    </div>
  );
};

export default LessonQuizPanel;
