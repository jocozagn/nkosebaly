import type { Metadata } from "next";
import PrivacyPolicyPage from "@/components/nko/PrivacyPolicyPage";
import { BRAND } from "@/constants/brand";

export const metadata: Metadata = {
  title: `Politique de confidentialité · ${BRAND.nameNko}`,
  description: `Politique de confidentialité de ${BRAND.name} et de l'application mobile Adlam (Gandal Fifow).`,
};

/** URL publique recommandée pour Play Store et site NKO. */
export default function PolitiqueConfidentialitePage() {
  return <PrivacyPolicyPage />;
}
