import AppShell from "@/components/AppShell";
import LearningProgress from "@/components/LearningProgress";
import { getPublicCourse } from "@/lib/course";
export default function ProgressPage() {
  return (
    <AppShell active="progress">
      <div className="mb-8">
        <p className="eyebrow mb-2">CLASSICAL GENETICS / YOUR PROGRESS</p>
        <h1 className="text-3xl font-semibold">
          See how your reasoning develops.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Small questions, clearer explanations and a practical next step.
        </p>
      </div>
      <LearningProgress course={getPublicCourse("classical-genetics")} />
    </AppShell>
  );
}
