import type { PublicCourse } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users2, Activity } from "lucide-react";

export default function EducatorSummary({ course }: { course: PublicCourse }) {
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
              Synthetic - Pending Review
            </span>
          </CardTitle>
          <CardDescription>
            Synthetic cohort data based on recent performance (not real student data).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ul className="flex flex-col gap-4">
            {course.concepts.map((concept) => (
              <li key={concept.id} className="flex flex-col gap-1 pb-4 border-b last:border-0 last:pb-0">
                <strong className="text-sm text-slate-800">{concept.title}</strong>
                <span className="text-sm text-slate-500 italic">No aggregate data yet.</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-md border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Live Demo Session
            </span>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-medium tracking-wide">
              Pending Review
            </span>
          </CardTitle>
          <CardDescription>
            Real-time synthetic student progress will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="p-4 bg-slate-50 border border-dashed rounded-lg text-sm text-slate-500 italic flex items-center justify-center min-h-[150px]">
            No current session active. Waiting for student attempt...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
