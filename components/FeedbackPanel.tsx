import type { AnalyzeResponse } from "@/lib/contracts";

interface FeedbackPanelProps {
  isLoading: boolean;
  response: AnalyzeResponse | null;
}

export default function FeedbackPanel({ isLoading, response }: FeedbackPanelProps) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-md bg-slate-50 flex items-center justify-center min-h-[150px]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-500">Analyzing your reasoning...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="p-4 border border-dashed border-gray-300 rounded-md bg-gray-50 flex items-center justify-center min-h-[150px] text-gray-400 text-sm italic">
        Submit your answer to see feedback.
      </div>
    );
  }

  const { diagnosis, feedback } = response;

  return (
    <div className="p-4 border rounded-md bg-slate-50 flex flex-col gap-4">
      <h3 className="font-semibold text-lg text-blue-800">Feedback</h3>
      
      <div className="p-3 bg-white border rounded text-sm flex flex-col gap-2">
        <p><strong>Hypothesis:</strong> {diagnosis.label}</p>
        <p className="text-gray-700 italic border-l-2 pl-2">&quot;{diagnosis.evidence}&quot;</p>
        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          <span className="bg-gray-200 px-1.5 py-0.5 rounded">Provider: {diagnosis.decisionProvider}</span>
        </div>
      </div>

      {feedback && (
        <div className="text-sm bg-blue-50/50 p-3 rounded border border-blue-100">
          <p><strong>Feedback:</strong> {feedback.text}</p>
          {feedback.sourceIds && feedback.sourceIds.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Source Attribution: {feedback.sourceIds.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
