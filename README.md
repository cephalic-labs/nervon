# Nervon

A university learning-coach prototype for Builders Pitch Fest, EdTech AI track.
The sample course is **Classical Genetics (Biology)**. The intended loop is an
explained answer → possible concept diagnosis → source-grounded feedback → a
different question → verification → a local session and educator summary.

## Current milestone

Implemented: versioned course pack with three concepts and six questions,
question-specific rubrics and verification keys, attributed snippets, shared API
types, a server-only course reader, safe public projections, and development tests.
The second milestone adds `/api/analyze`, validated OpenRouter Jev and generative
adapters, input validation, grounded feedback checks, and signed attempt tokens.

Not yet implemented: `/api/verify`, token signature verification, local session
persistence, or synthetic cohort data. Live model acceptance is pending credentials.
Existing pages are
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

Open [localhost:3000](http://localhost:3000). The current screens render without
credentials, but analyze requires both the OpenRouter key and signing secret.
Populate these server-only values before calling analyze; never prefix secrets
with `NEXT_PUBLIC_` or commit `.env.local`.

- `OPENROUTER_API_KEY`: one server-only credential for both model adapters.
- `OPENROUTER_JEV_MODEL`: defaults to `typesafe/jev-1.13`.
- `OPENROUTER_GENERATIVE_MODEL`: defaults to `deepseek/deepseek-v4.1-flash`.
  Set `stealth/space-bunny-alpha` to explicitly select the preview alternative.
  There is no automatic generative-model switching.
- `ATTEMPT_SIGNING_SECRET`: use at least 32 random bytes, encoded as hex or
  base64. The server rejects values shorter than 32 UTF-8 bytes after trimming.
  Rotate it to invalidate outstanding tokens when verify is implemented.

## Checks

```sh
npm test
npm exec next typegen
npx tsc --noEmit
npx eslint lib tests scripts app/api
npm run lint
npm run build
```

Eighteen offline tests cover the course foundation plus model transport, response
validation, timeouts, request limits, fallback, review states, evidence quotations,
source checks, signed token contents, and privacy. The test-only module hook
resolves `server-only` to
Next's server marker; it does not change app behavior. A Node module-format warning
may appear because the existing scaffold does not declare an ESM package type.

Validation at this milestone: tests, TypeScript, and targeted lint passed. Full
repo lint finds three existing `react/no-unescaped-entities` errors in
`components/FeedbackPanel.tsx`; Yaazh should escape the placeholder punctuation.
The production build passed using `npm run build -- --webpack`. Turbopack's
build worker could not bind a port in the implementation environment. The existing
Geist font setup also requires network access to Google Fonts during builds.

## Explicit live acceptance check

Fill `.env.local` with the OpenRouter key and a signing secret, then restart the
app to load them. With the server running in another terminal:

```sh
npm run smoke:analyze
```

Use `NERVON_SMOKE_BASE_URL=http://localhost:3001` for a different local port.
This command makes real synthetic-data requests through `/api/analyze` and may
incur OpenRouter charges. It is separate from `npm test`, which never calls live
providers. Missing credentials yield exit code 2 and no requests; failed checks
or diagnostic mismatches yield 1; passing checks yield 0.

Results include expected/actual labels, provider, review state, end-to-end latency,
and request ID. Correlate request IDs with server logs for actual model IDs,
per-call latency, Jev distributions, and available usage metrics. A mismatch needs
manual review; these examples cannot establish diagnostic accuracy. The smoke
script sends authored student explanations, never canned model responses.

At implementation time neither credential was configured, so live acceptance is
**pending**. DeepSeek and Space Bunny structured-output compatibility and actual
course behavior must be confirmed by the smoke run before the judged demo.

## Integration handoff

- Read [the build spec](docs/build/SPEC.md) and [the API contract](docs/build/API-CONTRACT.md).
- Import browser-safe types and limits from `lib/contracts.ts`.
- Import `getPublicCourse("classical-genetics")` from `lib/course.ts` only in a
  Server Component or Route Handler. Pass its returned data to interactive UI.
- Use private `getCourse` and `getQuestion` only in server-side assessment code.
  `getQuestion` returns `{ concept, question }`; never serialize that object.
- `getVerificationQuestion(courseId, originalQuestionId)` returns the other
  question in the same concept, containing only ID and prompt. Unknown IDs throw;
  analyze maps invalid request IDs to HTTP 400.
- Never import the course JSON directly into client modules. Answer keys,
  required reasoning, diagnostic rubrics, and verification rubrics are private.
- Development fixtures under `tests/fixtures` contain invalid placeholder tokens
  and authored expectations. They are not imported by the app and must never be
  served as live AI results.

For Yaazh: replace Statistics text in the course entry, learner question, and
educator summary; connect course metadata and questions through the public
projection; show the synthetic-content disclosure. Connect the answer/explanation
form to `POST /api/analyze` using the existing
shared contracts. Review responses have no feedback or next question; supported
responses provide both. Display `decisionProvider` so fallback is disclosed.
Verification submission and educator aggregation remain later milestones.

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
