# Learner API handoff

`POST /api/coach` is the current learner API. It implements autonomous clarification,
subject-grounded teaching and guided practice. No human review is required to
continue. Browser-safe types are in `lib/contracts.ts`.

## POST /api/coach

First request: `{courseId, questionId, answer, explanation, localSessionId}`.
Next request: `{answer, explanation, continuation: {state, token}}`, where `state`
and `continuationToken` come from the previous response. The browser must preserve
state exactly; it must not edit history, diagnosis, stage, question or session ID.

Response: `{state, continuationToken, message, lesson}`. State includes a stable
conversation `id`, course and knowledge versions, original question/session IDs,
issue time, ordered `turns`, `phase`, `pending` question, tentative `diagnosis`,
`feedback`, and `result`. `lesson` is either null or an explicitly authored,
sourced key idea, worked example and study plan from the knowledge base.

| Phase | Student action | Transition |
| --- | --- | --- |
| clarify | Answer a focused diagnostic probe | Reassess; another distinct probe or teaching/check |
| verify | Answer the different same-concept question | Complete if verified, otherwise guided retry |
| retry | Apply the worked example to the same check | Complete with verified, needsPractice or needsClarification |
| complete | Read the result and choose further practice | No continuation token; start a new conversation |

At most two probes and one retry, for five sequential answers. Unresolved evidence
never forces a diagnosis or a success claim. Initial reviewRequired means the
reasoning is uncertain; it triggers questions or foundations, not an educator.
A successful second-question check does not retroactively validate an uncertain
initial diagnosis or prove retention.

Latest reasoning is primary model evidence; earlier prompts, answers and
explanations remain ordered context. Probe selection uses the question and an
uncertain candidate hypothesis where available, without asserting that candidate
as fact. Exact evidence and source checks remain mandatory. Jev failure uses one
disclosed live generative fallback. Teaching failures and generated human handoffs
are visible HTTP 502 failures, never canned model feedback.

Input limits after trimming: answer 2,000, explanation 4,000, session ID 128,
continuation token 2,048 characters. Request JSON is limited to 100,000 characters;
serialized continuation state to 60,000. IDs and required fields are validated
before inference. A bad continuation is `400 INVALID_ATTEMPT`; other errors use
the envelope and codes below. All responses carry no-store and X-Request-Id.

The continuation token authenticates a SHA-256 state digest using HMAC-SHA256 with
a `nervon-coach-v1:` domain prefix. Its base64url JSON payload has `version: 1`,
`digest`, `issuedAt` and `expiresAt`; the second dot-separated part is its signature.
It contains no learner text, private keys or rubric criteria. Signature comparison
is timing-safe. Expiry is fixed at the first answer + 7,200 seconds. State/version
changes, future issue times, expiration and completed states are rejected before
provider calls. Replay within expiry is allowed; this is not authentication.

## Compatibility primitives

The original endpoints below remain available for existing tests/integrations.
Their legacy uncertainty names do not create human workflow. The current browser
calls `/api/coach` exclusively and maps uncertainty to self-guided next steps.

## POST /api/analyze

Accept `courseId: "classical-genetics"`, `questionId`, `answer`, `explanation`,
and `localSessionId`. Return the spec's `attemptId`, `conceptId`, `diagnosis`,
`feedback`, and `nextQuestion` fields with HTTP 200.

Assess reasoning, not just the final answer. An incorrect explanation paired with
a correct answer may still support a misconception diagnosis. For insufficient,
ambiguous, unrelated, or contradictory evidence that prevents a defensible
diagnosis, return `reviewRequired: true`, `feedback: null`, and `nextQuestion: null`.
Legacy callers must treat this as uncertainty. Otherwise return grounded
feedback with source IDs belonging to the concept and a different question within
that concept. Jev failure may use a live generative fallback labelled
`decisionProvider: "generative-baseline"`. Never serve development fixtures here.

## POST /api/verify

Accept `attemptId`, `nextQuestionId`, `answer`, and `explanation`.
Return HTTP 200 with `status: "verified" | "needsPractice" | "educatorReview"`
and `reason`, and no other fields. Send the private question's verification rubric
and required reasoning points to the model, and let that rubric decide the status:
the model must not substitute its own thresholds, and equivalent notation or
wording still satisfies a criterion. Sufficient evidence of a reasoning error
means needsPractice, while uncertainty means educatorReview.
Immediate success is not proof of lasting learning. The browser stores the result.

## Stateless attempt binding

Analyze returns `attemptId` as an opaque token signed with server-only `ATTEMPT_SIGNING_SECRET`.
The client must never decode or manufacture it. Define the signed payload as:

```ts
type AttemptPayload = {
  tokenVersion: 1;
  courseId: "classical-genetics";
  coursePackVersion: string;
  originalQuestionId: string;
  nextQuestionId: string | null;
  localSessionId: string;
  issuedAt: number;  // Unix seconds
  expiresAt: number; // issuedAt + 7200
};
```

