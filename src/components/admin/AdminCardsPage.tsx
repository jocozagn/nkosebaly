"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Printer } from "lucide-react";
import type { AdminLicenseCard } from "@/lib/admin/types";

const STATUS_LABELS: Record<string, string> = {
  unused: "Non utilisée",
  active: "Active",
  expired: "Expirée",
  disabled: "Désactivée",
};

/** Gestion des cartes licence NKO-XXXX */
const AdminCardsPage = () => {
  const [cards, setCards] = useState<AdminLicenseCard[]>([]);
  const [count, setCount] = useState(5);
  const [duration, setDuration] = useState<3 | 6 | 12>(3);
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
  }, []);

  const handleGenerate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsGenerating(true);
    await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate", count, duration_months: duration }),
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
