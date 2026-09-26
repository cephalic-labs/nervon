"use client";
import { useRef, useState } from "react";
import type { PublicCourse } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, AlertCircle, RotateCcw } from "lucide-react";
import { currentSession, useSession, writeSession } from "@/lib/use-session";
import { saveCoach } from "@/lib/session";
import { isCoachResponse, coachStatusLabels } from "@/lib/client-coach";
import AttemptForm from "./AttemptForm";
import FeedbackPanel from "./FeedbackPanel";
import LearningLesson from "./LearningLesson";

export default function LearnerFlow({
  course,
  initialConcept,
  initialConversation,
}: {
  course: PublicCourse;
  initialConcept?: string;
  initialConversation?: string;
}) {
  const { session, storageAvailable } = useSession();
  const [selectedId, setSelectedId] = useState(initialConcept ?? "");
  const [requestedId, setRequestedId] = useState(initialConversation);
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null),
    inFlight = useRef(false);
  const concept = course.concepts.find((c) => c.id === selectedId);
  const initialQuestion = concept?.questions[0];
  const response = !fresh
    ? session?.coaching?.findLast(
        (c) =>
          c.response.state.questionId === initialQuestion?.id &&
          (!requestedId || c.response.state.id === requestedId),
      )?.response
    : undefined;
  const state = response?.state;
  const question = state?.pending ?? initialQuestion;
  const complete = state?.phase === "complete";
  const phase = state?.phase;
  function restart() {
    setRequestedId(undefined);
    setFresh(true);
    setFormKey((k) => k + 1);
    setError(null);
  }
  async function submit(answer: string, explanation: string) {
    if (!initialQuestion || !concept || inFlight.current || complete) return;
    const stored = currentSession();
    writeSession(stored);
    const expectedSession = stored.id;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const body = response
        ? {
            answer,
            explanation,
            continuation: {
              state: response.state,
              token: response.continuationToken,
            },
          }
        : {
            courseId: course.courseId,
            questionId: initialQuestion.id,
            localSessionId: stored.id,
            answer,
            explanation,
          };
      const result = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(75000),
      });
      let data: unknown;
      try {
        data = await result.json();
      } catch {
        throw new Error(
          "The service returned an unreadable response. Your text is still here; please retry.",
        );
      }
      if (!result.ok) {
        const code = (data as { error?: { code?: string } })?.error?.code;
        throw new Error(
          code === "INVALID_ATTEMPT"
            ? "This coaching session has expired or changed. Start a new attempt to continue."
            : `The coaching service is unavailable. Your text is still here; please retry. Reference: ${result.headers.get("x-request-id") ?? "unavailable"}`,
        );
      }
      if (
        !isCoachResponse(data) ||
        data.state.questionId !== initialQuestion.id ||
        data.state.localSessionId !== expectedSession ||
        data.state.courseVersion !== course.version
      )
        throw new Error(
          "The coaching response could not be validated. Please retry.",
        );
      const pending = data.state.pending;
      if (
        pending &&
        (data.state.phase === "clarify"
          ? ![
              `${initialQuestion.id}-probe-1`,
              `${initialQuestion.id}-probe-2`,
            ].includes(pending.id)
          : pending.id === initialQuestion.id ||
            !concept.questions.some((q) => q.id === pending.id))
      )
        throw new Error(
          "The next question could not be validated. Please retry.",
        );
      if (
        [
          ...(data.state.feedback?.sourceIds ?? []),
          ...(data.lesson?.sourceIds ?? []),
        ].some((id) => !concept.sources.some((s) => s.id === id))
      )
        throw new Error(
          "The course sources could not be validated. Please retry.",
        );
      const current = currentSession();
      if (current.id !== expectedSession)
        throw new Error(
          "This session was reset in another tab. Start a new attempt.",
        );
      writeSession(saveCoach(current, data));
      setFresh(false);
      requestAnimationFrame(() => {
        resultRef.current?.focus({ preventScroll: true });
        resultRef.current?.scrollIntoView({
          behavior: "instant",
          block: "nearest",
        });
      });
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "The request timed out. Your text is still here; please retry.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (!concept)
    return (
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Choose a concept</h2>
          <p className="text-xs text-muted-foreground">
            Conversations are saved in this browser
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {course.concepts.map((c, i) => {
            const last = session?.coaching?.findLast((a) =>
              c.questions.some((q) => q.id === a.response.state.questionId),
            )?.response.state;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setRequestedId(undefined);
                  setSelectedId(c.id);
                  setFresh(false);
                  setError(null);
                }}
                className="rounded-xl border bg-white p-6 text-left transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                <span className="mb-6 flex justify-between text-primary">
                  <span className="font-mono text-sm">0{i + 1}</span>
                  <ArrowRight className="size-4" />
                </span>
                <h3 className="mb-3 text-lg font-semibold">{c.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {c.learningObjective}
                </p>
                <p className="mt-6 text-xs font-medium text-primary">
                  {last
                    ? last.phase === "complete"
                      ? coachStatusLabels[last.result!.status]
                      : "Continue coaching"
                    : "Start this concept"}
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Synthetic demo. Use invented examples only. Your answers, explanations
          and coaching conversation are saved locally. Clear them from Learning
          Progress.
        </p>
      </section>
    );
  const activeStep = !state ? 0 : phase === "clarify" ? 1 : complete ? 3 : 2;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setRequestedId(undefined);
            setSelectedId("");
            setFresh(false);
            setError(null);
          }}
        >
          <ArrowLeft />
          All concepts
        </Button>
        <Badge variant="outline">Self-guided learning</Badge>
      </div>
      <ol
        className="grid grid-cols-4 gap-2 rounded-xl border bg-white p-4 text-center text-xs font-medium"
        aria-label="Practice progress"
      >
        {["Explain", "Explore", "Learn", "Check"].map((label, i) => (
          <li
            key={label}
            aria-current={i === activeStep ? "step" : undefined}
            className={
              i === activeStep
                ? "font-semibold text-primary"
                : "text-muted-foreground"
            }
          >
            {label}
          </li>
        ))}
      </ol>
      {!storageAvailable && (
        <Alert>
          <AlertCircle />
          <AlertTitle>Browser storage is unavailable</AlertTitle>
          <AlertDescription>
            You can practise now, but progress will be lost on reload.
          </AlertDescription>
        </Alert>
      )}
      <div
        ref={resultRef}
        tabIndex={-1}
        className="outline-none"
        aria-label="Coaching next step"
      >
        {error && (
          <Alert variant="destructive" role="alert" className="mb-5">
            <AlertCircle />
            <AlertTitle>We couldn’t finish this step</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {response && (
          <div role="status" className="mb-6 rounded-xl border bg-white p-5">
            <p className="text-sm font-medium leading-6">{response.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {state?.diagnosis?.decisionProvider === "generative-baseline"
                ? "Generative fallback"
                : "Live AI coaching"}{" "}
              · {state!.turns.length} explained{" "}
              {state!.turns.length === 1 ? "response" : "responses"}
            </p>
          </div>
        )}
        <div className="grid items-start gap-7 lg:grid-cols-2">
          <div className="space-y-5">
            {response?.lesson && (
              <LearningLesson
                lesson={response.lesson}
                sources={concept.sources}
              />
            )}
            {!complete ? (
              <section className="rounded-xl border bg-white p-5 sm:p-7">
                <p className="eyebrow mb-3">
                  {!state
                    ? "INITIAL QUESTION"
                    : phase === "clarify"
                      ? "DIAGNOSTIC QUESTION"
                      : phase === "retry"
                        ? "GUIDED RETRY / SAME QUESTION"
                        : "NEW QUESTION / SAME CONCEPT"}
                </p>
                <h2 className="mb-3 text-xl font-semibold">
                  {!state
                    ? concept.title
                    : phase === "clarify"
                      ? "Let’s narrow it down."
                      : phase === "retry"
                        ? "Try the steps in your own words."
                        : "Check what clicked."}
                </h2>
                <p className="mb-6 text-sm leading-7">{question?.prompt}</p>
                <AttemptForm
                  key={`${concept.id}-${formKey}-${state?.turns.length ?? 0}`}
                  onSubmit={submit}
                  isSubmitting={busy}
                  buttonText={
                    !state
                      ? "Get feedback"
                      : phase === "clarify"
                        ? "Continue coaching"
                        : "Check understanding"
                  }
                />
              </section>
            ) : (
              <section
                className={`rounded-xl border p-6 ${state?.result?.status === "verified" ? "border-primary/20 bg-secondary" : "border-amber-200 bg-amber-50"}`}
              >
                <Badge variant="outline">
                  {coachStatusLabels[state!.result!.status]}
                </Badge>
                <h2 className="mt-4 text-xl font-semibold">
                  {state?.result?.status === "verified"
                    ? "That reasoning holds up."
                    : "Keep building the foundation."}
                </h2>
                <p className="mt-3 text-sm leading-7">
                  {state?.result?.reason}
                </p>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  An immediate check is not proof of lasting learning. Return
                  later and explain it again.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={restart}>
                    Practise again
                    <ArrowRight />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRequestedId(undefined);
                      setSelectedId("");
                      setFresh(false);
                    }}
                  >
                    Another concept
                  </Button>
                </div>
              </section>
            )}
            {state && !complete && (
              <Button variant="ghost" disabled={busy} onClick={restart}>
                <RotateCcw />
                Start a new attempt
              </Button>
            )}
          </div>
          <div className="space-y-5">
            {(!state ||
              busy ||
              phase === "clarify" ||
              (!complete &&
                state.diagnosis &&
                !state.diagnosis.reviewRequired)) && (
              <FeedbackPanel
                isLoading={busy}
                response={state ?? null}
                sources={concept.sources}
              />
            )}
            {state && (
              <details className="rounded-xl border bg-white p-5">
                <summary className="cursor-pointer py-2 text-sm font-semibold">
                  Your reasoning so far ({state.turns.length})
                </summary>
                <ol className="mt-4 space-y-5">
                  {state.turns.map((turn, i) => (
                    <li key={i} className="border-t pt-4 text-sm leading-6">
                      <p className="mb-2 text-xs font-semibold text-primary">
                        {i + 1}.{" "}
                        {turn.kind === "probe"
                          ? "Clarification"
                          : turn.kind === "verification"
                            ? "Understanding check"
                            : "Initial explanation"}
                      </p>
                      <p className="text-muted-foreground">{turn.prompt}</p>
                      <p className="mt-2 font-medium">{turn.answer}</p>
                      <p className="mt-1">{turn.explanation}</p>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <details className="rounded-xl border bg-white p-5">
              <summary className="cursor-pointer py-2 text-sm font-semibold">
                Course reading & learning objective
              </summary>
              <p className="my-3 text-xs leading-6 text-muted-foreground">
                {concept.learningObjective}
              </p>
              {concept.sources.map((s) => (
                <div key={s.id} className="text-xs leading-6">
                  <p>{s.text}</p>
                  <a
                    className="text-primary underline"
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.attribution}
                  </a>
                  <p className="text-muted-foreground">
                    {s.license} · not independently validated
                  </p>
                </div>
              ))}
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
