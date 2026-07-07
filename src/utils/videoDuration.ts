/** Lit la durée d'une vidéo locale (navigateur) — retourne des minutes arrondies */
export const getVideoDurationMinutes = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        resolve(1);
        return;
      }
      resolve(Math.max(1, Math.ceil(video.duration / 60)));
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(1);
    };

    video.src = objectUrl;
  });

/** Affichage lisible : "12 min" */
export const formatDurationMinutes = (minutes: number): string =>
  `${minutes} min`;
