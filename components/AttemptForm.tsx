"use client";

import { useState } from "react";

export default function AttemptForm() {
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitted:", { answer, explanation });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 border rounded-md">
      <h3 className="font-semibold text-lg">Your Answer</h3>
      <div className="flex flex-col gap-2">
        <label htmlFor="answer" className="text-sm font-medium">Answer</label>
        <input 
          id="answer"
          type="text" 
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="border p-2 rounded-md"
          placeholder="Enter your answer..."
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="explanation" className="text-sm font-medium">Explanation</label>
        <textarea 
          id="explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="border p-2 rounded-md min-h-[100px]"
          placeholder="Explain your reasoning..."
        />
      </div>
      <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
        Submit
      </button>
    </form>
  );
}
