import BrandLoader from "@/components/ui/BrandLoader";

/** Loader global Next.js — affiché pendant le chargement des routes */
export default function Loading() {
  return <BrandLoader message="Chargement..." />;
}
