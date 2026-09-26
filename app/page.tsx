import Link from "next/link";

export default function CourseEntry() {
  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-6">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold">Introductory Statistics</h1>
        <p className="text-gray-600 mt-2">Welcome to your university learning coach, Nervon.</p>
      </header>

      <main className="flex flex-col gap-4">
        <section>
          <h2 className="text-xl font-semibold mb-2">Course Modules</h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>Correlation versus causation</li>
            <li>Sampling bias</li>
            <li>Mean versus median</li>
          </ul>
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
