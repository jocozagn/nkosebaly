import type { AdminSettings, LicensePlan } from "@/lib/admin/types";

/** Formules licence en ligne par défaut (modifiables dans l'admin) */
export const DEFAULT_LICENSE_PLANS: LicensePlan[] = [
  { id: "plan-1m", duration_months: 1, price_gnf: 50_000, active: true },
  { id: "plan-2m", duration_months: 2, price_gnf: 90_000, active: true },
  { id: "plan-3m", duration_months: 3, price_gnf: 150_000, active: true },
  { id: "plan-6m", duration_months: 6, price_gnf: 250_000, active: true },
  { id: "plan-12m", duration_months: 12, price_gnf: 450_000, active: true },
];

export interface PublicLicensePlan {
  id: string;
  duration_months: number;
  price_gnf: number;
  label: string;
}

/** Libellé affiché pour une durée (ex. « 3 mois ») */
export const formatLicensePlanLabel = (durationMonths: number): string => {
  if (durationMonths === 1) return "1 mois";
  return `${durationMonths} mois`;
};

/** Fusionne anciens champs (prix/durée unique) avec license_plans */
export const normalizeLicensePlans = (settings: AdminSettings): LicensePlan[] => {
  if (Array.isArray(settings.license_plans) && settings.license_plans.length > 0) {
    return settings.license_plans
      .map((plan) => ({
        id: plan.id || `plan-${plan.duration_months}m`,
        duration_months: Math.max(1, Math.min(24, Number(plan.duration_months) || 1)),
        price_gnf: Math.max(0, Number(plan.price_gnf) || 0),
        label: plan.label?.trim() || undefined,
        active: plan.active !== false,
      }))
      .sort((a, b) => a.duration_months - b.duration_months);
  }

  // Migration : ancien paramètre unique → une formule
  return [
    {
      id: "plan-legacy",
      duration_months: settings.license_duration_months ?? 3,
      price_gnf: settings.license_price ?? 150_000,
      active: true,
    },
  ];
};

/** Formules actives pour l'achat en ligne */
export const getActiveLicensePlans = (settings: AdminSettings): PublicLicensePlan[] =>
  normalizeLicensePlans(settings)
    .filter((plan) => plan.active && plan.price_gnf > 0)
    .map((plan) => ({
      id: plan.id,
      duration_months: plan.duration_months,
      price_gnf: plan.price_gnf,
      label: plan.label ?? formatLicensePlanLabel(plan.duration_months),
    }));

/** Trouve une formule par durée (achat Djomy) */
export const resolveLicensePlanByDuration = (
  settings: AdminSettings,
  durationMonths: number
): PublicLicensePlan | null => {
  const plans = getActiveLicensePlans(settings);
  return plans.find((plan) => plan.duration_months === durationMonths) ?? null;
};

/** Première formule active (sélection par défaut UI) */
export const getDefaultLicensePlan = (settings: AdminSettings): PublicLicensePlan | null => {
  const plans = getActiveLicensePlans(settings);
  return plans[0] ?? null;
};

/** Valide une durée pour génération de carte licence */
export const isValidLicenseDurationMonths = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= 24;

/** Affichage prix GNF sur cartes / UI (ex. 150 000) */
export const formatGnfAmount = (amount: number): string =>
  new Intl.NumberFormat("fr-GN").format(amount);

/**
 * Prix à imprimer sur une carte PVC.
 * Priorité : prix enregistré sur la carte, sinon grille par défaut selon la durée.
 */
export const resolveCardPriceGnf = (
  durationMonths: number,
  cardPriceGnf?: number
): number | null => {
  if (typeof cardPriceGnf === "number" && cardPriceGnf > 0) return cardPriceGnf;
  const plan = DEFAULT_LICENSE_PLANS.find((p) => p.duration_months === durationMonths);
  return plan?.price_gnf ?? null;
};
