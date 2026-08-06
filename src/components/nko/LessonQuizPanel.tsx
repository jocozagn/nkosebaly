"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { StudentLessonQuizAnswerPayload } from "@/lib/admin/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TimedQuizPlayer, { type TimedQuizResult } from "./TimedQuizPlayer";
import type { QuizItemView } from "./LessonQuizQuestionField";

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
  blocking?: boolean;
  onOpenChange?: (open: boolean) => void;
  onHasQuiz?: (hasQuiz: boolean, previousAttempt: PreviousAttempt | null) => void;
  onSubmitted?: (result: TimedQuizResult) => void;
}

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

const LessonQuizPanel = ({
  courseId,
  lessonId,
  isOpen,
  blocking = false,
  onOpenChange,
  onHasQuiz,
  onSubmitted,
}: LessonQuizPanelProps) => {
  const [items, setItems] = useState<QuizItemView[]>([]);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(15);
  const [passPercent, setPassPercent] = useState(70);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) {
          const quizItems = (res.data?.items ?? []) as QuizItemView[];
          setItems(quizItems);
          setTimeLimitSeconds(res.data?.time_limit_seconds ?? 15);
          setPassPercent(res.data?.pass_percent ?? 70);
          const prev = (res.data?.previous_attempt as PreviousAttempt | null) ?? null;
          setQuizPassed(prev?.passed ?? false);
          onHasQuiz?.(quizItems.length > 0, prev);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [courseId, lessonId, onHasQuiz]);

  const handleSubmit = async (
    answers: StudentLessonQuizAnswerPayload[]
  ): Promise<TimedQuizResult | null> => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (json.error) {
        alert(json.message ?? "Erreur");
        return null;
      }
      setQuizPassed(json.data.passed);
      onSubmitted?.(json.data);
      return json.data;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean): void => {
    if (!open && blocking && !quizPassed) return;
    onOpenChange?.(open);
  };

  if (!isOpen) {
    return <LessonQuizMetaLoader courseId={courseId} lessonId={lessonId} onHasQuiz={onHasQuiz} />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`max-w-lg max-h-[90vh] overflow-y-auto ${blocking && !quizPassed ? "[&_.closeBtn]:hidden" : ""}`}
        onPointerDownOutside={(e) => {
          if (blocking && !quizPassed) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (blocking && !quizPassed) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--brand-brown)" }}>Exercice de la leçon</DialogTitle>
          <DialogDescription>
            {blocking
              ? "Réussissez l'exercice pour continuer le cours."
              : "Répondez à toutes les questions avant la fin du minuteur."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-brown)" }} />
          </div>
        ) : items.length === 0 ? null : (
          <TimedQuizPlayer
            items={items}
            defaultTimeLimitSeconds={timeLimitSeconds}
            passPercent={passPercent}
            title="Quiz de la leçon"
            subtitle={`${items.length} question${items.length > 1 ? "s" : ""}`}
            isSubmitting={isSubmitting}
            requirePass={blocking}
            onSubmit={handleSubmit}
            onPassed={() => {
              if (blocking) onOpenChange?.(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LessonQuizPanel;
