"use client";

import { useState, useEffect } from "react";
import type { PublicCourse, AnalyzeResponse, ApiError, VerifyResponse } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import AttemptForm from "./AttemptForm";
import FeedbackPanel from "./FeedbackPanel";
import { AlertCircle, ChevronRight, CheckCircle2, CheckSquare } from "lucide-react";

export default function LearnerFlow({ course }: { course: PublicCourse }) {
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [analyzeResponse, setAnalyzeResponse] = useState<AnalyzeResponse | null>(null);
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResponse, setVerifyResponse] = useState<VerifyResponse | null>(null);

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

  // Sync to educator view
  useEffect(() => {
    if (selectedConcept && analyzeResponse) {
      localStorage.setItem("nervon_educator_sync", JSON.stringify({
        conceptTitle: selectedConcept.title,
        conceptId: selectedConcept.id,
        diagnosisLabel: analyzeResponse.diagnosis.label,
        reviewRequired: analyzeResponse.diagnosis.reviewRequired,
        verifyStatus: verifyResponse?.status || "pending",
        timestamp: Date.now()
      }));
      // Dispatch custom event for same-window updates
      window.dispatchEvent(new Event("nervon_sync_update"));
    }
  }, [selectedConcept, analyzeResponse, verifyResponse]);

  const handleInitialSubmit = async (answer: string, explanation: string) => {
    if (!selectedConcept || !initialQuestion || !localSessionId) {
      setApiError("Your demo session is still starting. Please try again in a moment.");
      return;
    }
    
    setIsSubmitting(true);
    setApiError(null);
    setAnalyzeResponse(null);
    setVerifyResponse(null);

    try {
      const response = await fetch("/api/analyze", {
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

      if (!response.ok) {
        let message = "The analysis service is unavailable. No live inference was returned.";
        try {
          const error = (await response.json()) as ApiError;
          if (error.error?.message) message = error.error.message;
        } catch {
          // Keep the disclosed unavailable message when the response is not JSON.
        }
        setApiError(message);
        return;
      }

      setAnalyzeResponse((await response.json()) as AnalyzeResponse);
    } catch {
      setApiError("The analysis service is unavailable. Check the connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestionSubmit = async (answer: string, explanation: string) => {
    if (!analyzeResponse?.attemptId || !analyzeResponse.nextQuestion) {
      setApiError("Verification requires a valid previous attempt.");
      return;
    }
    
    setIsVerifying(true);
    setApiError(null);
    setVerifyResponse(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: analyzeResponse.attemptId,
          nextQuestionId: analyzeResponse.nextQuestion.id,
          answer,
          explanation,
        }),
      });

      if (!response.ok) {
        let message = "The verification service is unavailable.";
        try {
          const error = (await response.json()) as ApiError;
          if (error.error?.message) message = error.error.message;
        } catch {
          // Keep default message
        }
        setApiError(message);
        return;
      }

      setVerifyResponse((await response.json()) as VerifyResponse);
    } catch {
      setApiError("The verification service is unavailable. Check the connection and try again.");
    } finally {
      setIsVerifying(false);
    }
  };


  if (!selectedConceptId) {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Select a Concept</h2>
          <p className="text-muted-foreground">Choose a topic to begin your learning journey.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {course.concepts.map((concept) => (
            <button
              key={concept.id}
              type="button"
              className="w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => setSelectedConceptId(concept.id)}
            >
              <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md group h-full">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center justify-between group-hover:text-primary transition-colors">
                    {concept.title}
                    <ChevronRight className="h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{concept.learningObjective}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-1">Current Concept</p>
          <h2 className="text-2xl font-bold text-primary">{selectedConcept?.title}</h2>
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedConceptId("");
            setAnalyzeResponse(null);
            setApiError(null);
            setVerifyResponse(null);
          }}
        >
          Change Concept
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-6">
          <Card className="border-primary/20 shadow-sm bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" /> Initial Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{initialQuestion?.prompt}</p>
            </CardContent>
          </Card>

          <AttemptForm 
            onSubmit={handleInitialSubmit} 
            isSubmitting={isSubmitting} 
            disabled={!!analyzeResponse}
          />

          {apiError && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-sm">Error</p>
                <p className="text-sm">{apiError}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 sticky top-6">
          <FeedbackPanel 
            isLoading={isSubmitting} 
            response={analyzeResponse} 
            sources={selectedConcept?.sources ?? []}
          />

          {analyzeResponse && analyzeResponse.diagnosis.reviewRequired && (
            <div className="p-4 bg-amber-50/80 text-amber-900 border border-amber-200 rounded-lg flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold text-sm">Educator Review Required</p>
                <p className="text-sm leading-relaxed">Your explanation provided insufficient evidence to confidently diagnose your reasoning. We need more detail or educator review before advancing.</p>
              </div>
            </div>
          )}

          {analyzeResponse && !analyzeResponse.diagnosis.reviewRequired && analyzeResponse.nextQuestion && !verifyResponse && (
            <div className="flex flex-col gap-4 mt-2 animate-in fade-in slide-in-from-top-4 duration-500">
              <Card className="border-blue-200 shadow-sm bg-blue-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" /> Check your understanding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analyzeResponse.nextQuestion.prompt}</p>
                </CardContent>
              </Card>
              <AttemptForm 
                onSubmit={handleNextQuestionSubmit} 
                isSubmitting={isVerifying}
                disabled={isVerifying}
                buttonText="Submit Verification (Demo)"
              />
            </div>
          )}

          {verifyResponse && (
            <div className="mt-2 animate-in fade-in slide-in-from-top-4 duration-500">
               <Card className="border-green-200 shadow-sm bg-green-50/50">
                <CardHeader className="pb-3 border-b border-green-100 bg-green-100/30">
                  <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Verification {verifyResponse.status}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-green-900 leading-relaxed">{verifyResponse.reason}</p>
                  <div className="mt-4 pt-4 border-t border-green-200/50 flex justify-end">
                     <Button variant="outline" className="text-green-800 border-green-300 hover:bg-green-100" onClick={() => {
                        setSelectedConceptId("");
                        setAnalyzeResponse(null);
                        setApiError(null);
                        setVerifyResponse(null);
                     }}>Next Concept</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
