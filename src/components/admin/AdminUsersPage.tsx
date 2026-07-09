"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import BrandLoader from "@/components/ui/BrandLoader";
import type { AdminUser } from "@/lib/admin/types";

interface AdminUserRow extends AdminUser {
  lessons_completed?: number;
  lessons_total?: number;
}

/** Gestion des étudiants inscrits via activation licence */
const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = (): void => {
    setIsLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) setUsers(res.data ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAdd = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Étudiants</h2>
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
          Profils enregistrés lors de l&apos;activation de la carte licence
        </p>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-lg border border-[#e8ddd4] p-4 flex flex-col sm:flex-row gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ajout manuel — nom de l'étudiant"
          className="flex-1 px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
        />
        <button type="submit" className="px-5 py-2.5 text-white text-sm font-semibold rounded flex items-center gap-2" style={{ backgroundColor: "var(--brand-brown)" }}>
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </form>

      <div className="bg-white rounded-lg border border-[#e8ddd4] overflow-x-auto">
        {isLoading ? (
          <BrandLoader variant="inline" message="Chargement des étudiants..." />
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: "var(--brand-gray)" }}>Aucun étudiant enregistré</p>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-[var(--brand-bg)]">
              <tr className="text-left" style={{ color: "var(--brand-gray)" }}>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="px-4 py-3 font-medium">Ville</th>
                <th className="px-4 py-3 font-medium min-w-[180px]">Progression</th>
                <th className="px-4 py-3 font-medium">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-[#f0e8df]">
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: "var(--brand-black)" }}>{user.name}</p>
                    {user.occupation && (
                      <p className="text-xs" style={{ color: "var(--brand-gray)" }}>{user.occupation}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p>{user.phone ?? "—"}</p>
                    {user.email && <p className="text-xs" style={{ color: "var(--brand-gray)" }}>{user.email}</p>}
                  </td>
                  <td className="px-4 py-3">{user.city ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold" style={{ color: "var(--brand-brown)" }}>
                          {user.progress_percent}%
                        </span>
                        <span style={{ color: "var(--brand-gray)" }}>
                          {user.lessons_completed ?? 0}/{user.lessons_total ?? 0} leçon(s)
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden bg-[#e8ddd4]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${user.progress_percent}%`,
                            backgroundColor: "var(--brand-sky)",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--brand-gray)" }}>
                    {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
