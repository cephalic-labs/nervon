import { getPublicCourse } from "@/lib/course";
import LearnerFlow from "@/components/LearnerFlow";
import Link from "next/link";

export default function LearnPage() {
  const course = getPublicCourse("classical-genetics");

  return (
    <div className="max-w-5xl mx-auto p-8 flex flex-col gap-6">
      <header className="flex justify-between items-center border-b pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Nervon Coach</h1>
          <p className="text-sm text-gray-500">Course: {course.title}</p>
        </div>
        <Link href="/" className="text-blue-600 hover:underline">Back to Course</Link>
      </header>

      <main className="mt-4">
        <LearnerFlow course={course} />
      </main>
    </div>
  );
}
