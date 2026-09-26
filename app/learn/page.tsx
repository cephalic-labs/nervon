import AttemptForm from "@/components/AttemptForm";
import FeedbackPanel from "@/components/FeedbackPanel";
import Link from "next/link";

export default function LearnPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col gap-6">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold">Module: Correlation vs Causation</h1>
        <Link href="/" className="text-blue-600 hover:underline">Back to Course</Link>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        <div className="flex flex-col gap-6">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <h2 className="font-semibold mb-2">Question 1</h2>
            <p className="text-sm">
              An ice cream shop finds that as their ice cream sales increase, the number of shark attacks at the local beach also increases. 
              Can we conclude that eating ice cream causes shark attacks? Why or why not?
            </p>
          </div>
          
          <AttemptForm />
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="font-semibold text-lg text-gray-700">Nervon Coach</h2>
          <FeedbackPanel />
        </div>
      </main>
    </div>
  );
}
