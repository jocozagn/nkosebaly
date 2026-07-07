import CourseQuizPage from "@/components/nko/CourseQuizPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  return <CourseQuizPage courseId={id} />;
};

export default Page;
