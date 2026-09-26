import type { AnalyzeResponse, PublicSource } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen } from "lucide-react";

interface FeedbackPanelProps {
  isLoading: boolean;
  response: AnalyzeResponse | null;
  sources: PublicSource[];
}

export default function FeedbackPanel({ isLoading, response, sources }: FeedbackPanelProps) {
  if (isLoading) {
    return (
      <Card className="shadow-md h-full min-h-[250px] flex items-center justify-center border-dashed">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
          <span className="text-sm font-medium tracking-wide">Analyzing your reasoning...</span>
        </div>
      </Card>
    );
  }

  if (!response) {
    return null;
  }

  const { diagnosis, feedback } = response;

  return (
    <Card className="shadow-lg border-primary/20 h-full">
      <CardHeader className="bg-primary/5 pb-4 border-b">
        <CardTitle className="text-xl text-primary flex items-center gap-2">
          Nervon Coach
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium tracking-wide">
            Live response, pending review
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex flex-col gap-6">
        <div className="p-4 bg-muted/30 rounded-lg border flex flex-col gap-3">
          <div className="flex justify-between items-start gap-4">
            <p className="font-semibold text-sm">Hypothesis: <span className="font-normal">{diagnosis.label}</span></p>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
              Provider: {diagnosis.decisionProvider}
            </span>
          </div>
          <p className="text-muted-foreground text-sm italic border-l-2 border-primary/40 pl-3 py-1">
            &quot;{diagnosis.evidence}&quot;
          </p>
        </div>

        {feedback && (
          <div className="text-sm bg-blue-50/50 p-4 rounded-lg border border-blue-100 shadow-inner">
            <p className="leading-relaxed"><strong className="text-blue-900">Feedback:</strong> {feedback.text}</p>
            {feedback.sourceIds && feedback.sourceIds.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 text-xs text-blue-700 bg-blue-100/50 w-fit px-2 py-2 rounded">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="font-medium">Source attribution</span>
                {feedback.sourceIds.map((sourceId) => {
                  const source = sources.find((candidate) => candidate.id === sourceId);
                  return source ? (
                    <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      {source.title} ({source.id})
                    </a>
                  ) : (
                    <span key={sourceId}>{sourceId} (unrecognized source)</span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
