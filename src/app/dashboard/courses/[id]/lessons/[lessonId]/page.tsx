import LessonPlaybackPage from "@/components/nko/LessonPlaybackPage";

interface PageProps {
  params: Promise<{ id: string; lessonId: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const { id, lessonId } = await params;
  return <LessonPlaybackPage courseId={id} lessonId={lessonId} />;
}
