"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Download, Layers, Plus, Printer } from "lucide-react";
import { CARDS_PER_A4_PAGE } from "@/lib/license/a4-print-layout";
import type { AdminCourse, AdminLicenseCard, CardDurationMonths } from "@/lib/admin/types";

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
  const [duration, setDuration] = useState<CardDurationMonths>(3);
  const [scopeMode, setScopeMode] = useState<"all" | "selected">("all");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [cardPrice, setCardPrice] = useState<number>(0);
  const [certificatePrice, setCertificatePrice] = useState<number>(0);
  const [useCertificateOverride, setUseCertificateOverride] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [lastGeneratedIds, setLastGeneratedIds] = useState<string[]>([]);

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
    const res = await fetch("/api/admin/cards", {
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
    const json = await res.json();
    setIsGenerating(false);
    if (!json.error && Array.isArray(json.data)) {
      const ids = (json.data as AdminLicenseCard[]).map((c) => c.id);
      setLastGeneratedIds(ids);
      setSelectedCardIds(ids);
    }
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

  const batchPrintHref =
    selectedCardIds.length > 0
      ? `/admin/cards/print-batch?ids=${selectedCardIds.join(",")}`
      : "";

  const batchPngHref =
    selectedCardIds.length > 0
      ? `/admin/cards/export-png?ids=${selectedCardIds.join(",")}`
      : "";

  const allVisibleSelected =
    cards.length > 0 && cards.every((card) => selectedCardIds.includes(card.id));

  const handleToggleSelectAll = (): void => {
    if (allVisibleSelected) {
      setSelectedCardIds([]);
      return;
    }
    setSelectedCardIds(cards.map((c) => c.id));
  };

  const handleToggleCardSelection = (cardId: string): void => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Cartes & Licences</h2>
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
          Génération de cartes — impression unitaire PVC ou lot A4 bristol (recto/verso, 10 cartes/feuille)
        </p>
      </div>

      {/* Formulaire génération — grille responsive pour éviter débordement sur PC */}
      <form
        onSubmit={handleGenerate}
        className="bg-white rounded-lg border border-[#e8ddd4] p-4 md:p-6 space-y-5"
      >
        {/* Ligne 1 : paramètres principaux */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-gray)" }}>
              Nombre
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full max-w-[120px] px-3 py-2.5 border border-[#e8ddd4] rounded text-sm"
            />
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-gray)" }}>
              Durée
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as CardDurationMonths)}
              className="w-full px-3 py-2.5 border border-[#e8ddd4] rounded text-sm"
            >
              <option value={1}>1 mois</option>
              <option value={2}>2 mois</option>
              <option value={3}>3 mois</option>
              <option value={6}>6 mois</option>
              <option value={12}>12 mois</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-gray)" }}>
              Prix carte (GNF)
            </label>
            <input
              type="number"
              min={0}
              value={cardPrice}
              onChange={(e) => setCardPrice(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-[#e8ddd4] rounded text-sm"
              placeholder="ex: 50000"
            />
          </div>
        </div>

        {/* Ligne 2 : portée cours + prix certificat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-gray)" }}>
              Cours autorisés
            </label>
            <select
              value={scopeMode}
              onChange={(e) => {
                const v = e.target.value as "all" | "selected";
                setScopeMode(v);
                if (v === "all") setSelectedCourseIds([]);
              }}
              className="w-full px-3 py-2.5 border border-[#e8ddd4] rounded text-sm"
            >
              <option value="all">Tous les cours</option>
              <option value="selected">Choisir des cours</option>
            </select>
            {scopeMode === "selected" && (
              <div className="mt-2 max-h-36 overflow-auto rounded border border-[#f0e8df] p-2 bg-[var(--brand-bg)]">
                {publishedCourses.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--brand-gray)" }}>
                    Aucun cours publié. Publiez un cours d&apos;abord.
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
                                isChecked
                                  ? Array.from(new Set([...prev, c.id]))
                                  : prev.filter((id) => id !== c.id)
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

          <div className="min-w-0">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--brand-gray)" }}>
              Prix certificat
            </label>
            <label
              className="flex items-start gap-2 text-xs mb-2 leading-snug"
              style={{ color: "var(--brand-gray-dark)" }}
            >
              <input
                type="checkbox"
                className="mt-0.5 shrink-0"
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
              className="w-full px-3 py-2.5 border border-[#e8ddd4] rounded text-sm disabled:opacity-50"
              placeholder="ex: 50000"
              disabled={!useCertificateOverride}
            />
          </div>
        </div>

        {/* Bouton — ligne dédiée, ne déborde plus */}
        <div className="pt-4 border-t border-[#f0e8df] flex flex-col sm:flex-row sm:justify-end">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full sm:w-auto shrink-0 px-5 py-2.5 text-white text-sm font-semibold rounded flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--brand-brown)" }}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {isGenerating ? "Génération..." : "Générer"}
          </button>
        </div>
      </form>

      {lastGeneratedIds.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-[#e8ddd4] p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ backgroundColor: "var(--brand-bg)" }}
        >
          <p className="text-sm" style={{ color: "var(--brand-gray-dark)" }}>
            <strong>{lastGeneratedIds.length} carte(s)</strong> générée(s) — prêtes pour impression A4 bristol.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/cards/export-png?ids=${lastGeneratedIds.join(",")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded border border-[#e8ddd4] px-4 py-2 text-sm font-semibold"
              style={{ color: "var(--brand-brown)" }}
            >
              <Download className="h-4 w-4" />
              Exporter PNG
            </Link>
            <Link
              href={`/admin/cards/print-batch?ids=${lastGeneratedIds.join(",")}`}
              className="inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              <Layers className="h-4 w-4" />
              Imprimer ce lot A4
            </Link>
          </div>
        </div>
      )}

      {selectedCardIds.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
            {selectedCardIds.length} carte(s) sélectionnée(s) —{" "}
            {Math.ceil(selectedCardIds.length / CARDS_PER_A4_PAGE)} feuille(s) A4 recto + verso
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={batchPngHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded border border-[#e8ddd4] px-4 py-2 text-sm font-semibold"
              style={{ color: "var(--brand-brown)" }}
            >
              <Download className="h-4 w-4" />
              Exporter PNG ({selectedCardIds.length * 2} fichiers)
            </Link>
            <Link
              href={batchPrintHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              <Layers className="h-4 w-4" />
              Imprimer lot A4 ({selectedCardIds.length})
            </Link>
          </div>
        </div>
      )}

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
                  <th className="px-3 py-3 font-medium w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleToggleSelectAll}
                      aria-label="Tout sélectionner"
                    />
                  </th>
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
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCardIds.includes(card.id)}
                        onChange={() => handleToggleCardSelection(card.id)}
                        aria-label={`Sélectionner ${card.code_text}`}
                      />
                    </td>
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
                        PVC unitaire
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
