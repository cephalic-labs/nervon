import assert from "node:assert/strict";
import { test } from "node:test";
import pack from "../data/classical-genetics-course.json" with { type: "json" };
import {
  analyzeRequest,
  reasoningExamples,
  supportedDiagnosis,
  uncertainty,
  verifyRequest,
  verified,
  apiError,
} from "./fixtures/learner-contracts.ts";

test("development examples stay aligned with real course IDs and rubrics", () => {
  assert.equal(analyzeRequest.courseId, pack.courseId);
  for (const example of reasoningExamples) {
    const question = pack.concepts.flatMap((concept) => concept.questions)
      .find((candidate) => candidate.id === example.questionId);
    assert.ok(question, `Unknown fixture question: ${example.questionId}`);
    assert.ok(question.diagnosticRubric.some((entry) => entry.label === example.expectedLabel));
  }
  const concept = pack.concepts.find((candidate) => candidate.id === supportedDiagnosis.conceptId);
  const next = concept.questions.find((question) => question.id === supportedDiagnosis.nextQuestion.id);
  assert.equal(supportedDiagnosis.nextQuestion.prompt, next.prompt);
  assert.notEqual(next.id, analyzeRequest.questionId);
  for (const id of supportedDiagnosis.feedback.sourceIds) {
    assert.ok(concept.sources.some((source) => source.id === id));
  }
  assert.equal(verifyRequest.nextQuestionId, next.id);
  assert.equal(verified.status, "verified");
  assert.equal(uncertainty.diagnosis.reviewRequired, true);
  assert.equal(uncertainty.feedback, null);
  assert.equal(uncertainty.nextQuestion, null);
  assert.equal(apiError.error.code, "INVALID_REQUEST");
  assert.ok(supportedDiagnosis.attemptId.startsWith("DEVELOPMENT_ONLY"));
});
