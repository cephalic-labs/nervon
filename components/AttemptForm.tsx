"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface AttemptFormProps {
  onSubmit: (answer: string, explanation: string) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  buttonText?: string;
}

export default function AttemptForm({ onSubmit, isSubmitting, disabled, buttonText = "Submit" }: AttemptFormProps) {
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !explanation.trim() || disabled || isSubmitting) return;
    onSubmit(answer, explanation);
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-lg text-primary">Your Answer</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Label htmlFor="answer">Answer</Label>
            <Input 
              id="answer"
              type="text" 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter your concise answer..."
              disabled={disabled || isSubmitting}
              required
              className="transition-all focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="explanation">Explanation</Label>
            <Textarea 
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain your reasoning step by step..."
              disabled={disabled || isSubmitting}
              required
              className="min-h-[120px] transition-all focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
            />
          </div>
          <Button 
            type="submit" 
            disabled={disabled || isSubmitting || !answer.trim() || !explanation.trim()}
            className="w-full sm:w-auto self-start mt-2"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Submitting..." : buttonText}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
