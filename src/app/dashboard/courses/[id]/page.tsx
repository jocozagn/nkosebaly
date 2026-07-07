import NkoCourseDetailPage from "@/components/nko/NkoCourseDetailPage";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { id } = await params;
  return <NkoCourseDetailPage courseId={id} />;
}
