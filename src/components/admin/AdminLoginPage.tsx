"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/constants/brand";

/** Page de connexion admin — email + mot de passe */
const AdminLoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    setIsLoading(false);

    if (result.error) {
      setError(result.message ?? "Erreur de connexion");
      return;
    }

    router.replace("/admin/dashboard");
  };

  const handleQuickLogin = (): void => {
    setEmail("admin@balandou.local");
    setPassword("admin123");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 font-[family-name:var(--font-dm-sans)]"
      style={{ backgroundColor: "var(--brand-bg)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image
            src={BRAND.logo}
            alt={BRAND.name}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover ring-4 ring-[var(--brand-gold)]"
            priority
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[#e8ddd4] p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold mb-1" style={{ color: "var(--brand-brown)" }}>
              Connexion administrateur
            </h1>
            <p className="text-sm" style={{ color: "var(--brand-gray)" }}>
              Accédez au panneau de gestion
            </p>
          </div>

          <div className="h-1 w-16 mx-auto mb-6 bg-[var(--brand-gold)]" aria-hidden="true" />

          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: "var(--brand-gray-dark)" }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-brown)]"
                placeholder="admin@balandou.local"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: "var(--brand-gray-dark)" }}>
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border border-[#e8ddd4] rounded focus:outline-none focus:ring-2 focus:ring-[var(--brand-brown)]"
              />
            </div>

            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--brand-gray-dark)" }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-gray-300"
              />
              Se souvenir de moi
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 text-white font-semibold rounded transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Connexion"}
            </button>
          </form>

          {process.env.NODE_ENV === "development" && (
            <button
              type="button"
              onClick={handleQuickLogin}
              className="mt-4 w-full text-center text-xs underline"
              style={{ color: "var(--brand-sky-dark)" }}
            >
              Connexion rapide (test) : admin@balandou.local / admin123
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--brand-gray)" }}>
          © {new Date().getFullYear()} {BRAND.name}
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
