"use client";
import { useRef, useState } from "react";
import type {
  PublicCourse,
  AnalyzeResponse,
  VerifyResponse,
} from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { currentSession, useSession, writeSession } from "@/lib/use-session";
import {
  isAnalysis,
  isVerification,
  saveAttempt,
  saveVerification,
  statusLabels,
} from "@/lib/session";
import AttemptForm from "./AttemptForm";
import FeedbackPanel from "./FeedbackPanel";

export default function LearnerFlow({
  course,
  initialConcept,
}: {
  course: PublicCourse;
  initialConcept?: string;
}) {
  const { session, storageAvailable } = useSession();
  const [selectedId, setSelectedId] = useState(initialConcept ?? "");
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState<"analyze" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const concept = course.concepts.find((c) => c.id === selectedId);
  const question = concept?.questions[0];
  const latest = !fresh
    ? session?.attempts.findLast(
        (a) =>
          a.analysis.conceptId === selectedId && a.questionId === question?.id,
      )
    : undefined;
  const analysis = latest?.analysis ?? null;
  const verification = latest?.verification ?? null;
  const supported = analysis && !analysis.diagnosis.reviewRequired;
  const announceResult = () =>
    requestAnimationFrame(() => {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({
        behavior: "instant",
        block: "nearest",
      });
    });
  async function submit(
    kind: "analyze" | "verify",
    answer: string,
    explanation: string,
  ) {
    if (!question || !concept || inFlight.current) return;
    const stored = currentSession();
    writeSession(stored);
    const expectedSession = stored.id;
    if (kind === "verify" && !analysis?.nextQuestion) return;
    inFlight.current = true;
    setBusy(kind);
    setError(null);
    try {
      const body =
        kind === "analyze"
          ? {
              courseId: course.courseId,
              questionId: question.id,
              answer,
              explanation,
              localSessionId: stored.id,
            }
          : {
              attemptId: analysis!.attemptId,
              nextQuestionId: analysis!.nextQuestion!.id,
              answer,
              explanation,
            };
      const response = await fetch(`/api/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(75000),
      });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The service returned an unreadable response. Your text is still here; please retry.",
        );
      }
      if (!response.ok) {
        const code = (data as { error?: { code?: string } })?.error?.code;
        throw new Error(
          code === "INVALID_ATTEMPT"
            ? "This check has expired or is no longer valid. Start a new attempt to continue."
            : `The ${kind === "analyze" ? "feedback" : "verification"} service is unavailable. Your text is still here; please retry. Reference: ${response.headers.get("x-request-id") ?? "unavailable"}`,
        );
      }
      if (kind === "analyze") {
        if (
          !isAnalysis(data) ||
          data.conceptId !== concept.id ||
          (data.nextQuestion &&
            (data.nextQuestion.id === question.id ||
              !concept.questions.some(
                (q) => q.id === data.nextQuestion!.id,
              ))) ||
          data.feedback?.sourceIds.some(
            (id) => !concept.sources.some((s) => s.id === id),
          )
        )
          throw new Error("The feedback could not be validated. Please retry.");
      } else if (!isVerification(data))
        throw new Error(
          "The verification could not be validated. Please retry.",
        );
      const current = currentSession();
      if (current.id !== expectedSession)
        throw new Error(
          "The session was reset in another tab. Start a new attempt.",
        );
      writeSession(
        kind === "analyze"
          ? saveAttempt(current, question.id, data as AnalyzeResponse)
          : saveVerification(
              current,
              analysis!.attemptId,
              data as VerifyResponse,
            ),
      );
      setFresh(false);
      announceResult();
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "The request timed out. Your text is still here; please retry.",
      );
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }
  function startNew() {
    setFresh(true);
    setFormKey((k) => k + 1);
    setError(null);
  }
  if (!concept)
    return (
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Choose a concept</h2>
          <p className="text-xs text-muted-foreground">
            Progress is saved in this browser
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {course.concepts.map((c, i) => {
            const last = session?.attempts.findLast(
              (a) => a.analysis.conceptId === c.id,
            );
            return (
              <button
                key={c.id}
                onClick={() => {
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
                    ? last.analysis.diagnosis.reviewRequired
                      ? "Clarify your reasoning"
                      : last.verification
                        ? statusLabels[last.verification.status]
                        : "Continue your check"
                    : "Start this concept"}
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          Synthetic demo session. Use invented examples only. Feedback and
          evidence are saved locally; reset your session from the educator view.
        </p>
      </section>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={!!busy}
          onClick={() => {
            setSelectedId("");
            setFresh(false);
            setError(null);
          }}
        >
          <ArrowLeft />
          All concepts
        </Button>
        <Badge variant="outline">Synthetic demo session</Badge>
      </div>
      <div className="rounded-xl border bg-white px-5 py-4">
        <ol
          className="grid grid-cols-3 gap-2 text-xs font-medium"
          aria-label="Practice progress"
        >
          {["Explain", "Reflect", "Check"].map((step, i) => (
            <li
              key={step}
              aria-current={
                (verification ? 2 : supported ? 2 : analysis ? 1 : 0) === i
                  ? "step"
                  : undefined
              }
              className={`flex items-center gap-2 ${i === 0 || analysis ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className="flex size-6 items-center justify-center rounded-full border bg-muted">
                {(i === 0 && supported) || (i === 2 && verification) ? (
                  <Check className="size-3" />
                ) : (
                  i + 1
                )}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      {!storageAvailable && (
        <Alert>
          <AlertCircle />
          <AlertTitle>Browser storage is unavailable</AlertTitle>
          <AlertDescription>
            You can practise now, but progress will be lost when you reload.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid items-start gap-7 lg:grid-cols-[1.05fr_1fr]">
        <section className="rounded-xl border bg-white p-5 sm:p-7">
          <p className="eyebrow mb-3">INITIAL QUESTION</p>
          <h2 className="mb-3 text-xl font-semibold">{concept.title}</h2>
          <p className="mb-6 text-sm leading-7">{question?.prompt}</p>
          {supported ? (
            <div className="rounded-lg bg-muted p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Check className="size-4 text-primary" />
                Your explanation has been reviewed.
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Reflect on the feedback, then try the new question. You can
                return to this check after navigating away.
              </p>
              <Button
                variant="ghost"
                className="mt-3"
                disabled={!!busy}
                onClick={startNew}
              >
                <RotateCcw />
                Start a new attempt
              </Button>
            </div>
          ) : (
            <AttemptForm
              key={`${concept.id}-${formKey}`}
              onSubmit={(a, e) => submit("analyze", a, e)}
              isSubmitting={busy === "analyze"}
            />
          )}
          <details className="mt-6 border-t pt-4">
            <summary className="cursor-pointer py-2 text-xs font-medium text-primary">
              Learning objective & course reading
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
                  {s.license} · pending educator review
                </p>
              </div>
            ))}
          </details>
        </section>
        <div
          ref={resultRef}
          tabIndex={-1}
          className="space-y-5 outline-none"
          aria-label="Feedback and next step"
        >
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircle />
              <AlertTitle>We couldn’t finish this step</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FeedbackPanel
            isLoading={busy === "analyze"}
            response={analysis}
            sources={concept.sources}
          />
          {supported && analysis.nextQuestion && !verification && (
            <section className="rounded-xl border bg-white p-5 sm:p-7">
              <p className="eyebrow mb-3">NEW QUESTION / SAME CONCEPT</p>
              <h3 className="mb-3 text-xl font-semibold">
                Check what clicked.
              </h3>
              <p className="mb-6 text-sm leading-7">
                {analysis.nextQuestion.prompt}
              </p>
              <AttemptForm
                key={analysis.attemptId}
                buttonText="Check understanding"
                onSubmit={(a, e) => submit("verify", a, e)}
                isSubmitting={busy === "verify"}
              />
            </section>
          )}
          {verification && (
            <section
              role="status"
              className={`rounded-xl border p-6 ${verification.status === "verified" ? "border-primary/20 bg-secondary" : "border-amber-200 bg-amber-50"}`}
            >
              <Badge variant="outline">
                {statusLabels[verification.status]}
              </Badge>
              <h3 className="mt-4 text-xl font-semibold">
                {verification.status === "verified"
                  ? "That reasoning holds up."
                  : verification.status === "needsPractice"
                    ? "One more step toward clarity."
                    : "Bring this to your educator."}
              </h3>
              <p className="mt-3 text-sm leading-7">{verification.reason}</p>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                This checks an immediate response. It does not establish lasting
                learning.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setSelectedId("");
                    setFresh(false);
                  }}
                >
                  Choose another concept
                  <ArrowRight />
                </Button>
                <Button variant="outline" onClick={startNew}>
                  Practise again
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
