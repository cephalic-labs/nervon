# Nervon

A self-guided Classical Genetics learning coach. Explain an answer; Nervon asks
focused diagnostic questions when needed, teaches from a subject knowledge base,
and checks the idea in another question.

## What works

- Three genetics concepts, six questions and twelve diagnostic probes.
- Jev reasoning decisions and DeepSeek source-grounded feedback through OpenRouter.
- Up to two clarifications, followed by teaching and a different same-concept check.
- One guided retry after an unsuccessful check; unresolved reasoning receives a
  concrete self-study plan without a false claim of understanding.
- Resumable conversations and personal **Progress**, including previous-version
  history. `/educator` redirects to `/progress`; no educator action is required.
- Responsive shadcn Base UI controls, attributed reading and visible errors.

The knowledge base is deliberately limited to the demo's three concepts. Questions,
probes and worked examples are authored material; diagnoses and checks use live
models. Authored scaffolds are labelled separately from model feedback. There is
no LMS, student database or general-purpose textbook retrieval service.

## Setup

Use Node.js 24.21 or later in the Node 24 line and npm.

```sh
npm ci
cp .env.example .env.local
openssl rand -hex 32
npm run dev
```

Put an OpenRouter key in `OPENROUTER_API_KEY` and the generated secret in
`ATTEMPT_SIGNING_SECRET`. Open [localhost:3000](http://localhost:3000).
Do not commit `.env.local` or expose secrets with `NEXT_PUBLIC_`.

Defaults: `OPENROUTER_JEV_MODEL=typesafe/jev-1.13` and
`OPENROUTER_GENERATIVE_MODEL=deepseek/deepseek-v4.1-flash`.
`stealth/space-bunny-alpha` is an explicit alternative, not an automatic fallback;
it has not been accepted with this course. There are no application retries.
Jev has a 10-second timeout; each generative request has a 30-second timeout.

## Checks

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
npx playwright install chromium
# With the local app running:
npm run test:e2e
```

46 offline tests cover course privacy, knowledge integrity, provider validation,
legacy contracts, tokens, adaptive transitions, history integrity and persistence.
18 Chromium browser tests cover desktop (1440px), phone (390px), narrow phone
(320px), accessibility scans, keyboard submission, clarification, guided retry,
errors, reset, cross-tab updates and selecting older conversations. Browser tests
intercept requests with explicit development fixtures; they do not use live models.
Screenshots and failure traces go to ignored `test-results/`.

Explicit live checks (incur model usage; separate from offline tests):

```sh
npm run smoke:coach     # Clarification → revised diagnosis; uncertainty → guided retry
npm run smoke:journey   # Fresh live browser conversation and saved personal progress
npm run smoke:analyze   # Six original single-turn adapter regression examples
```

Use `NERVON_SMOKE_BASE_URL=http://localhost:3003` for another local port.
`smoke:coach` and `smoke:analyze` exit 2 if local credentials are missing; acceptance
failures exit nonzero. These synthetic examples validate integration, not accuracy
or learning impact. Build-time Geist font downloads require network access.

## Knowledge and state

`data/classical-genetics-course.json` contains private question keys and rubrics.
`data/genetics-knowledge.json` adds prerequisites, question-specific diagnostic
probes, worked examples and step-by-step plans with existing source IDs. Retrieval
is a server-side lookup by concept and question, not arbitrary generated content.

The `/api/coach` endpoint assesses the latest explanation with the ordered dialogue
as context. An uncertain candidate can select a probe but cannot become a confirmed
diagnosis. Malformed output, invented evidence, unknown sources and teacher-handoff
feedback fail visibly. See [the API handoff](docs/build/API-CONTRACT.md) and
[coaching design](docs/build/COACH-LOOP.md).

Continuation tokens authenticate a digest of the exact conversation state and
expire after two hours from the first answer. Tokens contain no student text or
answer keys; the public transcript travels separately and is checked before any
provider request. Rotating the signing secret invalidates continuations. They are
not authentication or proof of educational mastery. Replays are allowed within
expiry; one entry per conversation prevents duplicate progress counts.

Up to 20 coaching conversations (including answers and explanations) are saved in
this browser, alongside up to 50 earlier attempts. Reset clears both. Unsubmitted
form drafts are not saved. Blocked browser storage uses memory with a visible
warning. Use synthetic inputs only; no real student records belong in this demo.

## Sources and disclosure

Course snippets and new learning scaffolds are authored adaptations of
**OpenStax Biology 2e, OpenStax / Rice University**:

- [12.2 Characteristics and Traits](https://openstax.org/books/biology-2e/pages/12-2-characteristics-and-traits)
- [12.3 Laws of Inheritance](https://openstax.org/books/biology-2e/pages/12-3-laws-of-inheritance)

Retain attribution and [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
terms for adapted content. Content and diagnoses are not independently validated.
Complete dominance and unlinked-gene assumptions apply where stated. Immediate
success does not establish lasting recall. Future validation should use consented
examples, independent subject-expert labels, unseen scenarios and delayed recall;
this is separate from the autonomous student workflow.

Public Next.js, React, TypeScript, Tailwind, shadcn/Base UI, Lucide, Playwright and
axe packages retain their respective licenses. No private pre-challenge team code,
LMS connection, deployment or remote push is part of this implementation.

## Presentation

Open `/demo` or use the [one-slide PDF](docs/demo/nervon-day-1.pdf).
`npm run slide:export` regenerates it from the running app using Chromium.
See the [seven-minute rehearsal and acceptance report](docs/demo/REHEARSAL.md).
