// Explicit live integration check. Never imported by the application or npm test.
import nextEnv from '@next/env';
import { randomUUID } from 'node:crypto';
import { reasoningExamples } from '../tests/fixtures/learner-contracts.ts';
import pack from '../data/classical-genetics-course.json' with { type: 'json' };

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.OPENROUTER_API_KEY || !process.env.ATTEMPT_SIGNING_SECRET) {
  console.error('LIVE ACCEPTANCE PENDING: configure OPENROUTER_API_KEY and ATTEMPT_SIGNING_SECRET in .env.local, start the app, then rerun npm run smoke:analyze. No live requests were made.');
  process.exit(2);
}
const base = new URL(process.env.NERVON_SMOKE_BASE_URL || 'http://localhost:3000');
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
  console.error('Use a local app URL in NERVON_SMOKE_BASE_URL.');
  process.exit(2);
}
const configuredJevModel = process.env.OPENROUTER_JEV_MODEL || 'typesafe/jev-1.13';
const configuredGenerativeModel = process.env.OPENROUTER_GENERATIVE_MODEL || 'deepseek/deepseek-v4.1-flash';
console.log(JSON.stringify({ disclosure: 'Live synthetic integration examples, not a diagnostic-accuracy benchmark', configuredJevModel, configuredGenerativeModel }));
const localSessionId = `smoke-${randomUUID()}`;
let failures = 0;
const results = [];
for (const example of reasoningExamples) {
  const start = Date.now();
  try {
    const response = await fetch(new URL('/api/analyze', base), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: pack.courseId, questionId: example.questionId, answer: example.answer, explanation: example.explanation, localSessionId }),
      signal: AbortSignal.timeout(55000),
    });
    const data = await response.json();
    if (!response.ok) {
      failures++;
      console.log(JSON.stringify({ kind: example.kind, status: response.status, errorCode: data.error?.code, requestId: response.headers.get('X-Request-Id'), latencyMs: Date.now() - start }));
      continue;
    }
    const concept = pack.concepts.find(item => item.questions.some(question => question.id === example.questionId));
    const diagnosis = data.diagnosis;
    const evidenceValid = typeof diagnosis?.evidence === 'string' && !!diagnosis.evidence.trim() && example.explanation.includes(diagnosis.evidence);
    const providerValid = ['jev', 'generative-baseline'].includes(diagnosis?.decisionProvider);
    const labelValid = concept.questions.find(question => question.id === example.questionId).diagnosticRubric.some(entry => entry.label === diagnosis?.label);
    const review = diagnosis?.reviewRequired === true;
    const supported = diagnosis?.reviewRequired === false;
    const shapeValid = review ? data.feedback === null && data.nextQuestion === null
      : supported && !!data.feedback?.text?.trim() && data.feedback.text.length <= 1200 && Array.isArray(data.feedback.sourceIds) && data.feedback.sourceIds.length > 0 && data.feedback.sourceIds.every(id => concept.sources.some(source => source.id === id)) && concept.questions.some(question => question.id === data.nextQuestion?.id && question.id !== example.questionId);
    const fixtureMatch = diagnosis?.label === example.expectedLabel;
    const honestUncertainty = review && ['insufficient-evidence', 'unrelated-reasoning'].includes(diagnosis?.label);
    const passed = !!(providerValid && labelValid && evidenceValid && shapeValid && typeof data.attemptId === 'string' && data.attemptId.includes('.') && data.conceptId === concept.id && response.headers.get('Cache-Control') === 'no-store' && (fixtureMatch || honestUncertainty));
    if (!passed) failures++;
    const result = { kind: example.kind, expectedLabel: example.expectedLabel, actualLabel: diagnosis?.label, decisionProvider: diagnosis?.decisionProvider, reviewRequired: review, fixtureMatch, passed, requestId: response.headers.get('X-Request-Id'), latencyMs: Date.now() - start };
    results.push(result);
    console.log(JSON.stringify(result));
  } catch {
    failures++;
    console.log(JSON.stringify({ kind: example.kind, passed: false, error: 'Local endpoint unavailable, response malformed, or request timed out', latencyMs: Date.now() - start }));
  }
}
const contrasting = results.filter(result => ['sound', 'misconception'].includes(result.kind));
const distinctOrUncertain = contrasting.length === 2 && (contrasting[0].actualLabel !== contrasting[1].actualLabel || contrasting.some(result => result.reviewRequired));
if (!distinctOrUncertain) failures++;
console.log(JSON.stringify({ tested: reasoningExamples.length, failures, distinctOrUncertain, note: 'Correlate requestId with server logs for actual model IDs, Jev distributions, per-call latency, and usage. Fixture mismatches require manual review; this run cannot establish educational accuracy.' }));
process.exitCode = failures ? 1 : 0;
