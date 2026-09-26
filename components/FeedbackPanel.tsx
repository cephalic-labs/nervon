export default function FeedbackPanel() {
  return (
    <div className="p-4 border rounded-md bg-slate-50 flex flex-col gap-4">
      <h3 className="font-semibold text-lg text-blue-800">Feedback</h3>
      <div className="p-3 bg-white border rounded text-sm">
        <p className="mb-2"><strong>Diagnosis:</strong> [Placeholder Diagnosis Label]</p>
        <p className="text-gray-700 italic">"Student's extracted evidence will go here."</p>
      </div>
      <div className="text-sm">
        <p><strong>Feedback:</strong> This is a placeholder feedback text. It will be grounded in course material and help the student understand the correct concept.</p>
        <p className="mt-2 text-xs text-gray-500">Source: [Placeholder Source ID]</p>
      </div>
    </div>
  );
}
