import AdminCourseForm from "@/components/admin/AdminCourseForm";

interface EditCoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { id } = await params;
  return <AdminCourseForm courseId={id} />;
}
