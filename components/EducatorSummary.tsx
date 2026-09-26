export default function EducatorSummary() {
  return (
    <div className="flex flex-col gap-4">
      <div className="border p-4 rounded-md bg-white shadow-sm">
        <h3 className="font-semibold text-lg mb-2">Cohort Summary</h3>
        <p className="text-sm text-gray-600 mb-4">Synthetic cohort data based on recent performance.</p>
        <ul className="list-disc pl-5 text-sm flex flex-col gap-1">
          <li><strong>Correlation vs Causation:</strong> 15 students struggled with confounding variables.</li>
          <li><strong>Sampling Bias:</strong> 8 students misunderstood convenience sampling.</li>
          <li><strong>Mean vs Median:</strong> 12 students failed to identify skewness.</li>
        </ul>
      </div>

      <div className="border p-4 rounded-md bg-white shadow-sm">
        <h3 className="font-semibold text-lg mb-2">Live Demo Session</h3>
        <p className="text-sm text-gray-600 mb-2">Real-time student progress will appear here.</p>
        <div className="p-3 bg-gray-50 border rounded text-sm text-gray-500 italic">
          No current session active. Waiting for student attempt...
        </div>
      </div>
    </div>
  );
}
