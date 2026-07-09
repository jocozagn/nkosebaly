"use client";

import { useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

/** Sidebar admin — drawer mobile + barre fixe desktop */
const AdminShell = ({ children }: AdminShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  const SidebarNav = ({
    onNavigate,
    surface = "dark",
  }: {
    onNavigate?: () => void;
    /** dark = barre latérale desktop ; light = drawer mobile fond crème */
    surface?: "dark" | "light";
  }) => {
    const isLight = surface === "light";
    const headerTitleClass = isLight ? "text-[var(--brand-brown)]" : "text-white";
    const headerSubClass = isLight ? "text-[var(--brand-brown)]/60" : "text-white/60";
    const borderClass = isLight ? "border-[var(--brand-brown)]/10" : "border-white/10";
    const inactiveLinkClass = isLight
      ? "text-[var(--brand-brown)] bg-white border border-[var(--brand-brown)]/10 hover:bg-[var(--brand-bg)]"
      : "text-[var(--brand-brown)] bg-[var(--brand-bg)] hover:bg-white";

    return (
      <>
        <div className={`p-4 border-b ${borderClass}`}>
          <Link href="/admin/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
            <Image
              src={BRAND.logo}
              alt={BRAND.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--brand-gold)] shrink-0"
            />
            <div className="min-w-0">
              <span className={`font-bold text-xs uppercase tracking-wide block ${headerTitleClass}`}>
                Administration
              </span>
              <span className={`text-[10px] truncate block ${headerSubClass}`}>{BRAND.name}</span>
            </div>
          </Link>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
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
                    : inactiveLinkClass
                }`}
              >
                <item.icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-[var(--brand-gold)]" : "text-[var(--brand-brown)]"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`p-3 border-t ${borderClass} space-y-1 shrink-0`}>
          <Link
            href="/"
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${inactiveLinkClass}`}
          >
            <HelpCircle className="w-5 h-5 shrink-0 text-[var(--brand-brown)]" />
            Site public
          </Link>
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              void handleLogout();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm ${inactiveLinkClass}`}
          >
            <LogOut className="w-5 h-5 shrink-0 text-[var(--brand-brown)]" />
            Déconnexion
          </button>
        </div>
      </>
    );
  };

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className="min-h-screen flex overflow-x-hidden font-[family-name:var(--font-dm-sans)]" style={{ backgroundColor: "var(--brand-bg)" }}>
        <aside
          className="hidden lg:flex w-64 shrink-0 text-white flex-col sticky top-0 h-screen"
          style={{ backgroundColor: "var(--brand-brown-dark)" }}
        >
          <SidebarNav />
        </aside>

        <div className="flex-1 flex flex-col min-w-0 w-full">
          <header className="bg-white border-b border-[#e8ddd4] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sticky top-0 z-30">
            <div className="flex items-center gap-2 min-w-0">
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-[#e8ddd4] shrink-0"
                  style={{ color: "var(--brand-brown)" }}
                  aria-label="Ouvrir le menu admin"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <h1 className="text-base sm:text-lg font-semibold truncate" style={{ color: "var(--brand-brown)" }}>
                Administration
              </h1>
            </div>
            <AdminNotificationBell />
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto min-w-0">{children}</main>
        </div>

        <SheetContent
          side="left"
          className="lg:hidden w-[min(100%,288px)] p-0 border-0 flex flex-col h-full !bg-[var(--brand-bg)] text-[var(--brand-brown)] [&_.sheetCloseBtn]:text-[var(--brand-brown)] [&_.sheetCloseBtn]:border-[var(--brand-brown)]/20 [&_.sheetCloseBtn]:bg-white"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu administration</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileOpen(false)} surface="light" />
        </SheetContent>
      </div>
    </Sheet>
  );
};

export default AdminShell;
