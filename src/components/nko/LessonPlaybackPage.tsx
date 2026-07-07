"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import ProtectedVideoPlayer from "./ProtectedVideoPlayer";
import LessonEngagementPanel from "./LessonEngagementPanel";

interface LessonPlaybackPageProps {
  courseId: string;
  lessonId: string;
}

interface LessonAttachment {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  download_url: string;
}

interface LessonQuestion {
  id: string;
  author_name: string;
  text: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
}

interface PlaybackData {
  title: string;
  course_title: string;
  stream_url: string;
  attachments: LessonAttachment[];
  questions: LessonQuestion[];
  reactions: { likes: number; dislikes: number; user_vote: "like" | "dislike" | null };
}

/** Page de lecture vidéo avec engagement (likes, questions, pièces jointes) */
const LessonPlaybackPage = ({ courseId, lessonId }: LessonPlaybackPageProps) => {
  const [data, setData] = useState<PlaybackData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/lessons/${lessonId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) {
          setError(res.message ?? "Accès refusé");
        } else {
          setData(res.data);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger la vidéo");
        setIsLoading(false);
      });
  }, [courseId, lessonId]);

  return (
    <NkoShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm mb-6 hover:underline"
          style={{ color: "var(--brand-brown)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Retour au cours
        </Link>

        {isLoading ? (
          <BrandLoader variant="inline" message="Préparation de la vidéo..." />
        ) : error || !data ? (
          <div className="bg-white rounded-lg border border-[#e8ddd4] p-8 text-center">
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>{error || "Vidéo indisponible"}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--brand-gray)" }}>{data.course_title}</p>
              <h1 className="text-xl font-bold" style={{ color: "var(--brand-brown)" }}>{data.title}</h1>
            </div>

            <ProtectedVideoPlayer
              streamUrl={data.stream_url}
              title={data.title}
              courseId={courseId}
              lessonId={lessonId}
            />

            <LessonEngagementPanel
              courseId={courseId}
              lessonId={lessonId}
              attachments={data.attachments}
              questions={data.questions}
              reactions={data.reactions}
            />
          </div>
        )}
      </div>
    </NkoShell>
  );
};

export default LessonPlaybackPage;
