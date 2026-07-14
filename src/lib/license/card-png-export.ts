import { toPng } from "html-to-image";
import JSZip from "jszip";

/** CR80 @ 300 DPI — format attendu par les imprimeries PVC */
export const CARD_PNG_WIDTH = 1011;
export const CARD_PNG_HEIGHT = 638;

export type CardPngSide = "recto" | "verso";

/** Nom de fichier sûr : NKO-0001-recto.png */
export const buildCardPngFilename = (codeText: string, side: CardPngSide): string => {
  const safeCode = codeText.trim().replace(/[^\w-]+/g, "") || "carte";
  return `${safeCode}-${side}.png`;
};

/** Capture un nœud DOM carte en PNG haute résolution */
export const captureCardElementPng = async (element: HTMLElement): Promise<string> =>
  toPng(element, {
    width: CARD_PNG_WIDTH,
    height: CARD_PNG_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
  });

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
