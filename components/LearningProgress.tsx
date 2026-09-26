"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currentSession, useSession, writeSession } from "@/lib/use-session";
import { coachStatusLabels } from "@/lib/client-coach";
import { statusLabels } from "@/lib/session";
import type { PublicCourse } from "@/lib/contracts";
export default function LearningProgress({ course }: { course: PublicCourse }) {
  const { session, storageAvailable } = useSession();
  const [reset, setReset] = useState(false);
  const entries = session?.coaching ?? [];
  const counts = {
    sessions: entries.length,
    verified: entries.filter(
      (e) => e.response.state.result?.status === "verified",
    ).length,
    active: entries.filter((e) => e.response.state.phase !== "complete").length,
    practice: entries.filter(
      (e) =>
        e.response.state.phase === "complete" &&
        e.response.state.result?.status !== "verified",
    ).length,
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="secondary">Your browser · synthetic demo</Badge>
        {(entries.length > 0 || !!session?.attempts.length) && (
          <Button variant="outline" onClick={() => setReset(true)}>
            <RotateCcw />
            Reset session
          </Button>
        )}
      </div>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Your explanations, diagnostic follow-ups and checks stay together.
        Resume a conversation or choose another concept. This is personal
        practice history, not a score or a cohort ranking.
      </p>
      {!storageAvailable && (
        <p role="status" className="text-sm text-destructive">
          Browser storage is unavailable. Progress will be lost on reload.
        </p>
      )}
      {reset && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-5"
        >
          <p className="font-semibold">Clear your saved conversations?</p>
          <p className="mt-2 text-sm">
            This removes explanations, feedback and checks from this browser.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                writeSession({
                  ...currentSession(),
                  id: crypto.randomUUID(),
                  attempts: [],
                  coaching: [],
                });
                setReset(false);
              }}
            >
              Clear saved session
            </Button>
            <Button variant="outline" onClick={() => setReset(false)}>
              Keep session
            </Button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [counts.sessions, "Practice conversations"],
          [counts.verified, "Understanding checked"],
          [counts.active, "In progress"],
          [counts.practice, "Keep practising"],
        ].map(([n, label]) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <p className="text-3xl font-semibold tabular-nums">{n}</p>
            <p className="mt-2 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {!entries.length ? (
        <section className="rounded-xl border border-dashed bg-white p-7">
          <h2 className="text-xl font-semibold">Start with one explanation.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Nervon will ask focused questions when needed, teach from the
            genetics knowledge base and help you check the idea.
          </p>
          <Link
            href="/learn"
            className={buttonVariants({
              variant: "outline",
              className: "mt-5",
            })}
          >
            Open practice
            <ArrowRight />
          </Link>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-wrap justify-between gap-2 border-b p-5">
            <h2 className="text-base font-semibold">Your learning history</h2>
            <p className="text-xs text-muted-foreground">
              Latest 20 conversations · newest first
            </p>
          </div>
          <ol className="divide-y">
            {[...entries].reverse().map(({ response, updatedAt }) => {
              const state = response.state;
              const concept = course.concepts.find((c) =>
                c.questions.some((q) => q.id === state.questionId),
              );
              return (
                <li key={state.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">
                        {concept?.title ?? "Previous course concept"}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(updatedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {state.turns.length} explained responses
                      </p>
                    </div>
                    <Badge variant="outline">
                      {state.phase === "complete"
                        ? coachStatusLabels[state.result!.status]
                        : coachStatusLabels[state.phase]}
                    </Badge>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {state.result?.reason ?? response.message}
                  </p>
                  <details className="mt-4">
                    <summary className="cursor-pointer py-2 text-xs font-semibold text-primary">
                      Read the conversation
                    </summary>
                    <ol className="mt-2 space-y-4">
                      {state.turns.map((turn, i) => (
                        <li
                          key={i}
                          className="border-l-2 pl-4 text-sm leading-6"
                        >
                          <p className="text-muted-foreground">{turn.prompt}</p>
                          <p className="mt-1 font-medium">{turn.answer}</p>
                          <p>{turn.explanation}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                  <Link
                    href={`/learn?concept=${concept?.id ?? ""}&conversation=${encodeURIComponent(state.id)}`}
                    className={buttonVariants({
                      variant: "outline",
                      className: "mt-3",
                    })}
                  >
                    {state.phase === "complete"
                      ? "Revisit this concept"
                      : "Continue coaching"}
                    <ArrowRight />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {!!session?.attempts.length && (
        <details className="rounded-xl border bg-white p-5">
          <summary className="cursor-pointer py-2 text-sm font-semibold">
            Earlier practice ({session.attempts.length})
          </summary>
          <p className="my-3 text-xs text-muted-foreground">
            Saved before conversational coaching. Start a new conversation to
            continue learning.
          </p>
          <ul className="space-y-3">
            {session.attempts.map((a) => (
              <li key={a.analysis.attemptId} className="text-sm">
                {
                  course.concepts.find((c) => c.id === a.analysis.conceptId)
                    ?.title
                }{" "}
                —{" "}
                {a.analysis.diagnosis.reviewRequired
                  ? "Keep exploring"
                  : statusLabels[a.verification?.status ?? "pending"]}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs leading-6 text-muted-foreground">
        Checks describe immediate responses. They do not establish mastery or
        lasting recall. AI can be wrong; uncertainty stays visible while Nervon
        continues to support practice.
      </p>
    </div>
  );
}
