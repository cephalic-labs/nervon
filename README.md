# Nervon

A university learning-coach prototype for Builders Pitch Fest, EdTech AI track.
The sample course is **Classical Genetics (Biology)**. The intended loop is an
explained answer → possible concept diagnosis → source-grounded feedback → a
different question → verification → a local session and educator summary.

## Current milestone

Implemented: versioned course pack with three concepts and six questions,
question-specific rubrics and verification keys, attributed snippets, shared API
types, a server-only course reader, safe public projections, and development tests.

Not yet implemented: live `/api/analyze` and `/api/verify`, model adapters, token
signing, local session persistence, or synthetic cohort data. Existing pages are
layout scaffolds and still show Statistics content. Their feedback is placeholder
text, not AI inference. Do not present this milestone as the finished demo.

## Local setup

Use **Node.js 24.21 or later in the Node 24 release line** and npm. The tests use
Node's native TypeScript stripping, module hooks, and built-in test runner.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). The current scaffold runs without
credentials. Populate server-only environment values when the live endpoints are
implemented; never prefix secrets with `NEXT_PUBLIC_` or commit `.env.local`.

- `JEV_API_KEY`: future Jev adapter credential.
- `ATTEMPT_SIGNING_SECRET`: future token-signing secret; use at least 32 random
  bytes when signing is implemented. Rotate it to invalidate outstanding tokens.
- Generative-provider settings will be defined when that provider is selected.

## Checks

```sh
npm test
npm exec next typegen
npx tsc --noEmit
npx eslint lib tests
npm run lint
npm run build
```

Six focused tests cover course completeness, unique IDs, source links, fixture
consistency, public projection privacy and copy isolation, paired verification
questions, and unknown IDs. The test-only module hook resolves `server-only` to
Next's server marker; it does not change app behavior. A Node module-format warning
may appear because the existing scaffold does not declare an ESM package type.

Validation at this milestone: tests, TypeScript, and targeted lint passed. Full
repo lint finds three existing `react/no-unescaped-entities` errors in
`components/FeedbackPanel.tsx`; Yaazh should escape the placeholder punctuation.
The production build passed using `npm run build -- --webpack`. Turbopack's
build worker could not bind a port in the implementation environment. The existing
Geist font setup also requires network access to Google Fonts during builds.

## Integration handoff

- Read [the build spec](docs/build/SPEC.md) and [the API contract](docs/build/API-CONTRACT.md).
- Import browser-safe types and limits from `lib/contracts.ts`.
- Import `getPublicCourse("classical-genetics")` from `lib/course.ts` only in a
  Server Component or Route Handler. Pass its returned data to interactive UI.
- Use private `getCourse` and `getQuestion` only in server-side assessment code.
  `getQuestion` returns `{ concept, question }`; never serialize that object.
- `getVerificationQuestion(courseId, originalQuestionId)` returns the other
  question in the same concept, containing only ID and prompt. Unknown IDs throw;
  future handlers must map invalid request IDs to HTTP 400.
- Never import the course JSON directly into client modules. Answer keys,
  required reasoning, diagnostic rubrics, and verification rubrics are private.
- Development fixtures under `tests/fixtures` contain invalid placeholder tokens
  and authored expectations. They are not imported by the app and must never be
  served as live AI results.

For Yaazh: replace Statistics text in the course entry, learner question, and
educator summary; connect course metadata and questions through the public
projection; show the synthetic-content disclosure. Then implement live endpoint
connections and local session state in their respective later milestones.

## Content, sources, and disclosure

The course pack is `data/classical-genetics-course.json`, schema version 1,
content version 1.0.0, course ID `classical-genetics`. It covers genotype/phenotype
and complete dominance, segregation and monohybrid crosses, and independent
assortment for unlinked genes. Questions use explicit synthetic model assumptions;
expected probabilities do not guarantee exact counts in small samples.

Questions, rubrics, and test examples are challenge-authored and synthetic.
Snippets are short authored summaries checked against **OpenStax Biology 2e,
OpenStax / Rice University**:

- [12.2 Characteristics and Traits](https://openstax.org/books/biology-2e/pages/12-2-characteristics-and-traits)
- [12.3 Laws of Inheritance](https://openstax.org/books/biology-2e/pages/12-3-laws-of-inheritance)

The textbook uses [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
Attribute these sources and retain those terms for the adapted snippets; verify
reuse terms before use beyond this demo. This is a content attribution, not a
blanket license for the repository. All content is **pending educator review**;
do not describe it as university-approved material or validated diagnostic data.

No private pre-challenge team code or real student records are included in this
foundation. The scaffold uses public Next.js, React, TypeScript, and Tailwind
packages; installed package licenses remain applicable. No LMS, registrar,
payment, placement, or student-record integration exists.

A diagnosis is a hypothesis from a student's explanation, and insufficient
evidence requires clarification or educator review. Live model confidence is not
validated educational accuracy; immediate verification is not lasting learning.

The event deliverables are a working prototype, exactly one slide, and uploaded
code by **26 September 2026, 4:30 pm IST**. Laya remains outside the critical path.
