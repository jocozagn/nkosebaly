"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ClipboardList, Plus, Trash2, Upload, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import type { AdminLessonQuizItem, LessonQuizMediaFile, LessonQuizType } from "@/lib/admin/types";
import {
  AUDIO_PICK_IMAGE_COUNT,
  AUDIO_PICK_IMAGE_LABELS,
  LESSON_QUIZ_TYPE_LABELS,
} from "@/lib/quiz/lesson-quiz";

interface LessonQuizFieldProps {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
  items: AdminLessonQuizItem[];
  onChanged: () => void;
}

const emptyOptions = ["", "", ""];

const createEmptyImageSlots = (): (LessonQuizMediaFile | null)[] =>
  Array.from({ length: AUDIO_PICK_IMAGE_COUNT }, () => null);

const LessonQuizField = ({ lessonId, courseId, lessonTitle, items, onChanged }: LessonQuizFieldProps) => {
  const audioRef = useRef<HTMLInputElement>(null);
  const imageSlotRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quizType, setQuizType] = useState<LessonQuizType>("single_choice");
  const [promptText, setPromptText] = useState("");
  const [options, setOptions] = useState<string[]>([...emptyOptions]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctIndices, setCorrectIndices] = useState<number[]>([0]);
  const [audioFile, setAudioFile] = useState<LessonQuizMediaFile | null>(null);
  const [imageSlots, setImageSlots] = useState<(LessonQuizMediaFile | null)[]>(createEmptyImageSlots);
  const [correctImageIndex, setCorrectImageIndex] = useState(0);
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [sentenceTemplate, setSentenceTemplate] = useState("Je ___ à l'école.");
  const [suggestions, setSuggestions] = useState<string[]>(["", "", ""]);
  const [correctWord, setCorrectWord] = useState("");

  const resetForm = (): void => {
    setPromptText("");
    setOptions([...emptyOptions]);
    setCorrectIndex(0);
    setCorrectIndices([0]);
    setAudioFile(null);
    setImageSlots(createEmptyImageSlots());
    setCorrectImageIndex(0);
    setExpectedAnswer("");
    setSentenceTemplate("Je ___ à l'école.");
    setSuggestions(["", "", ""]);
    setCorrectWord("");
  };

  const handleQuizTypeChange = (nextType: LessonQuizType): void => {
    setQuizType(nextType);
    if (nextType === "audio_pick_image") {
      setPromptText("Écoutez le son et choisissez la bonne image");
      setImageSlots(createEmptyImageSlots());
      setCorrectImageIndex(0);
    }
  };

  const uploadMedia = async (file: File): Promise<LessonQuizMediaFile | null> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/lesson-quiz/media", { method: "POST", body: formData });
    const result = await res.json();
    if (result.error) {
      toast.error(result.message ?? "Upload échoué");
      return null;
    }
    return {
      file_id: result.data.file_id,
      mime_type: result.data.mime_type,
      original_name: result.data.original_name,
    };
  };

  const handleAudioPick = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const saved = await uploadMedia(file);
    if (saved) setAudioFile(saved);
    e.target.value = "";
  };

  const handleImageSlotPick = async (
    slotIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const saved = await uploadMedia(file);
    if (!saved) return;
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = saved;
      return next;
    });
    e.target.value = "";
  };

  const handleRemoveImageSlot = (slotIndex: number): void => {
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    if (correctImageIndex === slotIndex) setCorrectImageIndex(0);
  };

  const mediaPreviewUrl = (file: LessonQuizMediaFile): string =>
    `/api/quiz-media/${file.file_id}?mime=${encodeURIComponent(file.mime_type)}`;

  const handleAddQuiz = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        lesson_id: lessonId,
        course_id: courseId,
        type: quizType,
        prompt_text: promptText,
      };

      if (quizType === "single_choice") {
        payload.options = options.filter(Boolean);
        payload.correct_index = correctIndex;
      } else if (quizType === "multiple_choice") {
        payload.options = options.filter(Boolean);
        payload.correct_indices = correctIndices;
      } else if (quizType === "audio_pick_image") {
        const filledImages = imageSlots.filter(Boolean) as LessonQuizMediaFile[];
        if (!audioFile) {
          toast.error("Uploadez le fichier son");
          return;
        }
        if (filledImages.length !== AUDIO_PICK_IMAGE_COUNT) {
          toast.error(`Ajoutez exactement ${AUDIO_PICK_IMAGE_COUNT} images`);
          return;
        }
        if (imageSlots[correctImageIndex] == null) {
          toast.error("Sélectionnez l'image qui correspond au son");
          return;
        }
        payload.audio = audioFile;
        payload.image_options = imageSlots;
        payload.correct_image_index = correctImageIndex;
      } else if (quizType === "dictation") {
        if (!audioFile || !expectedAnswer.trim()) {
          toast.error("Audio et mot attendu requis");
          return;
        }
        payload.audio = audioFile;
        payload.expected_answer = expectedAnswer.trim();
      } else if (quizType === "fill_blank_suggestions") {
        const cleanSuggestions = suggestions.map((s) => s.trim()).filter(Boolean);
        if (!sentenceTemplate.trim() || cleanSuggestions.length < 2 || !correctWord.trim()) {
          toast.error("Phrase, 2+ suggestions et mot correct requis");
          return;
        }
        payload.sentence_template = sentenceTemplate;
        payload.suggestions = cleanSuggestions;
        payload.correct_word = correctWord.trim();
      }

      const res = await fetch("/api/admin/lesson-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.message ?? "Échec");
        return;
      }

      toast.success("Exercice ajouté");
      resetForm();
      setIsOpen(false);
      onChanged();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Supprimer cet exercice ?")) return;
    await fetch(`/api/admin/lesson-quiz?id=${id}`, { method: "DELETE" });
    toast.success("Exercice supprimé");
    onChanged();
  };

  const toggleMultiCorrect = (index: number): void => {
    setCorrectIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index].sort()
    );
  };

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-[#e8ddd4]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs flex items-center gap-1" style={{ color: "var(--brand-gray)" }}>
          <ClipboardList className="w-3 h-3" />
          Quiz leçon — {lessonTitle}
        </span>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="text-xs px-2 py-1 rounded border border-[#e8ddd4] hover:bg-[var(--brand-bg)]"
        >
          {isOpen ? "Fermer" : "+ Exercice"}
        </button>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1 mb-2">
          {items.map((item, idx) => (
            <li key={item.id} className="flex items-center justify-between text-xs bg-[var(--brand-bg)] px-2 py-1 rounded">
              <span>
                {idx + 1}. {LESSON_QUIZ_TYPE_LABELS[item.type]}
                {item.prompt_text ? ` — ${item.prompt_text}` : ""}
              </span>
              <button type="button" onClick={() => handleDelete(item.id)} aria-label="Supprimer">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && (
        <div className="space-y-2 p-2 rounded border border-[#e8ddd4] bg-white text-xs">
          <select
            value={quizType}
            onChange={(e) => handleQuizTypeChange(e.target.value as LessonQuizType)}
            className="w-full px-2 py-1.5 border border-[#e8ddd4] rounded"
          >
            {Object.entries(LESSON_QUIZ_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <input
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Consigne affichée à l'élève"
            className="w-full px-2 py-1.5 border border-[#e8ddd4] rounded"
          />

          {(quizType === "single_choice" || quizType === "multiple_choice") && (
            <div className="space-y-1">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  {quizType === "single_choice" ? (
                    <input type="radio" name={`correct-${lessonId}`} checked={correctIndex === i} onChange={() => setCorrectIndex(i)} />
                  ) : (
                    <input type="checkbox" checked={correctIndices.includes(i)} onChange={() => toggleMultiCorrect(i)} />
                  )}
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-2 py-1 border border-[#e8ddd4] rounded"
                  />
                </div>
              ))}
              <button type="button" onClick={() => setOptions((p) => [...p, ""])} className="text-[var(--brand-sky-dark)] underline">
                + Option
              </button>
            </div>
          )}

          {quizType === "audio_pick_image" && (
            <div className="space-y-3 p-2 rounded bg-[var(--brand-bg)] border border-[#e8ddd4]">
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--brand-gray)" }}>
                <strong>Étape 1 :</strong> uploadez le son à écouter.
                <br />
                <strong>Étape 2 :</strong> ajoutez 4 images (A, B, C, D).
                <br />
                <strong>Étape 3 :</strong> cochez l&apos;image qui correspond à ce son — l&apos;élève verra le son + les 4 images et devra choisir.
              </p>

              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--brand-brown)" }}>1. Fichier son</p>
                <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => void handleAudioPick(e)} />
                <button
                  type="button"
                  onClick={() => audioRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1.5 border rounded bg-white w-full"
                >
                  <Volume2 className="w-3 h-3" />
                  {audioFile ? audioFile.original_name : "Choisir le fichier audio (MP3, WAV…)"}
                </button>
                {audioFile && (
                  <audio controls src={mediaPreviewUrl(audioFile)} className="w-full mt-2" />
                )}
              </div>

              <div>
                <p className="font-semibold mb-2" style={{ color: "var(--brand-brown)" }}>
                  2. Les 4 images proposées à l&apos;élève
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {imageSlots.map((img, slotIndex) => (
                    <div
                      key={slotIndex}
                      className={`relative rounded border p-2 bg-white ${
                        correctImageIndex === slotIndex
                          ? "border-[var(--brand-brown)] ring-2 ring-[var(--brand-gold)]"
                          : "border-[#e8ddd4]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold" style={{ color: "var(--brand-brown)" }}>
                          Image {AUDIO_PICK_IMAGE_LABELS[slotIndex]}
                        </span>
                        {correctImageIndex === slotIndex && (
                          <span className="flex items-center gap-0.5 text-[10px] text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> Bonne réponse
                          </span>
                        )}
                      </div>

                      {img ? (
                        <div className="space-y-1">
                          <img
                            src={mediaPreviewUrl(img)}
                            alt={`Image ${AUDIO_PICK_IMAGE_LABELS[slotIndex]}`}
                            className="w-full h-20 object-cover rounded"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setCorrectImageIndex(slotIndex)}
                              className={`flex-1 py-1 rounded text-[10px] ${
                                correctImageIndex === slotIndex
                                  ? "bg-[var(--brand-brown)] text-white"
                                  : "border border-[#e8ddd4]"
                              }`}
                            >
                              = ce son
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImageSlot(slotIndex)}
                              className="px-2 py-1 border border-red-200 text-red-500 rounded text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <input
                            ref={(el) => {
                              imageSlotRefs.current[slotIndex] = el;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => void handleImageSlotPick(slotIndex, e)}
                          />
                          <button
                            type="button"
                            onClick={() => imageSlotRefs.current[slotIndex]?.click()}
                            className="w-full h-20 flex flex-col items-center justify-center gap-1 border border-dashed border-[#e8ddd4] rounded text-[10px]"
                            style={{ color: "var(--brand-gray)" }}
                          >
                            <Upload className="w-4 h-4" />
                            Ajouter image {AUDIO_PICK_IMAGE_LABELS[slotIndex]}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {quizType === "dictation" && (
            <div className="space-y-2">
              <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => void handleAudioPick(e)} />
              <button type="button" onClick={() => audioRef.current?.click()} className="flex items-center gap-1 px-2 py-1 border rounded">
                <Volume2 className="w-3 h-3" /> {audioFile ? audioFile.original_name : "Uploader audio"}
              </button>
              <input
                value={expectedAnswer}
                onChange={(e) => setExpectedAnswer(e.target.value)}
                placeholder="Mot attendu (ex: balandou)"
                className="w-full px-2 py-1 border border-[#e8ddd4] rounded"
              />
            </div>
          )}

          {quizType === "fill_blank_suggestions" && (
            <div className="space-y-2">
              <input
                value={sentenceTemplate}
                onChange={(e) => setSentenceTemplate(e.target.value)}
                placeholder="Phrase avec ___ pour le blanc"
                className="w-full px-2 py-1 border border-[#e8ddd4] rounded"
              />
              {suggestions.map((word, i) => (
                <input
                  key={i}
                  value={word}
                  onChange={(e) => {
                    const next = [...suggestions];
                    next[i] = e.target.value;
                    setSuggestions(next);
                  }}
                  placeholder={`Mot suggéré ${i + 1}`}
                  className="w-full px-2 py-1 border border-[#e8ddd4] rounded"
                />
              ))}
              <select value={correctWord} onChange={(e) => setCorrectWord(e.target.value)} className="w-full px-2 py-1 border rounded">
                <option value="">Mot correct</option>
                {suggestions.filter(Boolean).map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleAddQuiz()}
            className="w-full py-1.5 text-white rounded flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            <Plus className="w-3 h-3" /> {isSaving ? "Enregistrement..." : "Ajouter l'exercice"}
          </button>
        </div>
      )}
    </div>
  );
};

export default LessonQuizField;
