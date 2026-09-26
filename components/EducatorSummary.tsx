export default function EducatorSummary() {
  return (
    <div className="flex flex-col gap-4">
      <div className="border p-4 rounded-md bg-white shadow-sm">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          Cohort Summary
          <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded">Synthetic Data - Pending Review</span>
        </h3>
        <p className="text-sm text-gray-600 mb-4">Synthetic cohort data based on recent performance (not real student data).</p>
        <ul className="list-disc pl-5 text-sm flex flex-col gap-1 text-gray-500 italic">
          <li><strong>Mendelian inheritance:</strong> No aggregate data yet.</li>
          <li><strong>Polygenic traits:</strong> No aggregate data yet.</li>
        </ul>
      </div>

      <div className="border p-4 rounded-md bg-white shadow-sm">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          Live Demo Session
          <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded">Pending Review</span>
        </h3>
        <p className="text-sm text-gray-600 mb-2">Real-time synthetic student progress will appear here.</p>
        <div className="p-3 bg-gray-50 border rounded text-sm text-gray-500 italic">
          No current session active. Waiting for student attempt...
        </div>
      </div>
    </div>
  );
}
