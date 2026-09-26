"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, FlaskConical, Activity } from "lucide-react";
import type { PublicCourse } from "@/lib/contracts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currentSession, useSession, writeSession } from "@/lib/use-session";
import { humanLabel, statusLabels, summarize } from "@/lib/session";
import cohort from "@/data/synthetic-cohort.json";

export default function EducatorSummary({ course }: { course: PublicCourse }) {
  const { session, storageAvailable } = useSession();
  const [confirmReset, setConfirmReset] = useState(false);
  const attempts = session?.attempts ?? [];
  const counts = summarize(attempts);
  return (
    <div className="space-y-10">
      <section aria-labelledby="live-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            <h2 id="live-heading" className="text-xl font-semibold">
              This browser session
            </h2>
            <Badge variant="secondary">Live AI results</Badge>
          </div>
          {attempts.length > 0 && (
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <RotateCcw />
              Reset session
            </Button>
          )}
        </div>
        <p className="mb-5 text-sm leading-6 text-muted-foreground">
          Synthetic demo inputs, analysed live. Saved in this browser only;
          updates from other tabs appear here. No learner identities or cohort
          tracking.
        </p>
        {!storageAvailable && (
          <p role="status" className="mb-4 text-sm text-destructive">
            Browser storage is unavailable. Results will not survive a reload.
          </p>
        )}
        {confirmReset && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-5"
          >
            <p className="text-sm font-semibold">
              Clear this browser’s saved attempts?
            </p>
            <p className="mt-1 text-sm">
              This removes feedback and checks from this session. The synthetic
              cohort stays available.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  const next = {
                    ...currentSession(),
                    id: crypto.randomUUID(),
                    attempts: [],
                  };
                  writeSession(next);
                  setConfirmReset(false);
                }}
              >
                Clear saved session
              </Button>
              <Button variant="outline" onClick={() => setConfirmReset(false)}>
                Keep session
              </Button>
            </div>
          </div>
        )}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [counts.attempts, "Explained attempts"],
            [counts.verified, "Understanding checked"],
            [counts.needsPractice, "Need more practice"],
            [counts.educatorReview, "For educator review"],
          ].map(([n, label]) => (
            <div key={label} className="rounded-xl border bg-white p-5">
              <p className="text-3xl font-semibold tabular-nums">{n}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
        {attempts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-white p-8">
            <h3 className="text-lg font-semibold">
              Start with one explanation.
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              After a learner submits an answer, their possible reasoning
              pattern and follow-up result will appear here.
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
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white">
            <div className="flex flex-wrap justify-between gap-2 border-b px-5 py-4">
              <h3 className="text-sm font-semibold">Attempt history</h3>
              <p className="text-xs text-muted-foreground">
                Newest first · {counts.pending} awaiting a check · latest 50
                retained
              </p>
            </div>
            <ol className="divide-y">
              {[...attempts].reverse().map((a) => {
                const concept = course.concepts.find(
                  (c) => c.id === a.analysis.conceptId,
                );
                const status = a.analysis.diagnosis.reviewRequired
                  ? "educatorReview"
                  : (a.verification?.status ?? "pending");
                return (
                  <li
                    key={a.analysis.attemptId}
                    className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div>
                      <h4 className="text-sm font-semibold">
                        {concept?.title ?? "Previous course concept"}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(a.updatedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm">
                        {humanLabel(a.analysis.diagnosis.label)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.analysis.diagnosis.decisionProvider ===
                        "generative-baseline"
                          ? "Generative fallback"
                          : "Jev decision"}{" "}
                        · hypothesis
                      </p>
                      {a.verification && (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {a.verification.reason}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="h-fit w-fit">
                      {statusLabels[status]}
                    </Badge>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>
      <section aria-labelledby="cohort-heading" className="border-t pt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FlaskConical className="size-5 text-primary" />
          <h2 id="cohort-heading" className="text-xl font-semibold">
            An illustrative cohort
          </h2>
          <Badge variant="outline">Fixed synthetic data</Badge>
        </div>
        <p className="mb-6 max-w-3xl text-sm leading-6 text-muted-foreground">
          {cohort.disclosure} Each learner has one illustrated attempt per
          concept. Your browser session is never added to these counts.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {cohort.concepts.map((row) => (
            <Card key={row.conceptId} className="shadow-none">
              <CardHeader>
                <CardDescription>
                  {row.attempts} synthetic attempts
                </CardDescription>
                <CardTitle className="text-base leading-6">
                  {course.concepts.find((c) => c.id === row.conceptId)?.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="mb-4 flex h-2 overflow-hidden rounded-full"
                  aria-hidden="true"
                >
                  <span
                    className="bg-primary"
                    style={{ width: `${(row.verified / row.attempts) * 100}%` }}
                  />
                  <span
                    className="bg-amber-500"
                    style={{
                      width: `${(row.needsPractice / row.attempts) * 100}%`,
                    }}
                  />
                  <span
                    className="bg-slate-300"
                    style={{
                      width: `${(row.educatorReview / row.attempts) * 100}%`,
                    }}
                  />
                </div>
                <dl className="space-y-2 text-xs">
                  {[
                    [row.verified, "Understanding checked"],
                    [row.needsPractice, "Need more practice"],
                    [row.educatorReview, "For educator review"],
                  ].map(([n, label]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">{n}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 border-t pt-4">
                  <p className="eyebrow mb-2">ILLUSTRATIVE REASONING GAP</p>
                  <p className="text-sm leading-6">{row.pattern}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.count} of {row.attempts} authored examples
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-5 text-xs leading-6 text-muted-foreground">
          Use these patterns to plan a discussion, not to grade students. A
          future pilot needs consented examples, faculty labels, unseen
          questions and delayed recall checks.
        </p>
      </section>
    </div>
  );
}
