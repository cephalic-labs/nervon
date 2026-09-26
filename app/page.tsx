import Link from "next/link";
import { getPublicCourse } from "@/lib/course";

export default function CourseEntry() {
  const course = getPublicCourse("classical-genetics");

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-6">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <p className="text-gray-600 mt-2">Welcome to your university learning coach, Nervon.</p>
        <p className="text-sm mt-2 font-medium text-amber-700 bg-amber-50 p-2 inline-block rounded">
          {course.reviewStatus === "pending-educator-review" ? "Pending Educator Review (Synthetic UI fixture — not live AI)" : ""}
        </p>
      </header>

      <main className="flex flex-col gap-4">
        <section>
          <h2 className="text-xl font-semibold mb-2">Course Concepts</h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            {course.concepts.map((concept) => (
              <li key={concept.id}>{concept.title}</li>
            ))}
          </ul>
        </section>

        <section className="text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
          <p><strong>Disclosure:</strong> {course.disclosure}</p>
        </section>

        <div className="flex gap-4 mt-4">
          <Link href="/learn" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            Start Learning
          </Link>
          <Link href="/educator" className="bg-gray-100 text-gray-800 px-6 py-2 rounded-md border hover:bg-gray-200">
            Educator View
          </Link>
        </div>
      </main>
    </div>
  );
}
