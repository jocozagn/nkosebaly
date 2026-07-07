import Image from "next/image";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/constants/brand";

interface BrandLoaderProps {
  /** Message affiché sous le logo */
  message?: string;
  /** full = page entière | inline = dans un bloc | overlay = par-dessus le contenu */
  variant?: "full" | "inline" | "overlay";
  /** Version compacte (spinner seul, pour petits blocs) */
  compact?: boolean;
  className?: string;
}

/** Loader Balandou — logo + spinner, visible pendant les chargements lents */
const BrandLoader = ({
  message = "Chargement...",
  variant = "full",
  compact = false,
  className = "",
}: BrandLoaderProps) => {
  if (compact) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`} role="status" aria-live="polite" aria-label={message}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-brown)" }} />
        <p className="text-xs font-medium text-center" style={{ color: "var(--brand-gray)" }}>{message}</p>
      </div>
    );
  }
  const content = (
    <div
      className="flex flex-col items-center gap-4"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative">
        <Image
          src={BRAND.logo}
          alt={BRAND.name}
          width={64}
          height={64}
          className="h-14 w-14 md:h-16 md:w-16 rounded-full object-cover ring-2 ring-[var(--brand-gold)]"
          priority
        />
        <div
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "var(--brand-bg)" }}
        >
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--brand-brown)" }} />
        </div>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--brand-gray)" }}>
        {message}
      </p>
      {/* Points animés pour montrer que l'app est active */}
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{
              backgroundColor: "var(--brand-brown)",
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );

  if (variant === "overlay") {
    return (
      <div
        className={`fixed inset-0 z-[9998] flex items-center justify-center backdrop-blur-[2px] ${className}`}
        style={{ backgroundColor: "rgba(250, 247, 244, 0.85)" }}
      >
        {content}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center ${className}`}
      style={{ backgroundColor: "var(--brand-bg)" }}
    >
      {content}
    </div>
  );
};

export default BrandLoader;
