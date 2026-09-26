# Nervon build specification — autonomous learning revision

**Product:** Self-guided university learning coach.
**Demo subject:** Classical Genetics (Biology).
**Event:** Builders Pitch Fest, EdTech AI track, 26 September 2026.
**Original event cutoff:** Working prototype, one slide and uploaded code by 4:30 pm IST.

## Problem and scope

A score does not reveal why a student is confused. Nervon gathers evidence through
explained answers and targeted diagnostic questions, teaches from subject-specific
material, and checks the idea through further practice. No teacher handoff is part
of the learning loop. Personal learning progress replaces the educator dashboard.

Three concepts: genotype/phenotype and complete dominance; segregation and
monohybrid crosses; independent assortment of unlinked genes. Keep six original
questions and add twelve diagnostic probes, prerequisites, sourced worked examples
and study steps. These are challenge-authored synthetic materials, not validated
university content. No real student data, LMS, database or Laya integration.

## Required loop

1. Student supplies an answer and explanation.
2. Jev proposes a rubric-based reasoning decision. Unsupported evidence triggers
   an unused subject-specific diagnostic question, not a confident diagnosis.
3. Reassess using the latest explanation as primary evidence, with the entire
   ordered dialogue as context. Later explicit corrections can resolve earlier gaps.
4. Supported reasoning receives live generative feedback grounded in source IDs.
5. After at most two unresolved probes, disclose uncertainty and teach a sourced
   foundational example. Do not infer a misconception without evidence.
6. Select the other question in the same concept; models do not invent checks.
7. A failed or unclear check gets a worked example and one guided retry. Finish
   with either an immediate verified response or a self-study plan. Never claim
   lasting mastery and never depend on educator intervention.
8. Save the conversation to personal Progress, with resume, cross-tab sync and reset.

## Architecture

Next.js App Router / React / TypeScript, responsive Tailwind and shadcn Base UI.
`lib/course.ts` supplies only public course projections. Private JSON keys/rubrics
and the knowledge lookup remain server-only. Jev uses OpenRouter Decisions API;
DeepSeek V4.1 Flash uses strict structured output and local validation. A live
baseline fallback is disclosed; provider failures never become static AI results.
Authored scaffolds are explicitly labelled knowledge-base material.

`POST /api/coach` orchestrates the bounded conversation. Continuation tokens bind
an exact transcript/state digest to a two-hour expiry and current course/knowledge
versions. No learner text or answer keys enter token payloads. Routine logs omit
text, secrets and tokens. The API always returns no-store responses and safe errors.

The legacy single-turn endpoints remain compatibility primitives. Their old
uncertainty enum is not a human workflow. `/educator` redirects to `/progress`.
The earlier synthetic cohort file is unused by the learner experience.

## Acceptance

- [x] Unclear reasoning triggers a targeted diagnostic question.
- [x] New explanatory evidence can change the live diagnosis.
- [x] Repeated uncertainty leads to source-backed teaching and practice.
- [x] Failed verification supports a guided retry without claiming success.
- [x] No teacher/educator referral is presented in the learner journey.
- [x] Personal conversation history survives reload, supports exact resume and reset.
- [x] Sources resolve and private keys/rubrics remain server-side.
- [x] Invalid continuations and malformed provider output fail visibly.
- [x] Responsive browser journeys and accessibility checks pass.
- [x] Exactly one slide describes the autonomous loop and future validation.

The team still handles event upload and live presentation. No remote push is
performed automatically. See [API-CONTRACT.md](API-CONTRACT.md),
[COACH-LOOP.md](COACH-LOOP.md) and [the rehearsal report](../demo/REHEARSAL.md).
