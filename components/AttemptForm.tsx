"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2 } from "lucide-react";
import { INPUT_LIMITS } from "@/lib/contracts";
export default function AttemptForm({
  onSubmit,
  isSubmitting = false,
  disabled = false,
  buttonText = "Get feedback",
}: {
  onSubmit: (answer: string, explanation: string) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  buttonText?: string;
}) {
  const id = useId();
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      aria-label={buttonText}
      aria-busy={isSubmitting}
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled || isSubmitting) return;
        if (!answer.trim() || !explanation.trim()) {
          setError("Add an answer and explain how you reached it.");
          return;
        }
        setError("");
        onSubmit(answer.trim(), explanation.trim());
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-answer`}>Your answer</Label>
        <Input
          id={`${id}-answer`}
          name="answer"
          value={answer}
          maxLength={INPUT_LIMITS.answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={disabled || isSubmitting}
          required
          placeholder="Write your answer here"
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between gap-2">
          <Label htmlFor={`${id}-explanation`}>Explain your reasoning</Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {explanation.length.toLocaleString()} / 4,000
          </span>
        </div>
        <Textarea
          id={`${id}-explanation`}
          name="explanation"
          value={explanation}
          maxLength={INPUT_LIMITS.explanation}
          onChange={(e) => setExplanation(e.target.value)}
          disabled={disabled || isSubmitting}
          required
          placeholder="Which idea did you use? Walk through the steps that led to your answer."
          className="min-h-36 resize-y bg-white"
          aria-describedby={`${id}-hint`}
        />
        <p
          id={`${id}-hint`}
          className="text-xs leading-5 text-muted-foreground"
        >
          Use your own words. A correct answer alone can’t show how you reached
          it.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={disabled || isSubmitting}
        className="w-full sm:w-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" />
            Checking your reasoning…
          </>
        ) : (
          <>
            {buttonText}
            <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
