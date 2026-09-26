import EducatorSummary from "@/components/EducatorSummary";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getPublicCourse } from "@/lib/course";

export default function EducatorPage() {
  const course = getPublicCourse("classical-genetics");

  return (
    <div className="min-h-screen bg-slate-50/30">
      <div className="max-w-6xl mx-auto p-6 md:p-10 flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-700" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Educator Dashboard</h1>
              <p className="text-sm font-medium text-slate-500">Course: {course.title}</p>
            </div>
          </div>
          <Link href="/" className={buttonVariants({ variant: "ghost", className: "text-slate-600 hover:text-slate-900" })}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Link>
        </header>

        <main className="w-full">
          <EducatorSummary course={course} />
        </main>
      </div>
    </div>
  );
}
