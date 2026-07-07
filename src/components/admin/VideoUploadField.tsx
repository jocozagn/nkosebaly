"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle, Clock } from "lucide-react";
import { formatDurationMinutes, getVideoDurationMinutes } from "@/utils/videoDuration";

interface VideoUploadFieldProps {
  onUploaded: (videoId: string, durationMinutes: number) => void;
  disabled?: boolean;
}

/** Upload vidéo + détection automatique de la durée */
const VideoUploadField = ({ onUploaded, disabled = false }: VideoUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setIsDone(false);
    setFileName(file.name);
    setIsUploading(true);

    const detectedMinutes = await getVideoDurationMinutes(file);
    setDurationMinutes(detectedMinutes);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/videos/upload", { method: "POST", body: formData });
    const json = await res.json();

    setIsUploading(false);

    if (json.error) {
      setError(json.message ?? "Échec de l'upload");
      setFileName("");
      setDurationMinutes(null);
      return;
    }

    setIsDone(true);
    onUploaded(json.data.video_id, detectedMinutes);
  };

  return (
    <div className="sm:col-span-2 space-y-2">
      <label className="block text-xs font-medium" style={{ color: "var(--brand-gray)" }}>
        Vidéo (MP4, WebM, MOV — max {process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB ?? "500"} Mo)
      </label>
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:text-white file:cursor-pointer"
          style={{ color: "var(--brand-gray)" }}
          aria-label="Sélectionner une vidéo"
        />
        {isUploading && (
          <span className="flex items-center gap-2 text-xs" style={{ color: "var(--brand-brown)" }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Analyse et upload...
          </span>
        )}
        {isDone && !isUploading && (
          <span className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle className="w-4 h-4" /> Vidéo enregistrée
          </span>
        )}
      </div>
      {fileName && !error && (
        <p className="text-xs truncate" style={{ color: "var(--brand-gray)" }}>
          <Upload className="w-3 h-3 inline mr-1" />
          {fileName}
          {durationMinutes !== null && (
            <span className="ml-2 inline-flex items-center gap-1 font-medium" style={{ color: "var(--brand-brown)" }}>
              <Clock className="w-3 h-3" />
              Durée détectée : {formatDurationMinutes(durationMinutes)}
            </span>
          )}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default VideoUploadField;
