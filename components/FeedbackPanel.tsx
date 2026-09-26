import type { CoachState, PublicSource } from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Quote } from "lucide-react";
import { humanLabel } from "@/lib/session";
export default function FeedbackPanel({
  isLoading,
  response,
  sources,
}: {
  isLoading: boolean;
  response: Pick<CoachState, "diagnosis" | "feedback"> | null;
  sources: PublicSource[];
}) {
  if (isLoading)
    return (
      <section role="status" className="rounded-xl border bg-white p-6">
        <p className="mb-5 text-sm font-medium">Reading your explanation…</p>
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Live AI can take up to a minute. Your response stays here.
        </p>
      </section>
    );
  if (!response?.diagnosis)
    return (
      <aside className="rounded-xl border border-dashed p-6">
        <BookOpen className="mb-4 size-5 text-primary" />
        <h3 className="text-base font-semibold">A coach for your reasoning</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Submit your explanation to see a possible reasoning pattern, a
          source-backed next step and a new question.
        </p>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          AI suggestions can be wrong. Unclear reasoning leads to a focused
          question and guided practice.
        </p>
      </aside>
    );
  const { diagnosis, feedback } = response;
  return (
    <section
      className="rounded-xl border bg-white p-6"
      aria-label="Coach feedback"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Your reasoning, reflected</h3>
        <Badge variant="secondary">
          {diagnosis.decisionProvider === "generative-baseline"
            ? "Generative fallback"
            : diagnosis.decisionProvider === "jev"
              ? "Jev decision"
              : "Laya decision"}
        </Badge>
      </div>
      <p className="eyebrow mb-2">POSSIBLE REASONING PATTERN</p>
      <p className="text-lg font-medium">{humanLabel(diagnosis.label)}</p>
      {diagnosis.evidence && (
        <blockquote className="my-5 flex gap-3 border-l-2 border-primary/30 pl-4 text-sm leading-6 text-muted-foreground">
          <Quote className="mt-1 size-4 shrink-0" />
          <span>{diagnosis.evidence}</span>
        </blockquote>
      )}
      {feedback ? (
        <>
          <p className="text-sm leading-7">{feedback.text}</p>
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <BookOpen className="size-3.5" />
              Grounded in your course
            </p>
            {feedback.sourceIds.map((id) => {
              const source = sources.find((s) => s.id === id);
              return (
                source && (
                  <details key={id} className="mt-2 text-xs">
                    <summary className="cursor-pointer py-2 text-primary">
                      {source.title}
                    </summary>
                    <p className="mb-3 leading-6 text-muted-foreground">
                      {source.text}
                    </p>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {source.attribution}
                    </a>
                    <p className="mt-2 text-muted-foreground">
                      {source.license} · {source.id}
                    </p>
                  </details>
                )
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-semibold">Let’s clarify before moving on.</p>
          <p className="mt-1">
            There isn’t enough consistent, relevant evidence for confident
            feedback. Answer the focused question so Nervon can identify the
            step that needs attention.
          </p>
        </div>
      )}
      <p className="mt-5 text-xs text-muted-foreground">
        Live AI hypothesis · not a validated learning score
      </p>
    </section>
  );
}
