import CertificateViewPage from "@/components/nko/CertificateViewPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  return <CertificateViewPage certificateId={id} />;
};

export default Page;
