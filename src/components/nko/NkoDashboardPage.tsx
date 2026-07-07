"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, LogOut, CreditCard, TrendingUp, Award } from "lucide-react";
import NkoShell from "./NkoShell";
import BrandLoader from "@/components/ui/BrandLoader";
import ProgressBar from "@/components/nko/ProgressBar";
import { BRAND } from "@/constants/brand";
import type { AdminCourse } from "@/lib/admin/types";

interface CourseProgress {
  course_id: string;
  percent: number;
}

/** Tableau de bord après connexion QR */
const NkoDashboardPage = () => {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [progressByCourse, setProgressByCourse] = useState<Record<string, number>>({});
  const [globalPercent, setGlobalPercent] = useState(0);
  const [licenseLabel, setLicenseLabel] = useState("—");
  const [certLabel, setCertLabel] = useState("Aucun");
  const [eligibleCertCount, setEligibleCertCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/license/status").then((r) => r.json()),
      fetch("/api/courses/public").then((r) => r.json()),
      fetch("/api/progress").then((r) => r.json()),
      fetch("/api/certificates/my").then((r) => r.json()),
    ])
      .then(([licenseRes, coursesRes, progressRes, certRes]) => {
        if (!licenseRes.error && licenseRes.data?.active) {
          const exp = licenseRes.data.expires_at
            ? new Date(licenseRes.data.expires_at).toLocaleDateString("fr-FR")
            : "—";
          setLicenseLabel(`${licenseRes.data.duration_months} mois · expire le ${exp}`);
        }

        if (!coursesRes.error) setCourses(coursesRes.data ?? []);
        else if (coursesRes.code === "LICENSE_REQUIRED") {
          window.location.href = "/dashboard/activate-license";
        }

        if (!progressRes.error && progressRes.data) {
          setGlobalPercent(progressRes.data.global_percent ?? 0);
          const map: Record<string, number> = {};
          for (const entry of (progressRes.data.courses ?? []) as CourseProgress[]) {
            map[entry.course_id] = entry.percent;
          }
          setProgressByCourse(map);
        }

        if (!certRes.error && certRes.data) {
          const issued = certRes.data.issued_count ?? 0;
          const eligible = (certRes.data.eligibility ?? []).filter(
            (e: { eligible: boolean; status: string }) => e.eligible && e.status === "none"
          ).length;
          setCertLabel(issued > 0 ? `${issued} délivré${issued > 1 ? "s" : ""}` : eligible > 0 ? `${eligible} à demander` : "Aucun");
          setEligibleCertCount(eligible);
        }

        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const stats = [
    { label: "Cours disponibles", value: String(courses.length), icon: BookOpen, bg: "var(--brand-brown)" },
    { label: "Progression globale", value: `${globalPercent}%`, icon: TrendingUp, bg: "var(--brand-sky)" },
    { label: "Certificats", value: certLabel, icon: Award, bg: "var(--brand-gold)", small: true, darkIcon: true },
    { label: "Licence active", value: licenseLabel, icon: CreditCard, bg: "var(--brand-brown)", small: true },
  ];

  return (
    <NkoShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "var(--brand-brown)" }}>
            Bienvenue sur {BRAND.name}
          </h1>
          <p className="text-sm md:text-base" style={{ color: "var(--brand-gray)" }}>
            Suivez votre progression et accédez à vos cours
          </p>
          <div className="h-1 w-16 mt-4 bg-[var(--brand-gold)]" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-[#e8ddd4] shadow-sm p-5 flex items-center gap-4"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: stat.bg }}
              >
                <stat.icon className={`w-6 h-6 ${stat.darkIcon ? "text-[var(--brand-black)]" : "text-white"}`} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--brand-gray)" }}>{stat.label}</p>
                <p className={`font-bold ${stat.small ? "text-sm" : "text-xl"}`} style={{ color: "var(--brand-black)" }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {!isLoading && eligibleCertCount > 0 && (
          <div className="mb-8">
            <Link
              href="/dashboard/certificates"
              className="block p-4 rounded-lg border-2 border-[var(--brand-gold)] text-center hover:shadow-sm transition-shadow"
              style={{ backgroundColor: "#fffdf5" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--brand-brown)" }}>
                🎓 {eligibleCertCount} certificat{eligibleCertCount > 1 ? "s" : ""} prêt{eligibleCertCount > 1 ? "s" : ""} à demander
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--brand-gray)" }}>
                Vous avez terminé des cours et validé les quiz — cliquez pour demander
              </p>
            </Link>
          </div>
        )}

        {!isLoading && courses.length > 0 && (
          <div className="bg-white rounded-lg border border-[#e8ddd4] shadow-sm p-5 mb-8">
            <ProgressBar percent={globalPercent} label="Votre avancement sur tous les cours" />
          </div>
        )}

        <div className="bg-white rounded-lg border border-[#e8ddd4] shadow-sm p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--brand-brown)" }}>Mes cours</h2>
          <p className="text-sm mb-6" style={{ color: "var(--brand-gray)" }}>
            Accédez à vos cours avec votre licence active.
          </p>

          {isLoading ? (
            <BrandLoader variant="inline" message="Chargement de vos cours..." />
          ) : courses.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg"
              style={{ borderColor: "#d4c4b5", backgroundColor: "var(--brand-bg)" }}
            >
              <BookOpen className="w-10 h-10 mb-3" style={{ color: "var(--brand-tan)" }} />
              <p className="text-sm text-center max-w-xs" style={{ color: "var(--brand-gray)" }}>
                Aucun cours publié pour le moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/dashboard/courses/${course.id}`}
                  className="p-4 rounded-lg border border-[#e8ddd4] block hover:shadow-sm transition-shadow"
                  style={{ backgroundColor: "var(--brand-bg)" }}
                >
                  <h3 className="font-semibold mb-1" style={{ color: "var(--brand-brown)" }}>{course.title}</h3>
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: "var(--brand-gray)" }}>{course.short_description}</p>
                  <ProgressBar
                    percent={progressByCourse[course.id] ?? 0}
                    size="sm"
                    label={`${progressByCourse[course.id] ?? 0}% complété`}
                  />
                  <div className="flex items-center gap-2 text-xs mt-2" style={{ color: "var(--brand-gray-dark)" }}>
                    <span className="capitalize">{course.level}</span>
                    <span>·</span>
                    <span>{course.lessons_count} leçon{course.lessons_count > 1 ? "s" : ""}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href="/logout"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-white border border-transparent hover:border-[#e8ddd4] rounded transition-colors"
            style={{ color: "var(--brand-gray)" }}
            aria-label="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </Link>
        </div>
      </div>
    </NkoShell>
  );
};

export default NkoDashboardPage;
