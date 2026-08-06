import type { Metadata } from "next";
import PrivacyPolicyPage from "@/components/nko/PrivacyPolicyPage";
import { BRAND } from "@/constants/brand";

export const metadata: Metadata = {
  title: `Privacy Policy · ${BRAND.name}`,
  description: `Privacy policy for ${BRAND.name} web platform and Gandal Fifow mobile app.`,
};

/** Alias anglais / stores — même contenu que /politique-de-confidentialite */
export default function PrivacyPolicyRoutePage() {
  return <PrivacyPolicyPage />;
}
