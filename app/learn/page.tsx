import AppShell from "@/components/AppShell";
import LearnerFlow from "@/components/LearnerFlow";
import { getPublicCourse } from "@/lib/course";
export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ concept?: string }>;
}) {
  const course = getPublicCourse("classical-genetics");
  const { concept } = await searchParams;
  return (
    <AppShell active="learn">
      <div className="mb-8">
        <p className="eyebrow mb-2">CLASSICAL GENETICS / PRACTICE</p>
        <h1 className="text-3xl font-semibold">Make your reasoning visible.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          A short explanation is the starting point. We’ll work through the next
          step together.
        </p>
      </div>
      <LearnerFlow
        course={course}
        initialConcept={
          course.concepts.some((c) => c.id === concept) ? concept : undefined
        }
      />
    </AppShell>
  );
}
