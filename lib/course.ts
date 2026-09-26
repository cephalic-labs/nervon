import "server-only";

import courseData from "../data/classical-genetics-course.json" with { type: "json" };
import type { PublicCourse, PublicQuestion, PublicSource } from "./contracts";

/** Private assessment data. Call only from Server Components or Route Handlers. */
export function getCourse(courseId: string) {
  if (courseId !== courseData.courseId) {
    throw new Error(`Unknown course: ${courseId}`);
  }
  return courseData;
}

export function getQuestion(courseId: string, questionId: string) {
  const course = getCourse(courseId);
  for (const concept of course.concepts) {
    const question = concept.questions.find((candidate) => candidate.id === questionId);
    if (question) return { concept, question };
  }
  throw new Error(`Unknown question: ${questionId}`);
}

function publicQuestion(question: { id: string; prompt: string }): PublicQuestion {
  return { id: question.id, prompt: question.prompt };
}

function publicSource(source: (typeof courseData.concepts)[number]["sources"][number]): PublicSource {
  if (source.reviewStatus !== "pending-educator-review") {
    throw new Error("Unsupported source review status");
  }
  return {
    id: source.id,
    text: source.text,
    title: source.title,
    url: source.url,
    attribution: source.attribution,
    license: source.license,
    licenseUrl: source.licenseUrl,
    reviewStatus: source.reviewStatus,
  };
}

/** Allowlist every field; never spread private course/concept/question objects. */
export function getPublicCourse(courseId: string): PublicCourse {
  const course = getCourse(courseId);
  if (course.courseId !== "classical-genetics" || course.reviewStatus !== "pending-educator-review") {
    throw new Error("Unsupported course metadata");
  }
  return {
    schemaVersion: course.schemaVersion,
    version: course.version,
    courseId: course.courseId,
    title: course.title,
    disclosure: course.disclosure,
    reviewStatus: course.reviewStatus,
    concepts: course.concepts.map((concept) => ({
      id: concept.id,
      title: concept.title,
      learningObjective: concept.learningObjective,
      sources: concept.sources.map(publicSource),
      questions: concept.questions.map(publicQuestion),
    })),
  };
}

/** With two questions per concept, either question pairs with the other. */
export function getVerificationQuestion(courseId: string, originalQuestionId: string): PublicQuestion {
  const { concept } = getQuestion(courseId, originalQuestionId);
  const next = concept.questions.find((question) => question.id !== originalQuestionId);
  if (!next) throw new Error(`No verification question for: ${originalQuestionId}`);
  return publicQuestion(next);
}
