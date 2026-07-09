import type { AdminLessonQuizItem, StudentLessonQuizAnswerPayload } from "@/lib/admin/types";

/** Normalise une réponse texte (dictée, mots) */
export const normalizeQuizText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Compare deux tableaux d'indices (ordre ignoré) */
const sameIndexSet = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((val, i) => val === sortedB[i]);
};

/** Corrige une réponse pour un item de quiz leçon */
export const gradeLessonQuizAnswer = (
  item: AdminLessonQuizItem,
  answer: StudentLessonQuizAnswerPayload
): boolean => {
  if (item.id !== answer.item_id || item.type !== answer.type) return false;

  switch (item.type) {
    case "single_choice":
      return answer.type === "single_choice" && answer.selected === item.correct_index;

    case "multiple_choice":
      return (
        answer.type === "multiple_choice" &&
        sameIndexSet(answer.selected, item.correct_indices)
      );

    case "audio_pick_image":
      return answer.type === "audio_pick_image" && answer.selected === item.correct_image_index;

    case "dictation": {
      if (answer.type !== "dictation") return false;
      const normalized = normalizeQuizText(answer.text);
      const expected = normalizeQuizText(item.expected_answer);
      if (normalized === expected) return true;
      return (item.accept_variants ?? []).some((v) => normalizeQuizText(v) === normalized);
    }

    case "fill_blank_suggestions":
      return (
        answer.type === "fill_blank_suggestions" &&
        normalizeQuizText(answer.word) === normalizeQuizText(item.correct_word) &&
        item.suggestions.some((s) => normalizeQuizText(s) === normalizeQuizText(answer.word))
      );

    default:
      return false;
  }
};

/** Retire les réponses correctes pour l'élève */
export const stripLessonQuizItemForStudent = (
  item: AdminLessonQuizItem,
  mediaUrl: (file: { file_id: string; mime_type: string }) => string
): Record<string, unknown> => {
  const base = {
    id: item.id,
    type: item.type,
    order: item.order,
    prompt_text: item.prompt_text ?? "",
  };

  switch (item.type) {
    case "single_choice":
      return { ...base, options: item.options };

    case "multiple_choice":
      return { ...base, options: item.options };

    case "audio_pick_image":
      return {
        ...base,
        audio_url: mediaUrl(item.audio),
        image_options: item.image_options.map((img, index) => ({
          index,
          url: mediaUrl(img),
          label: img.original_name,
        })),
      };

    case "dictation":
      return { ...base, audio_url: mediaUrl(item.audio) };

    case "fill_blank_suggestions":
      return {
        ...base,
        sentence_template: item.sentence_template,
        suggestions: item.suggestions,
      };

    default:
      return base;
  }
};

export const LESSON_QUIZ_TYPE_LABELS: Record<
  AdminLessonQuizItem["type"],
  string
> = {
  single_choice: "Choix unique",
  multiple_choice: "Choix multiple",
  audio_pick_image: "Son → choisir l'image (4 images)",
  dictation: "Dictée (écrire le mot)",
  fill_blank_suggestions: "Compléter avec un mot suggéré",
};

/** Nombre d'images pour l'exercice « son → image » */
export const AUDIO_PICK_IMAGE_COUNT = 4;

export const AUDIO_PICK_IMAGE_LABELS = ["A", "B", "C", "D"] as const;
