import EducatorSummary from "@/components/EducatorSummary";
import Link from "next/link";

export default function EducatorPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-6">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Educator Dashboard</h1>
        <Link href="/" className="text-blue-600 hover:underline">Back to Course</Link>
      </header>

      <main className="mt-4">
        <EducatorSummary />
      </main>
    </div>
  );
}
