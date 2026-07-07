"use client";

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
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/certificates", label: "Certificats", icon: Award },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

/** Layout admin avec sidebar — inspiré eLMS, design Balandou */
const AdminShell = ({ children }: AdminShellProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen flex font-[family-name:var(--font-dm-sans)]" style={{ backgroundColor: "var(--brand-bg)" }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 text-white flex flex-col" style={{ backgroundColor: "var(--brand-brown-dark)" }}>
        <div className="p-4 border-b border-white/10">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <Image
              src={BRAND.logo}
              alt={BRAND.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--brand-gold)]"
            />
            <div>
              <span className="font-bold text-xs uppercase tracking-wide block">Administration</span>
              <span className="text-[10px] text-white/60">Balandou Wourouki</span>
            </div>
          </Link>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
                style={isActive ? { backgroundColor: "var(--brand-brown)" } : undefined}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded text-sm text-white/75 hover:bg-white/10 hover:text-white"
          >
            <HelpCircle className="w-5 h-5" />
            Site public
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-white/75 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#e8ddd4] px-6 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold" style={{ color: "var(--brand-brown)" }}>
            Panneau d&apos;administration
          </h1>
          <AdminNotificationBell />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminShell;
