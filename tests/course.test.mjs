import assert from "node:assert/strict";
import { test } from "node:test";
import pack from "../data/classical-genetics-course.json" with { type: "json" };
import {
  getCourse,
  getQuestion,
  getPublicCourse,
  getVerificationQuestion,
} from "../lib/course.ts";

test("course pack has complete assessment content and unique IDs", () => {
  assert.equal(pack.concepts.length, 3);
  const ids = new Set();
  for (const concept of pack.concepts) {
    assert.ok(concept.learningObjective);
    assert.equal(concept.questions.length, 2);
    for (const item of [concept, ...concept.sources, ...concept.questions]) {
      assert.ok(!ids.has(item.id), `Duplicate ID: ${item.id}`);
      ids.add(item.id);
    }
    for (const source of concept.sources) {
      assert.equal(new URL(source.url).hostname, "openstax.org");
      assert.ok(source.attribution && source.license && source.text);
    }
    for (const question of concept.questions) {
      assert.ok(question.referenceAnswer);
      assert.ok(question.requiredReasoning.length);
      assert.ok(question.diagnosticRubric.length);
      for (const label of ["sound-reasoning", "unrelated-reasoning", "insufficient-evidence"]) {
        assert.ok(question.diagnosticRubric.some((entry) => entry.label === label));
      }
      assert.deepEqual(Object.keys(question.verificationRubric).sort(), ["educatorReview", "needsPractice", "verified"]);
      assert.ok(question.sourceIds.length);
      for (const id of question.sourceIds) {
        assert.ok(concept.sources.some((source) => source.id === id));
      }
    }
  }
});

test("public data uses an allowlist and excludes all private assessment content", () => {
  const course = getPublicCourse("classical-genetics");
  assert.equal(course.title, pack.title);
  assert.equal(course.disclosure, pack.disclosure);
  for (const concept of course.concepts) {
    assert.deepEqual(Object.keys(concept).sort(), ["id", "learningObjective", "questions", "sources", "title"]);
    for (const question of concept.questions) {
      assert.deepEqual(Object.keys(question).sort(), ["id", "prompt"]);
    }
  }
  const serialized = JSON.stringify(course);
  for (const concept of pack.concepts) {
    for (const question of concept.questions) {
      assert.ok(!serialized.includes(question.referenceAnswer));
      assert.ok(!serialized.includes(JSON.stringify(question.diagnosticRubric)));
    }
  }
  for (const key of ["referenceAnswer", "requiredReasoning", "diagnosticRubric", "verificationRubric"]) {
    assert.ok(!serialized.includes(`"${key}"`));
  }
});

test("public objects do not share mutable references with private course data", () => {
  const projected = getPublicCourse("classical-genetics");
  projected.concepts[0].sources[0].text = "Changed by a consumer";
  projected.concepts[0].questions[0].prompt = "Changed by a consumer";
  const fresh = getPublicCourse("classical-genetics");
  assert.equal(fresh.concepts[0].sources[0].text, pack.concepts[0].sources[0].text);
  assert.equal(fresh.concepts[0].questions[0].prompt, pack.concepts[0].questions[0].prompt);
});

test("each question pairs with the other question in its own concept", () => {
  for (const concept of pack.concepts) {
    for (const original of concept.questions) {
      const { concept: foundConcept, question } = getQuestion(pack.courseId, original.id);
      assert.equal(foundConcept.id, concept.id);
      assert.equal(question.id, original.id);
      const next = getVerificationQuestion(pack.courseId, original.id);
      assert.notEqual(next.id, original.id);
      assert.ok(concept.questions.some((candidate) => candidate.id === next.id));
      assert.equal(getVerificationQuestion(pack.courseId, next.id).id, original.id);
      assert.deepEqual(Object.keys(next).sort(), ["id", "prompt"]);
    }
  }
});

test("unknown course and question IDs fail explicitly", () => {
  assert.throws(() => getCourse("intro-stats"), /Unknown course/);
  assert.throws(() => getPublicCourse("missing"), /Unknown course/);
  assert.throws(() => getQuestion(pack.courseId, "missing"), /Unknown question/);
  assert.throws(() => getVerificationQuestion(pack.courseId, "missing"), /Unknown question/);
});
