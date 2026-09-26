"use client";

import { useState, useEffect } from "react";
import type { PublicCourse, AnalyzeResponse } from "@/lib/contracts";
import { supportedDiagnosis, uncertainty } from "@/tests/fixtures/learner-contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import AttemptForm from "./AttemptForm";
import FeedbackPanel from "./FeedbackPanel";
import { AlertCircle, ChevronRight, CheckCircle2 } from "lucide-react";

export default function LearnerFlow({ course }: { course: PublicCourse }) {
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [analyzeResponse, setAnalyzeResponse] = useState<AnalyzeResponse | null>(null);


  useEffect(() => {
    let sid = localStorage.getItem("nervon_demo_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("nervon_demo_session_id", sid);
    }
    // Set it in local storage, but since we mock the API, we don't need to keep it in React state anymore
  }, []);

  const selectedConcept = course.concepts.find((c) => c.id === selectedConceptId);
  const initialQuestion = selectedConcept?.questions[0];

  const handleInitialSubmit = async (answer: string, explanation: string) => {
    if (!selectedConcept || !initialQuestion) return;
    
    setIsSubmitting(true);
    setApiError(null);
    setAnalyzeResponse(null);

    // Simulated API response logic
    setTimeout(() => {
      // Mock logic: if explanation is very short, show uncertainty, else show supportedDiagnosis
      if (explanation.trim().length < 15) {
        setAnalyzeResponse(uncertainty as AnalyzeResponse);
      } else {
        // Adjust the mock response to match the actual chosen concept
        const mockResponse: AnalyzeResponse = {
          ...supportedDiagnosis,
          conceptId: selectedConcept.id,
        } as AnalyzeResponse;
        
        if (mockResponse.nextQuestion && !mockResponse.diagnosis.reviewRequired) {
             const nextQ = selectedConcept.questions.find(q => q.id !== initialQuestion.id);
             if (nextQ) {
               mockResponse.nextQuestion = nextQ;
             }
        }
        setAnalyzeResponse(mockResponse);
      }
      setIsSubmitting(false);
    }, 1500);
  };

  const handleNextQuestionSubmit = (answer: string, explanation: string) => {
    console.log("Verification submission deferred:", { answer, explanation });
    alert("Verification submission will be integrated in a later milestone.");
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
            <Card 
              key={concept.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => setSelectedConceptId(concept.id)}
            >
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

          {analyzeResponse && !analyzeResponse.diagnosis.reviewRequired && analyzeResponse.nextQuestion && (
            <div className="flex flex-col gap-4 mt-2 animate-in fade-in slide-in-from-top-4 duration-500">
              <Card className="border-blue-200 shadow-sm bg-blue-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800">Check your understanding</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analyzeResponse.nextQuestion.prompt}</p>
                </CardContent>
              </Card>
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
