"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, BookOpen, Award, User } from "lucide-react";
import { BRAND } from "@/constants/brand";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NkoShellProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const navLinks = [
  { href: "/dashboard", label: "Mes cours", icon: BookOpen },
  { href: "/dashboard/certificates", label: "Certificats", icon: Award },
  { href: "/dashboard/profile", label: "Mon profil", icon: User },
];

/** Layout principal — navigation mobile (menu latéral) + desktop */
const NkoShell = ({ children, showNav = true }: NkoShellProps) => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavClick = (): void => {
    setMenuOpen(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden font-[family-name:var(--font-dm-sans)]"
      style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-black)" }}
    >
      <header
        className="text-white border-b-2 sticky top-0 z-40"
        style={{ backgroundColor: "var(--brand-brown)", borderColor: "var(--brand-sky)" }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-14 sm:h-16 md:h-20 min-w-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 shrink" aria-label="Accueil">
              <Image
                src={BRAND.logo}
                alt={BRAND.name}
                width={48}
                height={48}
                className="h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full object-cover ring-2 ring-[var(--brand-gold)] shrink-0"
                priority
              />
              <div className="min-w-0 block text-white max-w-[160px] sm:max-w-[220px] md:max-w-none">
                <p className="font-nko text-[11px] sm:text-xs md:text-sm font-semibold truncate leading-tight">
                  {BRAND.nameNko}
                </p>
                <p className="text-[9px] sm:text-[10px] md:text-xs font-bold tracking-wide uppercase truncate">
                  {BRAND.name}
                </p>
                <p className="font-nko text-[9px] sm:text-[10px] text-white/75 truncate hidden sm:block leading-tight">
                  {BRAND.taglineNko}
                </p>
              </div>
            </Link>

            {showNav && (
              <>
                {/* Navigation desktop */}
                <nav className="hidden md:flex items-center gap-1 shrink-0">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors whitespace-nowrap"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Menu mobile */}
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                      aria-label="Ouvrir le menu"
                    >
                      <Menu className="w-6 h-6" />
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-[min(100%,320px)] p-0 border-0 !bg-[var(--brand-bg)] text-[var(--brand-brown)] [&_.sheetCloseBtn]:text-[var(--brand-brown)] [&_.sheetCloseBtn]:border-[var(--brand-brown)]/20 [&_.sheetCloseBtn]:bg-white"
                  >
                    <SheetHeader className="p-4 border-b border-[var(--brand-brown)]/10 text-left">
                      <SheetTitle className="!text-[var(--brand-brown)] flex items-center gap-3">
                        <Image
                          src={BRAND.logo}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--brand-gold)]"
                        />
                        <span className="font-nko text-sm font-semibold">{BRAND.nameNko}</span>
                        <span className="text-xs font-bold uppercase">{BRAND.name}</span>
                      </SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col p-3 gap-1">
                      {navLinks.map((link) => {
                        const isActive =
                          pathname === link.href || pathname.startsWith(`${link.href}/`);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={handleNavClick}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-lg text-base font-medium transition-colors ${
                              isActive
                                ? "text-white font-semibold bg-[var(--brand-brown)]"
                                : "text-[var(--brand-brown)] bg-white border border-[var(--brand-brown)]/10 hover:bg-[var(--brand-bg)]"
                            }`}
                          >
                            <link.icon
                              className={`w-5 h-5 shrink-0 ${
                                isActive ? "text-[var(--brand-gold)]" : "text-[var(--brand-brown)]"
                              }`}
                            />
                            {link.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0 w-full">{children}</main>

      <footer className="text-white/80 py-5 mt-auto" style={{ backgroundColor: "var(--brand-brown-dark)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 text-center text-sm space-y-2">
          <div className="space-y-1">
            <p className="font-nko text-sm text-white/90">{BRAND.professor.nko}</p>
            <p className="text-xs text-white/70">{BRAND.professor.french}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
            <a href={`mailto:${BRAND.contact.email}`} className="hover:text-white transition-colors break-all sm:break-normal text-xs sm:text-sm">
              {BRAND.contact.email}
            </a>
            <span className="hidden sm:inline text-white/40">·</span>
            <a href={`tel:${BRAND.contact.phone}`} className="font-nko hover:text-white transition-colors text-xs sm:text-sm">
              {BRAND.contact.phoneDisplayNko}
            </a>
          </div>
          <p className="text-white/60 text-xs">© {new Date().getFullYear()} {BRAND.nameNko} · {BRAND.name}</p>
          <p className="text-white/40 text-[10px] px-2">
            Développé par {BRAND.silycore.name} · {BRAND.silycore.phoneDisplay}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NkoShell;