Use HMAC-SHA256 over a base64url JSON payload and append the base64url signature,
separated by a period. Verify signatures with a timing-safe comparison before
trusting payload fields. Signing does not encrypt the payload: include no student
responses, answer keys, rubrics, or API keys. The session ID is a random demo ID,
not a real student identity or authentication mechanism.

The verify handler validates payload shape, supported token version, timestamps, a
timing-safe signature, expiry, and the submitted `nextQuestionId` matching the
assigned ID. Review attempts with a null next question cannot be verified. Altered,
expired, malformed, or mismatched tokens get HTTP 400. Tokens must match the current
course-pack version and deterministic same-concept question pair. Future-issued
tokens, unexpected payload fields, and lifetimes other than exactly 7,200 seconds
are rejected; expiration is inclusive. Local verification is stateless and permits
replay until expiry; the UI replaces a result for the same attempt instead of
counting repeated submissions as new learning. No server student database exists.

## Boundary validation and errors

Require a JSON object with required string fields. Trim inputs before validating;
answer and explanation must be nonempty. Maximum character lengths: answer 2,000,
explanation 4,000, session ID 128, attempt token 4,096. Require a nonempty session
ID on analyze and a nonempty token on verify. Validate course and question IDs
against the private course pack. Do not call providers for malformed input.

All failures return `{ error: { code, message } }` with a safe, user-facing message:

| HTTP | Code | Situation |
| --- | --- | --- |
| 400 | INVALID_REQUEST | Malformed body, invalid field, limit violation, or unknown ID |
| 400 | INVALID_ATTEMPT | Invalid, expired, altered, or mismatched attempt token |
| 502 | PROVIDER_FAILURE | Provider call or structured output validation fails, with no successful disclosed live fallback |
| 500 | CONFIGURATION_ERROR | Missing server configuration or unusable course data |

Validate provider output and feedback source IDs before returning them. Do not
expose exception details, raw provider responses, secrets, or assessment keys.

## OpenRouter behavior

Both adapters use native server-side fetch and one `OPENROUTER_API_KEY`.
Jev defaults to `typesafe/jev-1.13` at `/api/alpha/decisions`; the generative adapter
defaults to `deepseek/deepseek-v4.1-flash` at `/api/v1/chat/completions`.
`OPENROUTER_GENERATIVE_MODEL=stealth/space-bunny-alpha` explicitly selects the
alternative. There is no automatic switching between generative models.

Jev gets the selected question, key, required reasoning, rubric, and student
response, with separate pattern and evidence-sufficiency choice questions.
Probabilities are validated and logged, not used as validated educational scores.
Review states skip teaching. Supported decisions receive a generative consistency
check, exact evidence quotation, and short feedback grounded only in concept
snippets. Jev failure invokes one structured generative diagnosis and feedback
call. Feedback failure never retries as baseline. All generative calls require
JSON Schema support (`strict: true`, `provider.require_parameters: true`), and
output is validated locally. Unsupported structured output is a provider failure.

Jev times out after 10 seconds; each generative call after 30 seconds. There are
no application retries. No inference result is cached. Success and error responses
carry `Cache-Control: no-store` and a generated `X-Request-Id`.
Server logs contain request/question IDs, model IDs, per-call latency, fallback
state, safe numeric usage fields, and Jev distributions. They omit student text,
credentials, attempt tokens, and raw provider responses.
Failures also log a safe reason code and the upstream HTTP status when available;
for example, `TIMEOUT`, `HTTP_ERROR`, `INVALID_EVIDENCE`, or `INVALID_SOURCE_IDS`.
The public error response is unchanged.

Run `npm run smoke:analyze` against the running local app once credentials are
configured. Its six synthetic inputs exercise real inference and report expected
and actual labels, review state, provider, request ID, and end-to-end latency.
Use request IDs to find actual model IDs and per-call metrics in server logs.
The command exits 2 when credentials are missing, 1 on failed checks or diagnostic
mismatches requiring review, and 0 when checks pass. Honest uncertainty is allowed.

Sources: [Decisions API](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request)
and [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

## Development examples

`tests/fixtures/learner-contracts.ts` contains typed synthetic response fixtures
and reasoning examples. They are disconnected from app imports and are not
prewritten live AI results. Use them to develop the UI and manually evaluate
providers once live inference exists; they do not establish diagnostic accuracy.


## Browser integration

Personal Progress and Practice share `nervon-session-v1`. Up to 20 coaching
conversations retain the public transcript (answers and explanations), feedback,
continuation and final check, alongside earlier attempt records. Every update
replaces the same conversation ID. The browser checks response shape, session and
course binding, pending-question membership and source IDs before saving.

Selecting a history row resumes that exact conversation. Reload preserves completed
steps; unsubmitted drafts are not saved. Reset creates a new random session and
clears both old and new records; in-flight results from a reset session are rejected.
Storage events synchronize tabs; blocked storage uses memory with a visible notice.
The previous educator URL redirects to personal progress. The fixed synthetic
cohort is no longer displayed or combined with learner data.

`npm run smoke:coach` exercises live clarification and guided retry paths.
`npm run smoke:journey` drives a fresh live browser conversation and persistence.
`npm run test:e2e` uses explicitly intercepted development responses instead;
these are not imported or served by the app.
