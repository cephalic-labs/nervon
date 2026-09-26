import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  MessageSquareText,
  ScanLine,
  Sprout,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicCourse } from "@/lib/course";

export default function CourseEntry() {
  const course = getPublicCourse("classical-genetics");
  return (
    <AppShell active="course">
      <div className="grid gap-10 pb-12 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
        <section className="py-4">
          <p className="eyebrow mb-5">BIOLOGY / CLASSICAL GENETICS</p>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight text-balance sm:text-5xl">
            Go beyond the answer.
            <br />
            <span className="text-primary">Understand the why.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
            Work through a genetics question, explain your thinking, and get a
            focused next step. Then try a new question to check what clicked.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/learn" className={buttonVariants({ size: "lg" })}>
              Start practising <ArrowRight />
            </Link>
            <Link
              href="/progress"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              View learning progress
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            3 concepts · 6 questions · Course-grounded feedback
          </p>
        </section>
        <section
          className="rounded-2xl border border-primary/15 bg-[#eaf1ed] p-6 sm:p-8"
          aria-label="How a practice session works"
        >
          <div className="mb-8 flex items-center justify-between">
            <span className="eyebrow">A SMALL LOOP. A CLEARER IDEA.</span>
            <Sprout className="size-6 text-primary" />
          </div>
          <ol className="space-y-6">
            {[
              [
                MessageSquareText,
                "01",
                "Explain your thinking",
                "Your reasoning matters as much as your answer.",
              ],
              [
                ScanLine,
                "02",
                "Find a possible gap",
                "Live AI checks your explanation against a course rubric.",
              ],
              [
                BookOpen,
                "03",
                "Learn, then try again",
                "Use source-grounded feedback on a different question.",
              ],
            ].map(([Icon, n, title, description]) => {
              const Symbol = Icon as typeof BookOpen;
              return (
                <li key={String(n)} className="flex gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-white text-primary">
                    <Symbol className="size-5" />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-semibold">
                      <span className="mr-2 text-primary">{String(n)}</span>
                      {String(title)}
                    </p>
                    <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                      {String(description)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-8 border-t border-primary/15 pt-4 text-xs leading-5 text-muted-foreground">
            Not enough evidence? Nervon asks a focused question, then guides you
            through the fundamentals.
          </p>
        </section>
      </div>
      <section className="border-t pt-9">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">YOUR COURSE MAP</p>
            <h2 className="text-2xl font-semibold">
              Three foundations of inheritance
            </h2>
          </div>
          <Badge variant="outline">OpenStax Biology 2e</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {course.concepts.map((c, i) => (
            <Link
              href={`/learn?concept=${c.id}`}
              key={c.id}
              className="group rounded-xl border bg-card p-6 transition-colors hover:border-primary/50"
            >
              <div className="mb-5 flex justify-between text-primary">
                <span className="font-mono text-sm">0{i + 1}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
              <h3 className="mb-3 text-lg font-semibold">{c.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {c.learningObjective}
              </p>
              <p className="mt-6 text-xs font-medium text-primary">
                2 questions · Explain & check
              </p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
