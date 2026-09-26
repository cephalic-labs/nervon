"use client";

import { useState, useEffect } from "react";
import type { PublicCourse, AnalyzeResponse, ApiError } from "@/lib/contracts";

import AttemptForm from "./AttemptForm";
import FeedbackPanel from "./FeedbackPanel";

export default function LearnerFlow({ course }: { course: PublicCourse }) {
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [analyzeResponse, setAnalyzeResponse] = useState<AnalyzeResponse | null>(null);

  // Generate or retrieve localSessionId
  const [localSessionId, setLocalSessionId] = useState<string>("");
  useEffect(() => {
    let sid = localStorage.getItem("nervon_demo_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("nervon_demo_session_id", sid);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalSessionId(sid);
  }, []);

  const selectedConcept = course.concepts.find((c) => c.id === selectedConceptId);
  const initialQuestion = selectedConcept?.questions[0];

  const handleInitialSubmit = async (answer: string, explanation: string) => {
    if (!selectedConcept || !initialQuestion) return;
    
    setIsSubmitting(true);
    setApiError(null);
    setAnalyzeResponse(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.courseId,
          questionId: initialQuestion.id,
          answer,
          explanation,
          localSessionId,
        }),
      });

      if (!res.ok) {
        let errorMsg = "Service unavailable.";
        try {
          const errData = (await res.json()) as ApiError;
          if (errData.error?.message) {
            errorMsg = errData.error.message;
          }
        } catch {
          // Ignore json parse error
        }
        setApiError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      const data = (await res.json()) as AnalyzeResponse;
      setAnalyzeResponse(data);
    } catch {
      setApiError("A network or unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestionSubmit = (answer: string, explanation: string) => {
    // Keep verification submission integration for later milestone
    console.log("Verification submission deferred:", { answer, explanation });
    alert("Verification submission will be integrated in a later milestone.");
  };

  if (!selectedConceptId) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Select a concept to begin:</h2>
        <div className="flex flex-col gap-2">
          {course.concepts.map((concept) => (
            <button
              key={concept.id}
              onClick={() => setSelectedConceptId(concept.id)}
              className="text-left p-4 border rounded-md hover:bg-gray-50 flex flex-col"
            >
              <span className="font-medium text-lg">{concept.title}</span>
              <span className="text-sm text-gray-600">{concept.learningObjective}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Concept: {selectedConcept?.title}</h2>
        <button 
          onClick={() => {
            setSelectedConceptId("");
            setAnalyzeResponse(null);
            setApiError(null);
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          Change Concept
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <h3 className="font-semibold mb-2">Initial Question</h3>
            <p className="text-sm">{initialQuestion?.prompt}</p>
          </div>

          <AttemptForm 
            onSubmit={handleInitialSubmit} 
            isSubmitting={isSubmitting} 
            disabled={!!analyzeResponse}
          />

          {apiError && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
              <strong>Error:</strong> {apiError}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="font-semibold text-lg text-gray-700 flex items-center gap-2">
            Nervon Coach
            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded font-normal">
              Synthetic UI fixture — not live AI
            </span>
          </h2>
          
          <FeedbackPanel 
            isLoading={isSubmitting} 
            response={analyzeResponse} 
          />

          {analyzeResponse && analyzeResponse.diagnosis.reviewRequired && (
            <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
              <p className="font-semibold">Educator Review Required</p>
              <p className="text-sm mt-1">We need more explanation or educator review to provide accurate feedback. You cannot advance to the next question yet.</p>
            </div>
          )}

          {analyzeResponse && !analyzeResponse.diagnosis.reviewRequired && analyzeResponse.nextQuestion && (
            <div className="flex flex-col gap-4 mt-4 border-t pt-6">
              <h3 className="font-semibold text-lg text-blue-800">Check your understanding</h3>
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <p className="text-sm">{analyzeResponse.nextQuestion.prompt}</p>
              </div>
              <AttemptForm 
                onSubmit={handleNextQuestionSubmit} 
                isSubmitting={false}
                buttonText="Submit Verification (Demo)"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
