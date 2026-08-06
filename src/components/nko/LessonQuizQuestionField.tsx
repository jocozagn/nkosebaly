"use client";

import type { StudentLessonQuizAnswerPayload } from "@/lib/admin/types";

export interface QuizItemView {
  id: string;
  type: string;
  order: number;
  prompt_text?: string;
  time_limit_seconds?: number;
  options?: string[];
  audio_url?: string;
  image_options?: { index: number; url: string; label?: string }[];
  sentence_template?: string;
  suggestions?: string[];
}

interface LessonQuizQuestionFieldProps {
  item: QuizItemView;
  index: number;
  answer?: StudentLessonQuizAnswerPayload;
  disabled?: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
  onAnswer: (answer: StudentLessonQuizAnswerPayload) => void;
}

/** Affiche une question d'exercice (5 types supportés) */
const LessonQuizQuestionField = ({
  item,
  index,
  answer,
  disabled = false,
  showResult = false,
  isCorrect,
  onAnswer,
}: LessonQuizQuestionFieldProps) => {
  return (
    <div
      className={`border rounded p-4 space-y-3 ${
        showResult
          ? isCorrect
            ? "border-green-300 bg-green-50/50"
            : "border-red-200 bg-red-50/30"
          : "border-[var(--border-color)]"
      }`}
    >
      <p className="text-sm font-medium">
        {index + 1}. {item.prompt_text || "Question"}
      </p>

      {item.type === "single_choice" && item.options && (
        <div className="space-y-2">
          {item.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onAnswer({ item_id: item.id, type: "single_choice", selected: i })}
              className={`w-full text-left px-3 py-2 rounded border text-sm ${
                (answer as { selected?: number })?.selected === i
                  ? "border-[var(--brand-brown)] bg-[var(--brand-bg)]"
                  : "border-[var(--border-color)]"
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
            const current = answer as { selected?: number[] } | undefined;
            const selected = current?.selected ?? [];
            return (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={selected.includes(i)}
                  onChange={() => {
                    const next = selected.includes(i)
                      ? selected.filter((v) => v !== i)
                      : [...selected, i].sort();
                    onAnswer({ item_id: item.id, type: "multiple_choice", selected: next });
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {(item.type === "audio_pick_image" || item.type === "dictation") && item.audio_url && (
        <audio controls src={item.audio_url} className="w-full" />
      )}

      {item.type === "audio_pick_image" && item.image_options && (
        <div className="grid grid-cols-2 gap-3">
          {item.image_options.map((img) => (
            <button
              key={img.index}
              type="button"
              disabled={disabled}
              onClick={() =>
                onAnswer({ item_id: item.id, type: "audio_pick_image", selected: img.index })
              }
              className={`border rounded p-2 text-left ${
                (answer as { selected?: number })?.selected === img.index
                  ? "border-[var(--brand-brown)] ring-2 ring-[var(--brand-gold)] bg-[var(--brand-bg)]"
                  : "border-[var(--border-color)]"
              }`}
            >
              <span className="text-xs font-semibold block mb-1" style={{ color: "var(--brand-brown)" }}>
                {String.fromCharCode(65 + img.index)}
              </span>
              <img
                src={img.url}
                alt={img.label ?? `Image ${img.index + 1}`}
                className="w-full h-28 object-cover rounded"
              />
            </button>
          ))}
        </div>
      )}

      {item.type === "dictation" && (
        <input
          type="text"
          placeholder="Écrivez le mot entendu"
          disabled={disabled}
          value={(answer as { text?: string })?.text ?? ""}
          className="w-full px-3 py-2 border border-[var(--border-color)] rounded text-sm"
          onChange={(e) =>
            onAnswer({ item_id: item.id, type: "dictation", text: e.target.value })
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
                disabled={disabled}
                onClick={() =>
                  onAnswer({ item_id: item.id, type: "fill_blank_suggestions", word })
                }
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  (answer as { word?: string })?.word === word
                    ? "bg-[var(--brand-brown)] text-white border-[var(--brand-brown)]"
                    : "border-[var(--border-color)]"
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
};

export default LessonQuizQuestionField;
