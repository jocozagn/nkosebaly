"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/constants/brand";

interface NkoShellProps {
  children: React.ReactNode;
  showNav?: boolean;
}

/** Layout principal Balandou Wourouki Digital */
const NkoShell = ({ children, showNav = true }: NkoShellProps) => {
  return (
    <div
      className="min-h-screen flex flex-col font-[family-name:var(--font-dm-sans)]"
      style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-black)" }}
    >
      {/* Header marron + fine bordure bleu ciel */}
      <header
        className="text-white border-b-2"
        style={{ backgroundColor: "var(--brand-brown)", borderColor: "var(--brand-sky)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex items-center gap-3" aria-label="Accueil">
              <Image
                src={BRAND.logo}
                alt={BRAND.name}
                width={48}
                height={48}
                className="h-11 w-11 md:h-12 md:w-12 rounded-full object-cover ring-2 ring-[var(--brand-gold)]"
                priority
              />
              <div className="hidden sm:block">
                <span className="font-bold text-sm md:text-base block tracking-wide uppercase">
                  {BRAND.name}
                </span>
                <span className="text-xs text-white/70">{BRAND.tagline}</span>
              </div>
            </Link>

            {showNav && (
              <nav className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  Mes cours
                </Link>
                <Link
                  href="/dashboard/certificates"
                  className="px-3 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  Certificats
                </Link>
              </nav>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer marron foncé */}
      <footer className="text-white/80 py-5" style={{ backgroundColor: "var(--brand-brown-dark)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm space-y-2">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <a href={`mailto:${BRAND.contact.email}`} className="hover:text-white transition-colors">
              {BRAND.contact.email}
            </a>
            <span className="hidden sm:inline text-white/40">·</span>
            <a href={`tel:${BRAND.contact.phone}`} className="hover:text-white transition-colors">
              {BRAND.contact.phoneDisplay}
            </a>
          </div>
          <p className="text-white/60 text-xs">© {new Date().getFullYear()} {BRAND.name}. Tous droits réservés.</p>
          <p className="text-white/40 text-[10px]">
            Développé par {BRAND.silycore.name} · {BRAND.silycore.phoneDisplay}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NkoShell;
