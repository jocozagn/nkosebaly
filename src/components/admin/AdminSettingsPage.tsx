"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import BrandLoader from "@/components/ui/BrandLoader";
import type { AdminSettings } from "@/lib/admin/types";

/** Paramètres système — inspiré WRTeam System Settings */
const AdminSettingsPage = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setSettings(res.data);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setSaved(false);

    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!settings) {
    return <BrandLoader variant="inline" message="Chargement des paramètres..." />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Paramètres système</h2>
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
          Configuration générale de la plateforme
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#e8ddd4] p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Nom de l&apos;application</label>
          <input
            value={settings.app_name}
            onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
            className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email de contact</label>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Téléphone</label>
            <input
              value={settings.contact_phone}
              onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Commission plateforme (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.commission_rate}
            onChange={(e) => setSettings({ ...settings, commission_rate: Number(e.target.value) })}
            className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.instructor_auto_approve}
            onChange={(e) => setSettings({ ...settings, instructor_auto_approve: e.target.checked })}
          />
          Approuver automatiquement les instructeurs
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#f0e8df]">
          <div>
            <label className="block text-sm font-medium mb-1">Prix certificat (GNF)</label>
            <input
              type="number"
              min={0}
              value={settings.certificate_price}
              onChange={(e) => setSettings({ ...settings, certificate_price: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Seuil quiz (bonnes réponses)</label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.quiz_pass_threshold}
              onChange={(e) => setSettings({ ...settings, quiz_pass_threshold: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tentatives max quiz</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.quiz_max_attempts}
              onChange={(e) => setSettings({ ...settings, quiz_max_attempts: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-white font-semibold rounded flex items-center gap-2"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Enregistrer
          </button>
          {saved && <span className="text-sm text-green-600">Paramètres enregistrés</span>}
        </div>
      </form>
    </div>
  );
};

export default AdminSettingsPage;
