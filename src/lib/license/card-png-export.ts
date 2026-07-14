import { toCanvas } from "html-to-image";
import JSZip from "jszip";
import type { CSSProperties } from "react";

/** CR80 (85,6 × 53,98 mm) */
export const CARD_MM_WIDTH = 85.6;
export const CARD_MM_HEIGHT = 53.98;

/** 600 DPI — net à l'impression PVC (évite le flou au zoom) */
export const CARD_PNG_DPI = 600;
export const CARD_PNG_WIDTH = Math.round((CARD_MM_WIDTH / 25.4) * CARD_PNG_DPI);
export const CARD_PNG_HEIGHT = Math.round((CARD_MM_HEIGHT / 25.4) * CARD_PNG_DPI);

export type CardPngSide = "recto" | "verso";

/** Nom de fichier sûr : NKO-0001-recto.png */
export const buildCardPngFilename = (codeText: string, side: CardPngSide): string => {
  const safeCode = codeText.trim().replace(/[^\w-]+/g, "") || "carte";
  return `${safeCode}-${side}.png`;
};

const canvasToPngDataUrl = (canvas: HTMLCanvasElement): string => canvas.toDataURL("image/png");

/** Recadre sur les dimensions exactes CR80 — aucune marge autour de la carte */
const canvasToExactCardPng = (
  source: HTMLCanvasElement,
  width: number,
  height: number
): string => {
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const ctx = output.getContext("2d");
  if (!ctx) return source.toDataURL("image/png");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvasToPngDataUrl(output);
};

/** Capture uniquement l'élément `.license-pvc-card` — plein cadre, haute résolution */
export const captureCardElementPng = async (cardElement: HTMLElement): Promise<string> => {
  cardElement.style.boxShadow = "none";
  cardElement.style.margin = "0";

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const width = cardElement.offsetWidth;
  const height = cardElement.offsetHeight;
  if (width <= 0 || height <= 0) {
    throw new Error("Carte non rendue — réessayez dans quelques secondes");
  }

  const pixelRatio = Math.max(CARD_PNG_WIDTH / width, CARD_PNG_HEIGHT / height);

  const canvas = await toCanvas(cardElement, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: undefined,
  });

  return canvasToExactCardPng(canvas, CARD_PNG_WIDTH, CARD_PNG_HEIGHT);
};
/** Déclenche le téléchargement d'un PNG data URL */
export const downloadPngDataUrl = (dataUrl: string, filename: string): void => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
};

/** Attend le rendu des QR codes avant export */
export const waitForCardQrRender = (): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, 2500);
  });

interface CardPngExportItem {
  codeText: string;
  rectoElement: HTMLElement;
  versoElement: HTMLElement;
}

/** ZIP avec un PNG recto + un PNG verso par carte */
export const buildCardsPngZip = async (items: CardPngExportItem[]): Promise<Blob> => {
  const zip = new JSZip();

  for (const item of items) {
    const rectoPng = await captureCardElementPng(item.rectoElement);
    const versoPng = await captureCardElementPng(item.versoElement);

    const rectoBase64 = rectoPng.split(",")[1] ?? "";
    const versoBase64 = versoPng.split(",")[1] ?? "";

    zip.file(buildCardPngFilename(item.codeText, "recto"), rectoBase64, { base64: true });
    zip.file(buildCardPngFilename(item.codeText, "verso"), versoBase64, { base64: true });
  }

  return zip.generateAsync({ type: "blob" });
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/** Style conteneur export — taille exacte CR80, sans espace autour */
export const CARD_PNG_EXPORT_CONTAINER_STYLE: CSSProperties = {
  width: `${CARD_MM_WIDTH}mm`,
  height: `${CARD_MM_HEIGHT}mm`,
  overflow: "hidden",
  lineHeight: 0,
  margin: 0,
  padding: 0,
};

/** Conteneur hors écran pour rendu PNG (ne doit pas étirer la carte) */
export const CARD_PNG_EXPORT_STAGE_STYLE: CSSProperties = {
  position: "fixed",
  left: 0,
  top: 0,
  opacity: 0,
  pointerEvents: "none",
  zIndex: -1,
};
