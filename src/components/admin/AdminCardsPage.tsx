"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Printer } from "lucide-react";
import type { AdminCourse, AdminLicenseCard } from "@/lib/admin/types";

const STATUS_LABELS: Record<string, string> = {
  unused: "Non utilisée",
  active: "Active",
  expired: "Expirée",
  disabled: "Désactivée",
};

/** Gestion des cartes licence NKO-XXXX */
const AdminCardsPage = () => {
  const [cards, setCards] = useState<AdminLicenseCard[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [count, setCount] = useState(5);
  const [duration, setDuration] = useState<3 | 6 | 12>(3);
  const [scopeMode, setScopeMode] = useState<"all" | "selected">("all");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [cardPrice, setCardPrice] = useState<number>(0);
  const [certificatePrice, setCertificatePrice] = useState<number>(0);
  const [useCertificateOverride, setUseCertificateOverride] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadCards = (): void => {
    fetch("/api/admin/cards")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setCards(res.data ?? []);
      });
  };

  useEffect(() => {
    loadCards();
    fetch("/api/admin/courses")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setCourses(res.data ?? []);
      });
  }, []);

  const publishedCourses = useMemo(
    () => (courses ?? []).filter((c) => c.status === "published"),
    [courses]
  );

  const courseTitleMap = useMemo(
    () =>
      (courses ?? []).reduce<Record<string, string>>((acc, course) => {
        acc[course.id] = course.title;
        return acc;
      }, {}),
    [courses]
  );

  const handleGenerate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsGenerating(true);
    await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        count,
        duration_months: duration,
        allowed_course_ids: scopeMode === "all" ? [] : selectedCourseIds,
        card_price_gnf: cardPrice > 0 ? cardPrice : undefined,
        certificate_price_gnf: useCertificateOverride && certificatePrice > 0 ? certificatePrice : undefined,
      }),
    });
    setIsGenerating(false);
    loadCards();
  };

  const handleToggleStatus = async (card: AdminLicenseCard): Promise<void> => {
    const newStatus = card.status === "disabled" ? "unused" : "disabled";
    await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id, status: newStatus }),
    });
    loadCards();
  };

  const handleRevokeDevice = async (card: AdminLicenseCard): Promise<void> => {
    const ok = window.confirm(
      "Révoquer cette licence de l'appareil actuel ?\n\n" +
        "La carte redeviendra 'Non utilisée' et pourra être activée sur un autre téléphone."
    );
    if (!ok) return;

    await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke_device", id: card.id }),
    });
    loadCards();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Cartes & Licences</h2>
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
          Génération de cartes PVC — licence encodée dans le QR au verso (scan app uniquement)
        </p>
      </div>

      <form onSubmit={handleGenerate} className="bg-white rounded-lg border border-[#e8ddd4] p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray)" }}>Nombre</label>
          <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-24 px-3 py-2.5 border border-[#e8ddd4] rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray)" }}>Durée</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value) as 3 | 6 | 12)} className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm">
            <option value={3}>3 mois</option>
            <option value={6}>6 mois</option>
            <option value={12}>12 mois</option>
          </select>
        </div>
        <div className="min-w-[200px]">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray)" }}>Cours autorisés</label>
          <select
            value={scopeMode}
            onChange={(e) => {
              const v = e.target.value as "all" | "selected";
              setScopeMode(v);
              if (v === "all") setSelectedCourseIds([]);
            }}
            className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm w-full"
          >
            <option value="all">Tous les cours</option>
            <option value="selected">Choisir des cours</option>
          </select>
          {scopeMode === "selected" && (
            <div className="mt-2 max-h-36 overflow-auto rounded border border-[#f0e8df] p-2 bg-[var(--brand-bg)]">
              {publishedCourses.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
                  Aucun cours publié. Publiez un cours d'abord.
                </p>
              ) : (
                <div className="space-y-1">
                  {publishedCourses.map((c) => {
                    const checked = selectedCourseIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-start gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(ev) => {
                            const isChecked = ev.target.checked;
                            setSelectedCourseIds((prev) =>
                              isChecked ? Array.from(new Set([...prev, c.id])) : prev.filter((id) => id !== c.id)
                            );
                          }}
                        />
                        <span style={{ color: "var(--brand-gray-dark)" }}>{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray)" }}>Prix carte (GNF)</label>
          <input
            type="number"
            min={0}
            value={cardPrice}
            onChange={(e) => setCardPrice(Number(e.target.value))}
            className="w-40 px-3 py-2.5 border border-[#e8ddd4] rounded text-sm"
            placeholder="ex: 50000"
          />
        </div>

        <div className="min-w-[220px]">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--brand-gray)" }}>Prix certificat</label>
          <label className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--brand-gray-dark)" }}>
            <input
              type="checkbox"
              checked={useCertificateOverride}
              onChange={(e) => setUseCertificateOverride(e.target.checked)}
            />
            Définir un prix certificat spécifique à cette carte
          </label>
          <input
            type="number"
            min={0}
            value={certificatePrice}
            onChange={(e) => setCertificatePrice(Number(e.target.value))}
            className="w-40 px-3 py-2.5 border border-[#e8ddd4] rounded text-sm"
            placeholder="ex: 50000"
            disabled={!useCertificateOverride}
          />
        </div>
        <button type="submit" disabled={isGenerating} className="px-5 py-2.5 text-white text-sm font-semibold rounded flex items-center gap-2" style={{ backgroundColor: "var(--brand-brown)" }}>
          <Plus className="w-4 h-4" /> {isGenerating ? "Génération..." : "Générer"}
        </button>
      </form>

      <div className="bg-white rounded-lg border border-[#e8ddd4] overflow-hidden">
        {cards.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--brand-tan)" }} />
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>Aucune carte. Générez-en ci-dessus.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--brand-bg)]">
                <tr className="text-left" style={{ color: "var(--brand-gray)" }}>
                  <th className="px-4 py-3 font-medium">Réf. interne</th>
                  <th className="px-4 py-3 font-medium">Durée</th>
                  <th className="px-4 py-3 font-medium">Cours</th>
                  <th className="px-4 py-3 font-medium">Prix carte</th>
                  <th className="px-4 py-3 font-medium">Appareil</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Créée le</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.id} className="border-t border-[#f0e8df]">
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--brand-gray)" }} title="Référence admin — non imprimée sur la carte">
                      {card.code_text}
                    </td>
                    <td className="px-4 py-3">{card.duration_months} mois</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--brand-gray)" }}>
                      {card.allowed_course_ids && card.allowed_course_ids.length > 0
                        ? card.allowed_course_ids.map((id) => courseTitleMap[id] ?? id).join(", ")
                        : "Tous"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--brand-gray)" }}>
                      {typeof card.card_price_gnf === "number" ? `${card.card_price_gnf} GNF` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--brand-gray)" }}>
                      {card.device_id ? (
                        <span title={card.device_id}>
                          {card.device_id.length > 18
                            ? `${card.device_id.slice(0, 10)}…${card.device_id.slice(-6)}`
                            : card.device_id}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs text-white capitalize" style={{
                        backgroundColor: card.status === "active" ? "var(--brand-green)" : card.status === "unused" ? "var(--brand-sky)" : "var(--brand-gray)",
                      }}>
                        {STATUS_LABELS[card.status] ?? card.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--brand-gray)" }}>
                      {new Date(card.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <Link
                        href={`/admin/cards/print?id=${card.id}`}
                        className="inline-flex items-center gap-1 text-xs underline"
                        style={{ color: "var(--brand-brown)" }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Printer className="w-3 h-3" />
                        Imprimer PVC
                      </Link>
                      {card.status === "active" && card.device_id ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeDevice(card)}
                          className="text-xs underline"
                          style={{ color: "var(--brand-brown)" }}
                          aria-label="Révoquer la licence de l'appareil"
                        >
                          Révoquer appareil
                        </button>
                      ) : null}
                      <button type="button" onClick={() => handleToggleStatus(card)} className="text-xs underline" style={{ color: "var(--brand-gray)" }}>
                        {card.status === "disabled" ? "Réactiver" : "Désactiver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCardsPage;
