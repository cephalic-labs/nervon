import type { CoachResponse } from "./contracts";
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 4096): v is string =>
  typeof v === "string" && !!v.trim() && v.length <= max;
const sources = (v: unknown) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 10 &&
  v.every((id) => text(id, 128));
export function isCoachResponse(value: unknown): value is CoachResponse {
  if (!obj(value) || !obj(value.state) || !text(value.message, 2000))
    return false;
  const s = value.state;
  if (
    s.version !== 1 ||
    s.courseId !== "classical-genetics" ||
    !text(s.id, 128) ||
    !text(s.questionId, 128) ||
    !text(s.localSessionId, 128) ||
    !text(s.courseVersion, 128) ||
    !text(s.knowledgeVersion, 128) ||
    !Number.isSafeInteger(s.issuedAt)
  )
    return false;
  if (
    !Array.isArray(s.turns) ||
    s.turns.length < 1 ||
    s.turns.length > 5 ||
    !s.turns.every(
      (t) =>
        obj(t) &&
        ["initial", "probe", "verification"].includes(String(t.kind)) &&
        text(t.questionId, 128) &&
        text(t.prompt, 8000) &&
        text(t.answer, 2000) &&
        text(t.explanation, 4000),
    )
  )
    return false;
  if (
    s.result !== null &&
    (!obj(s.result) ||
      !["verified", "needsPractice", "needsClarification"].includes(
        String(s.result.status),
      ) ||
      !text(s.result.reason, 500))
  )
    return false;
  if (s.phase === "complete") {
    if (
      s.pending !== null ||
      value.continuationToken !== null ||
      s.result === null
    )
      return false;
  } else if (
    !["clarify", "verify", "retry"].includes(String(s.phase)) ||
    !obj(s.pending) ||
    !text(s.pending.id, 128) ||
    !text(s.pending.prompt, 8000) ||
    !text(value.continuationToken, 2048)
  )
    return false;
  if (
    s.diagnosis !== null &&
    (!obj(s.diagnosis) ||
      !text(s.diagnosis.label, 128) ||
      typeof s.diagnosis.evidence !== "string" ||
      s.diagnosis.evidence.length > 4000 ||
      typeof s.diagnosis.reviewRequired !== "boolean" ||
      !["jev", "generative-baseline", "laya"].includes(
        String(s.diagnosis.decisionProvider),
      ))
  )
    return false;
  if (
    s.feedback !== null &&
    (!obj(s.feedback) ||
      !text(s.feedback.text, 1200) ||
      !sources(s.feedback.sourceIds))
  )
    return false;
  if (obj(s.diagnosis) && s.diagnosis.reviewRequired && s.feedback !== null)
    return false;
  if (value.lesson !== null) {
    const l = value.lesson;
    if (
      !obj(l) ||
      !text(l.title, 200) ||
      !text(l.keyIdea, 2000) ||
      !text(l.workedExample, 4000) ||
      !Array.isArray(l.steps) ||
      l.steps.length < 1 ||
      l.steps.length > 10 ||
      !l.steps.every((step) => text(step, 1000)) ||
      !sources(l.sourceIds)
    )
      return false;
  }
  return true;
}
export const coachStatusLabels = {
  clarify: "Exploring your reasoning",
  verify: "Ready for a new question",
  retry: "Guided retry",
  verified: "Understanding checked",
  needsPractice: "Keep practising",
  needsClarification: "Keep exploring",
} as const;
