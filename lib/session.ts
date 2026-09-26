import type { AnalyzeResponse, VerifyResponse } from './contracts';

export interface SessionAttempt {
  questionId: string;
  analysis: AnalyzeResponse;
  verification: VerifyResponse | null;
  updatedAt: number;
}
export interface DemoSession { version: 1; id: string; attempts: SessionAttempt[] }
export const SESSION_KEY = 'nervon-session-v1';
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 4096): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export function isAnalysis(value: unknown): value is AnalyzeResponse {
  if (!object(value) || !text(value.attemptId) || !text(value.conceptId, 128) || !object(value.diagnosis)) return false;
  const d = value.diagnosis;
  if (!text(d.label, 128) || typeof d.evidence !== 'string' || d.evidence.length > 4000 || !['jev','generative-baseline','laya'].includes(String(d.decisionProvider))) return false;
  if (d.reviewRequired === true) return value.feedback === null && value.nextQuestion === null;
  return d.reviewRequired === false && object(value.feedback) && text(value.feedback.text,1200)
    && Array.isArray(value.feedback.sourceIds) && value.feedback.sourceIds.length > 0 && value.feedback.sourceIds.every(id => text(id,128))
    && object(value.nextQuestion) && text(value.nextQuestion.id,128) && text(value.nextQuestion.prompt,8000);
}
export function isVerification(value: unknown): value is VerifyResponse {
  return object(value) && ['verified','needsPractice','educatorReview'].includes(String(value.status)) && text(value.reason,4000);
}
export function parseSession(raw: string | null): DemoSession | null {
  try {
    if (!raw || raw.length > 2_000_000) return null;
    const value = JSON.parse(raw);
    if (!object(value) || value.version !== 1 || !text(value.id,128) || !Array.isArray(value.attempts) || value.attempts.length > 50) return null;
    if (!value.attempts.every(a => object(a) && text(a.questionId,128) && isAnalysis(a.analysis) && (a.verification === null || isVerification(a.verification)) && typeof a.updatedAt === 'number' && Number.isFinite(a.updatedAt))) return null;
    return value as unknown as DemoSession;
  } catch { return null; }
}
export function saveAttempt(session: DemoSession, questionId: string, analysis: AnalyzeResponse, now = Date.now()): DemoSession {
  return {...session, attempts: [...session.attempts.filter(a => a.analysis.attemptId !== analysis.attemptId), {questionId, analysis, verification:null, updatedAt:now}].slice(-50)};
}
export function saveVerification(session: DemoSession, attemptId: string, verification: VerifyResponse, now = Date.now()): DemoSession {
  return {...session,attempts:session.attempts.map(a => a.analysis.attemptId === attemptId ? {...a,verification,updatedAt:now}:a)};
}
export function summarize(attempts: SessionAttempt[]) {
  const counts = {attempts:attempts.length,verified:0,needsPractice:0,educatorReview:0,pending:0};
  for (const a of attempts) {
    const status = a.analysis.diagnosis.reviewRequired ? 'educatorReview' : a.verification?.status ?? 'pending';
    counts[status]++;
  }
  return counts;
}
export function humanLabel(value: string) { return value.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase()); }
export const statusLabels = { verified: 'Understanding checked', needsPractice: 'Keep practising', educatorReview: 'Educator review', pending: 'Awaiting check' } as const;
