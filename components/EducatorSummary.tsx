"use client";

import { useEffect, useState } from "react";
import type { PublicCourse } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users2, Activity, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface SyncState {
  conceptTitle: string;
  conceptId: string;
  diagnosisLabel: string;
  reviewRequired: boolean;
  verifyStatus: string;
  timestamp: number;
}

export default function EducatorSummary({ course }: { course: PublicCourse }) {
  const [syncState, setSyncState] = useState<SyncState | null>(null);

  useEffect(() => {
    const updateState = () => {
      const stored = localStorage.getItem("nervon_educator_sync");
      if (stored) {
        try {
          setSyncState(JSON.parse(stored) as SyncState);
        } catch {
          // ignore parse errors
        }
      }
    };

    updateState();
    window.addEventListener("storage", updateState);
    window.addEventListener("nervon_sync_update", updateState);

    return () => {
      window.removeEventListener("storage", updateState);
      window.removeEventListener("nervon_sync_update", updateState);
    };
  }, []);

  // Compute mock cohort data dynamically by injecting the live session into one of the concepts
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-indigo-600" />
              Cohort Summary
            </span>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium tracking-wide">
              Pending Review
            </span>
          </CardTitle>
          <CardDescription>
            Synthetic cohort data based on recent performance (not real student data).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ul className="flex flex-col gap-4">
            {course.concepts.map((concept) => {
              const hasActiveSession = syncState?.conceptId === concept.id;
              
              return (
                <li key={concept.id} className="flex flex-col gap-2 pb-4 border-b last:border-0 last:pb-0">
                  <strong className="text-sm text-slate-800">{concept.title}</strong>
                  {hasActiveSession ? (
                    <div className="flex flex-col gap-1.5 mt-1 bg-indigo-50/50 p-3 rounded-md border border-indigo-100">
                      <div className="text-xs text-indigo-900 flex justify-between items-center">
                        <span className="font-medium flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> 1 Active Student</span>
                        <span className="opacity-70 flex items-center gap-1"><Clock className="h-3 w-3" /> Just now</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium block mb-0.5 text-xs text-slate-500 uppercase">Recent Diagnosis</span>
                        {syncState.diagnosisLabel}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                         {syncState.reviewRequired ? (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Review Required
                            </span>
                         ) : (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Auto-Diagnosed
                            </span>
                         )}
                         <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                           Verify: {syncState.verifyStatus}
                         </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500 italic">No aggregate data yet.</span>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-md border-slate-200 sticky top-6">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Live Demo Session
            </span>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium tracking-wide">
              Live Stream
            </span>
          </CardTitle>
          <CardDescription>
            Real-time synthetic student progress mapped from the learner view.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {!syncState ? (
            <div className="p-4 bg-slate-50 border border-dashed rounded-lg text-sm text-slate-500 italic flex flex-col items-center justify-center min-h-[150px] gap-2">
              <Clock className="h-6 w-6 opacity-50" />
              No current session active. Waiting for student attempt...
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 rounded-lg border bg-white shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b pb-2">
                   <div className="flex flex-col">
                     <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concept</span>
                     <span className="text-sm font-medium text-slate-900">{syncState.conceptTitle}</span>
                   </div>
                   <div className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded flex items-center gap-1.5">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                     </span>
                     Active
                   </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pattern Identified</span>
                  <span className="text-sm text-slate-800 bg-slate-50 p-2 border rounded">{syncState.diagnosisLabel}</span>
                </div>

                {syncState.reviewRequired ? (
                   <div className="bg-amber-50 p-3 rounded border border-amber-200 text-amber-900 flex items-start gap-2 mt-2">
                     <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                     <div className="flex flex-col">
                       <span className="text-sm font-medium">Attention Required</span>
                       <span className="text-xs opacity-90 mt-0.5">The student&apos;s explanation lacked sufficient evidence. Awaiting your review.</span>
                     </div>
                   </div>
                ) : (
                   <div className="flex flex-col gap-1.5 mt-2">
                     <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verification Status</span>
                     <div className="flex items-center gap-2">
                       {syncState.verifyStatus === "pending" ? (
                         <span className="text-sm px-2 py-1 bg-slate-100 text-slate-600 rounded flex items-center gap-1.5 border w-fit">
                           <Clock className="h-3.5 w-3.5" /> Waiting for student...
                         </span>
                       ) : (
                         <span className="text-sm px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 flex items-center gap-1.5 w-fit">
                           <CheckCircle2 className="h-3.5 w-3.5" /> {syncState.verifyStatus}
                         </span>
                       )}
                     </div>
                   </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
