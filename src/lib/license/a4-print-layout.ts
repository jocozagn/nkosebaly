/** Dimensions CR80 et grille A4 pour impression lot (bristol + plastification) */
export const A4_PRINT = {
  cardWidthMm: 85.6,
  cardHeightMm: 53.98,
  pageWidthMm: 210,
  pageHeightMm: 297,
  marginMm: 8,
  cols: 2,
  rows: 5,
} as const;

export const CARDS_PER_A4_PAGE = A4_PRINT.cols * A4_PRINT.rows;

export interface CardSlotPosition {
  leftMm: number;
  topMm: number;
  slotIndex: number;
}

/** Position absolue d'une carte dans la grille A4 (index 0 = haut-gauche, ligne par ligne) */
export const getA4SlotPosition = (
  slotIndex: number,
  options?: { mirrorColumns?: boolean }
): CardSlotPosition => {
  const { marginMm, cols, rows, cardWidthMm, cardHeightMm, pageWidthMm, pageHeightMm } =
    A4_PRINT;

  const col = slotIndex % cols;
  const row = Math.floor(slotIndex / cols);
  const displayCol = options?.mirrorColumns ? cols - 1 - col : col;

  const usableW = pageWidthMm - 2 * marginMm;
  const usableH = pageHeightMm - 2 * marginMm;
  const hGap = cols > 1 ? (usableW - cols * cardWidthMm) / (cols - 1) : 0;
  const vGap = rows > 1 ? (usableH - rows * cardHeightMm) / (rows - 1) : 0;

  return {
    leftMm: marginMm + displayCol * (cardWidthMm + hGap),
    topMm: marginMm + row * (cardHeightMm + vGap),
    slotIndex,
  };
};

/** Découpe une liste de cartes en pages A4 (10 cartes max par page) */
export const chunkCardsForA4 = <T>(items: T[]): T[][] => {
  if (items.length === 0) return [];

  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += CARDS_PER_A4_PAGE) {
    pages.push(items.slice(i, i + CARDS_PER_A4_PAGE));
  }
  return pages;
};
