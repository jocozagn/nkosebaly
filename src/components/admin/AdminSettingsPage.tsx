"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import BrandLoader from "@/components/ui/BrandLoader";
import { DEFAULT_LICENSE_PLANS } from "@/lib/license/plans";
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
        if (!res.error) {
          const data = res.data as AdminSettings;
          setSettings({
            ...data,
            license_plans: data.license_plans?.length ? data.license_plans : DEFAULT_LICENSE_PLANS,
          });
        }
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

        <div className="pt-2 border-t border-[#f0e8df] space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--brand-brown)" }}>
              Formules licence en ligne (Djomy)
            </h3>
            <p className="text-xs mb-3" style={{ color: "var(--brand-gray)" }}>
              Plusieurs durées / prix — l&apos;élève choisit avant le paiement (web + mobile)
            </p>
          </div>

          <div className="space-y-3">
            {(settings.license_plans ?? []).map((plan, index) => (
              <div
                key={plan.id || index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded border border-[#f0e8df] bg-[var(--brand-bg)]"
              >
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Durée (mois)</label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={plan.duration_months}
                    onChange={(e) => {
                      const plans = [...(settings.license_plans ?? [])];
                      plans[index] = { ...plan, duration_months: Number(e.target.value) };
                      setSettings({ ...settings, license_plans: plans });
                    }}
                    className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium mb-1">Prix (GNF)</label>
                  <input
                    type="number"
                    min={0}
                    value={plan.price_gnf}
                    onChange={(e) => {
                      const plans = [...(settings.license_plans ?? [])];
                      plans[index] = { ...plan, price_gnf: Number(e.target.value) };
                      setSettings({ ...settings, license_plans: plans });
                    }}
                    className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium mb-1">Libellé (optionnel)</label>
                  <input
                    value={plan.label ?? ""}
                    onChange={(e) => {
                      const plans = [...(settings.license_plans ?? [])];
                      plans[index] = { ...plan, label: e.target.value };
                      setSettings({ ...settings, license_plans: plans });
                    }}
                    placeholder="ex: Essai 1 mois"
                    className="w-full px-3 py-2 border border-[#e8ddd4] rounded text-sm"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={plan.active}
                    onChange={(e) => {
                      const plans = [...(settings.license_plans ?? [])];
                      plans[index] = { ...plan, active: e.target.checked };
                      setSettings({ ...settings, license_plans: plans });
                    }}
                  />
                  <span className="text-xs">Active</span>
                </div>
                <div className="sm:col-span-1 flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      const plans = (settings.license_plans ?? []).filter((_, i) => i !== index);
                      setSettings({ ...settings, license_plans: plans });
                    }}
                    className="text-xs underline"
                    style={{ color: "var(--brand-gray)" }}
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const plans = [...(settings.license_plans ?? [])];
              plans.push({
                id: `plan-${Date.now()}`,
                duration_months: 3,
                price_gnf: 150000,
                active: true,
              });
              setSettings({ ...settings, license_plans: plans });
            }}
            className="text-sm font-medium underline"
            style={{ color: "var(--brand-brown)" }}
          >
            + Ajouter une formule
          </button>
        </div>

        <div className="pt-2 border-t border-[#f0e8df] space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--brand-brown)" }}>
              Application mobile (APK)
            </h3>
            <p className="text-xs mb-3" style={{ color: "var(--brand-gray)" }}>
              Incrémentez le build après chaque nouvel APK — un bandeau « Mettre à jour » apparaît dans l&apos;app si la version serveur est plus récente.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Version (ex. 1.0.1)</label>
              <input
                value={settings.mobile_app_version ?? "1.0.0"}
                onChange={(e) => setSettings({ ...settings, mobile_app_version: e.target.value })}
                className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Build Android (versionCode)</label>
              <input
                type="number"
                min={1}
                value={settings.mobile_app_build ?? 1}
                onChange={(e) => setSettings({ ...settings, mobile_app_build: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes de version (bandeau in-app)</label>
            <textarea
              rows={2}
              value={settings.mobile_app_release_notes ?? ""}
              onChange={(e) => setSettings({ ...settings, mobile_app_release_notes: e.target.value })}
              className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
              placeholder="Ex. : Nouvelles leçons, corrections vidéos..."
            />
          </div>
        </div>

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
