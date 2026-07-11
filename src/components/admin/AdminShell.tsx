"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Settings,
  CreditCard,
  HelpCircle,
  ClipboardList,
  Users,
  Award,
  Bell,
  BarChart3,
  Menu,
} from "lucide-react";
import { BRAND } from "@/constants/brand";
import AdminNotificationBell from "./AdminNotificationBell";

interface AdminShellProps {
  children: React.ReactNode;
}

const menuItems = [
  { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Cours", icon: BookOpen },
  { href: "/admin/categories", label: "Catégories", icon: FolderOpen },
  { href: "/admin/quiz", label: "Quiz", icon: ClipboardList },
  { href: "/admin/cards", label: "Cartes / Licences", icon: CreditCard },
  { href: "/admin/users", label: "Étudiants", icon: Users },
  { href: "/admin/analytics", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/certificates", label: "Certificats", icon: Award },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

/** Barre latérale admin — pleine hauteur à gauche, scroll invisible si besoin */
const AdminSidebar = ({
  onNavigate,
  className = "",
}: {
  onNavigate?: () => void;
  className?: string;
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  return (
    <aside
      className={`w-64 h-dvh shrink-0 text-white flex flex-col min-h-0 ${className}`}
      style={{ backgroundColor: "var(--brand-brown-dark)" }}
      aria-label="Menu administration"
    >
      <div className="p-4 border-b border-white/10 shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <Image
            src={BRAND.logo}
            alt={BRAND.name}
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--brand-gold)] shrink-0"
          />
          <div className="min-w-0">
            <span className="font-bold text-xs uppercase tracking-wide block text-white">
              Administration
            </span>
            <span className="text-[10px] truncate block text-white/60">{BRAND.name}</span>
          </div>
        </Link>
      </div>

      {/* Scroll invisible si la liste dépasse — header/footer restent fixes */}
      <nav className="p-3 space-y-1 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hidden">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                isActive
                  ? "text-white font-semibold bg-[var(--brand-brown)]"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? "text-[var(--brand-gold)]" : "text-white/75"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-1 shrink-0 mt-auto">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded text-sm text-white/75 hover:bg-white/10 hover:text-white"
        >
          <HelpCircle className="w-5 h-5 shrink-0 text-white/75" />
          Site public
        </Link>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void handleLogout();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-white/75 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="w-5 h-5 shrink-0 text-white/75" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

/** Layout admin — sidebar identique desktop (fixe) et mobile (overlay pleine hauteur) */
const AdminShell = ({ children }: AdminShellProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const handleCloseMobile = (): void => {
    setMobileOpen(false);
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden font-[family-name:var(--font-dm-sans)]"
      style={{ backgroundColor: "var(--brand-bg)" }}
    >
      {/* Desktop — fixe à gauche, ne scroll jamais avec le contenu */}
      <div className="hidden lg:block fixed top-0 left-0 z-30 h-dvh w-64">
        <AdminSidebar className="h-full w-full" />
      </div>

      {/* Mobile — overlay + barre pleine hauteur bord à bord à gauche */}
      {mobileOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-label="Fermer le menu"
          onClick={handleCloseMobile}
        />
      )}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 h-dvh w-64 transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        style={{ backgroundColor: "var(--brand-brown-dark)" }}
      >
        <AdminSidebar onNavigate={handleCloseMobile} className="h-full w-full" />
      </div>

      {/* Contenu — décalé de 256px (w-64) sur desktop */}
      <div className="flex flex-col min-h-screen min-w-0 w-full lg:pl-64">
        <header className="bg-white border-b border-[#e8ddd4] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-[#e8ddd4] shrink-0"
              style={{ color: "var(--brand-brown)" }}
              aria-label="Ouvrir le menu admin"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold truncate" style={{ color: "var(--brand-brown)" }}>
              Administration
            </h1>
          </div>
          <AdminNotificationBell />
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
};

export default AdminShell;
