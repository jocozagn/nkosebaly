"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import { StudentProfileFields, defaultProfile, type StudentProfileFormData } from "./StudentProfileFields";
import { triggerNavigationStart } from "@/utils/navigation";

/** Compléter le profil après activation (cas mobile ou test) */
const CompleteProfilePage = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfileFormData>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((res) => {
        if (!res.error && res.data) {
          setProfile({
            name: res.data.name ?? "",
            phone: res.data.phone ?? "",
            email: res.data.email ?? "",
            city: res.data.city ?? "",
            occupation: res.data.occupation ?? "",
          });
          if (res.data.profile_completed) {
            triggerNavigationStart();
            router.replace("/dashboard");
          }
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [router]);

  const handleChange = (field: keyof StudentProfileFormData, value: string): void => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSaving(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const result = await res.json();
    setIsSaving(false);

    if (result.error) {
      toast.error(result.message ?? "Enregistrement impossible");
      return;
    }

    toast.success("Profil enregistré !");
    triggerNavigationStart();
    router.replace("/dashboard");
  };

  if (isLoading) {
    return (
      <NkoShell>
        <BrandLoader variant="inline" message="Chargement..." />
      </NkoShell>
    );
  }

  return (
    <NkoShell>
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white rounded-lg border border-[#e8ddd4] p-6 md:p-8 shadow-sm">
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--brand-brown)" }}>
            Complétez votre profil
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--brand-gray)" }}>
            Quelques informations pour personnaliser votre parcours d&apos;apprentissage.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <StudentProfileFields values={profile} onChange={handleChange} disabled={isSaving} />

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white text-sm font-semibold rounded disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-brown)" }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Continuer vers mes cours"
              )}
            </button>
          </form>
        </div>
      </div>
    </NkoShell>
  );
};

export default CompleteProfilePage;
