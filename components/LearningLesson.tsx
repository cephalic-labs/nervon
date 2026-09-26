import type { LearningLesson as Lesson, PublicSource } from "@/lib/contracts";
import { BookOpen } from "lucide-react";
export default function LearningLesson({
  lesson,
  sources,
}: {
  lesson: Lesson;
  sources: PublicSource[];
}) {
  return (
    <section
      className="rounded-xl border border-primary/20 bg-secondary p-5 sm:p-6"
      aria-label="Guided learning plan"
    >
      <p className="eyebrow mb-3 flex items-center gap-2">
        <BookOpen className="size-4" />
        FROM THE GENETICS KNOWLEDGE BASE
      </p>
      <h2 className="text-xl font-semibold">{lesson.title}</h2>
      <p className="mt-3 text-sm font-medium leading-6">{lesson.keyIdea}</p>
      <div className="mt-4 rounded-lg bg-white/80 p-4">
        <h3 className="text-xs font-semibold">Worked example</h3>
        <p className="mt-2 text-sm leading-7">{lesson.workedExample}</p>
      </div>
      <h3 className="mt-5 text-sm font-semibold">Your next steps</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
        {lesson.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-5 border-t border-primary/15 pt-3 text-xs leading-6">
        {lesson.sourceIds.map((id) => {
          const s = sources.find((source) => source.id === id);
          return (
            s && (
              <a
                key={id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block text-primary underline"
              >
                {s.title} · {s.license}
              </a>
            )
          );
        })}
        <p className="mt-2 text-muted-foreground">
          Authored learning material. AI assessments are separate and may be
          uncertain.
        </p>
      </div>
    </section>
  );
}
