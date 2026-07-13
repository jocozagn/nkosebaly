"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, ExternalLink, CheckCircle, Eye, Printer } from "lucide-react";
import toast from "react-hot-toast";
import type { AdminCertificate, AdminCourse, AdminUser } from "@/lib/admin/types";

/** Gestion des certificats — émission admin et validation des demandes */
const AdminCertificatesPage = () => {
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [form, setForm] = useState({ user_id: "", course_id: "", force: false });

  const loadData = (): void => {
    Promise.all([
      fetch("/api/admin/certificates").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/courses").then((r) => r.json()),
    ]).then(([certRes, usersRes, coursesRes]) => {
      if (!certRes.error) setCertificates(certRes.data ?? []);
      if (!usersRes.error) setUsers(usersRes.data ?? []);
      if (!coursesRes.error) setCourses(coursesRes.data ?? []);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssue = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!form.user_id || !form.course_id) return;

    const res = await fetch("/api/admin/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    if (json.error) {
      toast.error(json.message ?? "Échec");
      return;
    }

    toast.success("Certificat émis");
    setForm({ user_id: "", course_id: "", force: false });
    loadData();

    if (json.data?.id) {
      window.open(`/admin/certificates/${json.data.id}/print`, "_blank", "noopener,noreferrer");
    }
  };

  const handleApprove = async (id: string): Promise<void> => {
    const res = await fetch(`/api/admin/certificates?id=${id}`, { method: "PATCH" });
    const json = await res.json();

    if (json.error) {
      toast.error(json.message ?? "Échec");
      return;
    }

    toast.success("Demande approuvée");
    loadData();

    if (json.data?.id) {
      window.open(`/admin/certificates/${json.data.id}/print`, "_blank", "noopener,noreferrer");
    }
  };

  const getUserName = (id: string): string => users.find((u) => u.id === id)?.name ?? "—";
  const getCourseTitle = (id: string): string => courses.find((c) => c.id === id)?.title ?? "—";

  const pending = certificates.filter((c) => c.payment_status === "pending");
  const issued = certificates.filter((c) => c.payment_status === "paid");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--brand-black)" }}>Certificats</h2>
        <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
          Validez les demandes élèves ou émettez manuellement
        </p>
      </div>

      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm text-amber-900">
            Demandes en attente ({pending.length})
          </h3>
          {pending.map((cert) => (
            <div key={cert.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white rounded p-3 border border-amber-100">
              <div className="text-sm">
                <p className="font-medium">{getUserName(cert.user_id)} — {getCourseTitle(cert.course_id)}</p>
                <p className="text-xs text-amber-800">
                  Demandé le {new Date(cert.requested_at ?? cert.created_at).toLocaleDateString("fr-FR")}
                  {cert.djomy_link_reference ? " · En attente de paiement Djomy" : " · Validation manuelle"}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => handleApprove(cert.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded text-white bg-green-700"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Approuver
              </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleIssue} className="bg-white rounded-lg border border-[#e8ddd4] p-4 space-y-3">
        <h3 className="font-medium text-sm" style={{ color: "var(--brand-brown)" }}>Émettre manuellement</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
            required
          >
            <option value="">Étudiant</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.progress_percent}%)</option>
            ))}
          </select>
          <select
            value={form.course_id}
            onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            className="px-4 py-2.5 border border-[#e8ddd4] rounded text-sm"
            required
          >
            <option value="">Cours</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--brand-gray)" }}>
          <input
            type="checkbox"
            checked={form.force}
            onChange={(e) => setForm({ ...form, force: e.target.checked })}
          />
          Forcer l&apos;émission (sans vérifier cours/quiz)
        </label>
        <button
          type="submit"
          className="px-5 py-2.5 text-white text-sm font-semibold rounded flex items-center gap-2"
          style={{ backgroundColor: "var(--brand-brown)" }}
        >
          <Award className="w-4 h-4" /> Émettre
        </button>
      </form>

      <div className="bg-white rounded-lg border border-[#e8ddd4] overflow-hidden">
        {issued.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: "var(--brand-gray)" }}>Aucun certificat délivré</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-[var(--brand-bg)]">
              <tr className="text-left" style={{ color: "var(--brand-gray)" }}>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Étudiant</th>
                <th className="px-4 py-3 font-medium">Cours</th>
                <th className="px-4 py-3 font-medium">Émis le</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issued.map((cert) => (
                <tr key={cert.id} className="border-t border-[#f0e8df]">
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--brand-brown)" }}>{cert.unique_code}</td>
                  <td className="px-4 py-3">{getUserName(cert.user_id)}</td>
                  <td className="px-4 py-3">{getCourseTitle(cert.course_id)}</td>
                  <td className="px-4 py-3 text-xs">
                    {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Link
                        href={`/admin/certificates/${cert.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium underline"
                        style={{ color: "var(--brand-brown)" }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Voir / PDF
                      </Link>
                      <Link
                        href={`/admin/certificates/${cert.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs underline"
                        style={{ color: "var(--brand-gray-dark)" }}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimer
                      </Link>
                      <a
                        href={`/verification/cert/${cert.verification_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs underline"
                        style={{ color: "var(--brand-gray)" }}
                      >
                        Vérifier
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
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

export default AdminCertificatesPage;
