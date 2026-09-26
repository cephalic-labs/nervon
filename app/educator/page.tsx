import AppShell from "@/components/AppShell";
import EducatorSummary from "@/components/EducatorSummary";
import { getPublicCourse } from "@/lib/course";
export default function EducatorPage() {
  return (
    <AppShell active="educator">
      <div className="mb-8">
        <p className="eyebrow mb-2">CLASSICAL GENETICS / EDUCATOR</p>
        <h1 className="text-3xl font-semibold">
          See where the thinking gets stuck.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Follow the current browser session, then explore an authored cohort
          illustration. Every diagnosis is a hypothesis for an educator to
          review.
        </p>
      </div>
      <EducatorSummary course={getPublicCourse("classical-genetics")} />
    </AppShell>
  );
}
