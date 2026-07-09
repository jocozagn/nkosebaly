/**
 * Palette officielle Karamoo Sêebaly
 * Extraite du logo de la marque
 */
export const BRAND = {
  name: "Karamoo Sêebaly",
  tagline: "Apprentissage du N'ko Mandingue",
  logo: "/images/logo-balandou.png",

  /** Coordonnées de contact officielles */
  contact: {
    email: "diallomoussa2003@gmail.com",
    phone: "+224622873308",
    phoneDisplay: "+224 622 87 33 08",
  },

  /** Startup développeuse de la plateforme */
  silycore: {
    name: "SILYCORE",
    tagline: "Solutions digitales",
    phone: "+224621014124",
    phoneDisplay: "+224 621 01 41 24",
  },

  colors: {
    /** Marron principal — anneau extérieur du logo */
    brown: "#7D4E2D",
    brownDark: "#5C3A21",
    brownLight: "#9A6B45",

    /** Jaune doré — étoiles du logo */
    gold: "#E8B923",
    goldDark: "#C99A1A",

    /** Bleu ciel — bordure extérieure du logo */
    sky: "#29B6F6",
    skyDark: "#0288D1",

    /** Vert clair — accent livre */
    green: "#8BC34A",
    greenDark: "#689F38",

    /** Beige — épis de grain */
    tan: "#C9A96E",

    black: "#1A1A1A",
    white: "#FFFFFF",
    gray: "#6B7280",
    grayDark: "#374151",
    background: "#FAF7F4",
  },
} as const;
