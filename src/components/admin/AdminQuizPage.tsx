"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { AdminCourse, AdminQuizQuestion, QuizCategory, QuizDifficulty } from "@/lib/admin/types";

const CATEGORIES: QuizCategory[] = ["grammaire", "vocabulaire", "ecriture", "comprehension"];
const DIFFICULTIES: QuizDifficulty[] = ["facile", "moyen", "difficile"];

/** Banque de questions quiz */
const AdminQuizPage = () => {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [questions, setQuestions] = useState<AdminQuizQuestion[]>([]);
  const [courseFilter, setCourseFilter] = useState("");
  const [form, setForm] = useState({
    course_id: "",
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: 0,
    category: "grammaire" as QuizCategory,
    difficulty: "facile" as QuizDifficulty,
  });

  const loadData = (): void => {
    fetch("/api/admin/courses").then((r) => r.json()).then((res) => {
      if (!res.error) setCourses(res.data ?? []);
    });
    const url = courseFilter ? `/api/admin/quiz?course_id=${courseFilter}` : "/api/admin/quiz";
    fetch(url).then((r) => r.json()).then((res) => {
      if (!res.error) setQuestions(res.data ?? []);
    });
  };

  useEffect(() => {
    loadData();
  }, [courseFilter]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.course_id || !form.question_text.trim()) return;
    await fetch("/api/admin/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, options: form.options.filter((o) => o.trim()) }),
    });
    setForm({ ...form, question_text: "", options: ["", "", "", ""], correct_answer: 0 });
    loadData();
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Supprimer cette question ?")) return;
    await fetch(`/api/admin/quiz?id=${id}`, { method: "DELETE" });
    loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Quiz certifiant</h2>
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>Banque de questions par cours</p>
      </div>

      <div className="flex gap-3">
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm bg-white"
        >
          <option value="">Tous les cours</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#e8ddd4] p-5 space-y-4">
        <h3 className="font-medium text-sm" style={{ color: "var(--brand-brown)" }}>Nouvelle question</h3>
        <select
          value={form.course_id}
          onChange={(e) => setForm({ ...form, course_id: e.target.value })}
          className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
          required
        >
          <option value="">Sélectionner un cours</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <textarea
          value={form.question_text}
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
          placeholder="Texte de la question"
          rows={2}
          className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
          required
        />
        {form.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={form.correct_answer === i}
              onChange={() => setForm({ ...form, correct_answer: i })}
            />
            <input
              value={opt}
              onChange={(e) => {
                const opts = [...form.options];
                opts[i] = e.target.value;
                setForm({ ...form, options: opts });
              }}
              placeholder={`Option ${i + 1}`}
              className="flex-1 px-4 py-2 border border-[#e8ddd4] rounded text-sm"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as QuizCategory })} className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
          <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as QuizDifficulty })} className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm">
            {DIFFICULTIES.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
          </select>
        </div>
        <button type="submit" className="px-5 py-2.5 text-white text-sm font-semibold rounded" style={{ backgroundColor: "var(--brand-brown)" }}>
          Ajouter
        </button>
      </form>

      <div className="bg-white rounded-lg border border-[#e8ddd4] divide-y divide-[#f0e8df]">
        {questions.length === 0 ? (
          <p className="p-6 text-sm text-center" style={{ color: "var(--brand-gray)" }}>Aucune question</p>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--brand-black)" }}>{q.question_text}</p>
                <p className="text-xs mt-1 capitalize" style={{ color: "var(--brand-gray)" }}>
                  {q.category} · {q.difficulty} · {q.options.length} options
                </p>
              </div>
              <button type="button" onClick={() => handleDelete(q.id)} className="p-1.5 rounded hover:bg-red-50 flex-shrink-0" aria-label="Supprimer">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminQuizPage;
