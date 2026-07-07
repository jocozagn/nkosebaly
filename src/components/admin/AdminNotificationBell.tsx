"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

/** Cloche notifications avec compteur non lues */
const AdminNotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = (): void => {
      fetch("/api/admin/notifications")
        .then((r) => r.json())
        .then((res) => {
          if (!res.error) setUnreadCount(res.data?.unread_count ?? 0);
        })
        .catch(() => undefined);
    };

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/admin/notifications"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#e8ddd4] bg-white hover:bg-[var(--brand-bg)] transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lues` : ""}`}
    >
      <Bell className="w-5 h-5" style={{ color: "var(--brand-brown)" }} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
};

export default AdminNotificationBell;
