"use client";

import { useCallback, useEffect, useRef } from "react";

interface ProtectedVideoPlayerProps {
  streamUrl: string;
  title: string;
  courseId?: string;
  lessonId?: string;
  watermark?: string;
}

const SEND_INTERVAL_MS = 15000;
const COMPLETION_THRESHOLD = 90;

/**
 * Lecteur vidéo protégé — enregistre la progression à 90 % de visionnage.
 */
const ProtectedVideoPlayer = ({
  streamUrl,
  title,
  courseId,
  lessonId,
  watermark = "Balandou Wourouki — Lecture seule",
}: ProtectedVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSentRef = useRef(0);
  const hasCompletedRef = useRef(false);

  const sendProgress = useCallback(
    async (watchPercent: number): Promise<void> => {
      if (!courseId || !lessonId) return;

      await fetch(`/api/courses/${courseId}/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watch_percent: watchPercent }),
      });
    },
    [courseId, lessonId]
  );

  const handleProgressUpdate = useCallback((): void => {
    const video = videoRef.current;
    if (!video || !video.duration || video.duration === 0) return;

    const percent = (video.currentTime / video.duration) * 100;
    const now = Date.now();

    const shouldComplete = percent >= COMPLETION_THRESHOLD && !hasCompletedRef.current;
    const shouldSendPeriodic = now - lastSentRef.current >= SEND_INTERVAL_MS;

    if (shouldComplete || shouldSendPeriodic) {
      lastSentRef.current = now;
      if (shouldComplete) hasCompletedRef.current = true;
      void sendProgress(Math.round(percent));
    }
  }, [sendProgress]);

  const handleBlockContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
  };

  const handleKeyDown = useCallback((e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && ["s", "u", "p"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVisibility = (): void => {
      if (document.hidden && !video.paused) video.pause();
    };

    const handleEnded = (): void => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        void sendProgress(100);
      }
    };

    video.addEventListener("timeupdate", handleProgressUpdate);
    video.addEventListener("ended", handleEnded);
    document.addEventListener("visibilitychange", handleVisibility);
    video.disablePictureInPicture = true;

    return () => {
      video.removeEventListener("timeupdate", handleProgressUpdate);
      video.removeEventListener("ended", handleEnded);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [handleProgressUpdate, sendProgress]);

  return (
    <div
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden select-none"
      onContextMenu={handleBlockContextMenu}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        playsInline
        preload="metadata"
        aria-label={title}
        onDragStart={(e) => e.preventDefault()}
      >
        <source src={streamUrl} type="video/mp4" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
        <span
          className="text-white/25 text-xs sm:text-sm font-semibold whitespace-nowrap animate-pulse px-4 py-2 rotate-[-12deg]"
          style={{ textShadow: "0 0 8px rgba(0,0,0,0.5)" }}
        >
          {watermark}
        </span>
      </div>
      <div className="pointer-events-none absolute top-3 left-3 text-[10px] text-white/30 font-medium">{watermark}</div>
      <div className="pointer-events-none absolute bottom-12 right-3 text-[10px] text-white/30 font-medium">
        {new Date().getFullYear()} · Balandou
      </div>
    </div>
  );
};

export default ProtectedVideoPlayer;
