import Link from "next/link";
import { getPublicCourse } from "@/lib/course";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, ArrowRight, Activity, BookOpen } from "lucide-react";

export default function CourseEntry() {
  const course = getPublicCourse("classical-genetics");

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-5xl mx-auto p-8 flex flex-col gap-10 py-12">
        <header className="flex flex-col gap-6 items-center text-center max-w-3xl mx-auto">
          <div className="p-3 bg-primary/10 rounded-full">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              {course.title}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl">
              Welcome to Nervon, your personal university learning coach. We don&apos;t just grade your answers—we understand your reasoning and help you bridge the gaps.
            </p>
          </div>
          {course.reviewStatus === "pending-educator-review" && (
            <div className="bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-sm font-medium border border-amber-200">
              Pending Educator Review (Synthetic UI fixture — not live AI)
            </div>
          )}
        </header>

        <main className="flex flex-col gap-12">
          <section className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-md border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Course Concepts
                </CardTitle>
                <CardDescription>The core modules you will master.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {course.concepts.map((concept) => (
                    <li key={concept.id} className="flex flex-col">
                      <span className="font-semibold text-slate-800">{concept.title}</span>
                      <span className="text-sm text-slate-500 line-clamp-1">{concept.learningObjective}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-md border-slate-200/60 bg-white/50 backdrop-blur-sm flex flex-col justify-center">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Get Started
                </CardTitle>
                <CardDescription>Begin your learning journey or view cohort data.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Link href="/learn" className={buttonVariants({ size: "lg", className: "flex-1 shadow-sm group" })}>
                  Start Learning
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/educator" className={buttonVariants({ variant: "outline", size: "lg", className: "flex-1" })}>
                  Educator View
                </Link>
              </CardContent>
            </Card>
          </section>

          <section className="text-sm text-slate-500 bg-slate-100/50 p-6 rounded-xl border border-slate-200/50 text-center max-w-3xl mx-auto">
            <p><strong>Disclosure:</strong> {course.disclosure}</p>
          </section>
        </main>
      </div>
    </div>
  );
}
