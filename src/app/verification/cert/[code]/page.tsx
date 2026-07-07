import CertVerifyPage from "@/components/nko/CertVerifyPage";

interface VerifyPageProps {
  params: Promise<{ code: string }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { code } = await params;
  return <CertVerifyPage code={code} />;
}
