import { BRAND } from "@/constants/brand";

interface BrandTitleProps {
  /** Variante compacte pour la barre de navigation */
  compact?: boolean;
  /** Afficher le professeur fondateur */
  showProfessor?: boolean;
  /** Afficher le numéro en N'ko */
  showContact?: boolean;
  className?: string;
}

/** Titre de marque — N'ko puis nom latin, slogan et professeur */
const BrandTitle = ({
  compact = false,
  showProfessor = false,
  showContact = false,
  className = "",
}: BrandTitleProps) => (
  <div className={`min-w-0 ${className}`}>
    <p
      className={`font-nko leading-snug font-semibold truncate ${compact ? "text-xs sm:text-sm" : "text-base sm:text-lg md:text-xl"}`}
      style={{ color: "var(--brand-brown)" }}
    >
      {BRAND.nameNko}
    </p>
    <p
      className={`font-bold tracking-wide uppercase truncate ${compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"}`}
      style={{ color: "var(--brand-brown-dark)" }}
    >
      {BRAND.name}
    </p>
    {!compact && (
      <p className="font-nko text-xs sm:text-sm mt-1 leading-snug" style={{ color: "var(--brand-gray-dark)" }}>
        {BRAND.taglineNko}
      </p>
    )}
    {showProfessor && (
      <div className="mt-2 space-y-0.5">
        <p className="font-nko text-xs sm:text-sm font-medium" style={{ color: "var(--brand-brown)" }}>
          {BRAND.professor.nko}
        </p>
        <p className="text-[10px] sm:text-xs" style={{ color: "var(--brand-gray)" }}>
          {BRAND.professor.french}
        </p>
      </div>
    )}
    {showContact && (
      <p className="font-nko text-xs mt-2" style={{ color: "var(--brand-gray-dark)" }}>
        {BRAND.contact.phoneDisplayNko}
      </p>
    )}
  </div>
);

export default BrandTitle;
