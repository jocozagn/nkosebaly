"use client";

import { useEffect, useState } from "react";
import type { AdminCategory } from "@/lib/admin/types";

/** Gestion des catégories */
const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = (): void => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setCategories(res.data ?? []);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);

    await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    setName("");
    setDescription("");
    setIsSaving(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Catégories</h2>
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>Organisez vos cours par catégorie</p>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-lg border border-[#e8ddd4] p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium mb-1">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
            placeholder="N'ko Mandingue"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 text-white font-semibold rounded"
          style={{ backgroundColor: "var(--brand-brown)" }}
        >
          Ajouter
        </button>
      </form>

      <div className="bg-white rounded-lg border border-[#e8ddd4] divide-y divide-[#f0e8df]">
        {categories.map((cat) => (
          <div key={cat.id} className="px-4 py-3 flex justify-between items-center">
            <div>
              <p className="font-medium" style={{ color: "var(--brand-black)" }}>{cat.name}</p>
              {cat.description && (
                <p className="text-xs mt-0.5" style={{ color: "var(--brand-gray)" }}>{cat.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCategoriesPage;
