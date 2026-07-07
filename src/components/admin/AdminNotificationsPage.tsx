"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, CreditCard, HelpCircle, Award } from "lucide-react";
import toast from "react-hot-toast";
import BrandLoader from "@/components/ui/BrandLoader";
import type { AdminNotification, AdminNotificationType } from "@/lib/admin/types";

const typeLabels: Record<AdminNotificationType, string> = {
  license_activated: "Activation",
  lesson_question: "Question",
  certificate_pending: "Paiement",
  certificate_paid: "Certificat",
};

const typeIcons: Record<AdminNotificationType, typeof Bell> = {
  license_activated: CreditCard,
  lesson_question: HelpCircle,
  certificate_pending: Award,
  certificate_paid: Award,
};

/** Centre de notifications admin */
const AdminNotificationsPage = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = (): void => {
    setIsLoading(true);
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setNotifications(res.data?.notifications ?? []);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id: string): Promise<void> => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadNotifications();
  };

  const handleMarkAllRead = async (): Promise<void> => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    toast.success("Toutes les notifications marquées comme lues");
    loadNotifications();
  };

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Notifications</h2>
          <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
            {unread.length} non lue{unread.length > 1 ? "s" : ""}
          </p>
        </div>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded border border-[#e8ddd4] bg-white"
          >
            <CheckCheck className="w-4 h-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-[#e8ddd4] overflow-hidden">
        {isLoading ? (
          <BrandLoader variant="inline" message="Chargement..." />
        ) : notifications.length === 0 ? (
          <p className="p-10 text-center text-sm" style={{ color: "var(--brand-gray)" }}>
            Aucune notification pour le moment
          </p>
        ) : (
          <ul className="divide-y divide-[#f0e8df]">
            {notifications.map((item) => {
              const Icon = typeIcons[item.type];
              return (
                <li
                  key={item.id}
                  className={`p-4 flex gap-3 ${!item.read ? "bg-amber-50/50" : ""}`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "var(--brand-bg)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--brand-brown)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--brand-bg)]" style={{ color: "var(--brand-brown)" }}>
                        {typeLabels[item.type]}
                      </span>
                      {!item.read && (
                        <span className="text-[10px] font-bold uppercase text-amber-700">Nouveau</span>
                      )}
                      <span className="text-xs ml-auto" style={{ color: "var(--brand-gray)" }}>
                        {new Date(item.created_at).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--brand-black)" }}>{item.title}</p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--brand-gray)" }}>{item.message}</p>
                    <div className="flex gap-3 mt-2">
                      {item.link && (
                        <Link href={item.link} className="text-xs font-medium underline" style={{ color: "var(--brand-brown)" }}>
                          Voir
                        </Link>
                      )}
                      {!item.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(item.id)}
                          className="text-xs font-medium"
                          style={{ color: "var(--brand-sky-dark)" }}
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
