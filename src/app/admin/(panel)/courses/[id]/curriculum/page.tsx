import AdminCurriculumPage from "@/components/admin/AdminCurriculumPage";

interface CurriculumPageProps {
  params: Promise<{ id: string }>;
}

export default async function CurriculumPage({ params }: CurriculumPageProps) {
  const { id } = await params;
  return <AdminCurriculumPage courseId={id} />;
}
