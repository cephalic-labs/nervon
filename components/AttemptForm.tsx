"use client";

import { useState } from "react";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 border rounded-md bg-white">
      <h3 className="font-semibold text-lg">Your Answer</h3>
      <div className="flex flex-col gap-2">
        <label htmlFor="answer" className="text-sm font-medium">Answer</label>
        <input 
          id="answer"
          type="text" 
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="border p-2 rounded-md disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Enter your answer..."
          disabled={disabled || isSubmitting}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="explanation" className="text-sm font-medium">Explanation</label>
        <textarea 
          id="explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="border p-2 rounded-md min-h-[100px] disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Explain your reasoning..."
          disabled={disabled || isSubmitting}
          required
        />
      </div>
      <button 
        type="submit" 
        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        disabled={disabled || isSubmitting || !answer.trim() || !explanation.trim()}
      >
        {isSubmitting ? "Submitting..." : buttonText}
      </button>
    </form>
  );
}
