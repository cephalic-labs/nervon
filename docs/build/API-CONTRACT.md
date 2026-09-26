# Learner API handoff

Status: `/api/analyze`, OpenRouter adapters, and attempt signing are implemented.
`/api/verify` and signature verification remain the next milestone. Live model
acceptance is pending local credentials and the explicit smoke test.
Shared browser-safe types live in `lib/contracts.ts`.

## POST /api/analyze

Accept `courseId: "classical-genetics"`, `questionId`, `answer`, `explanation`,
and `localSessionId`. Return the spec's `attemptId`, `conceptId`, `diagnosis`,
`feedback`, and `nextQuestion` fields with HTTP 200.

Assess reasoning, not just the final answer. An incorrect explanation paired with
a correct answer may still support a misconception diagnosis. For insufficient,
ambiguous, unrelated, or contradictory evidence that prevents a defensible
diagnosis, return `reviewRequired: true`, `feedback: null`, and `nextQuestion: null`.
The UI requests clarification or educator review. Otherwise return grounded
feedback with source IDs belonging to the concept and a different question within
that concept. Jev failure may use a live generative fallback labelled
`decisionProvider: "generative-baseline"`. Never serve development fixtures here.

## POST /api/verify

Accept `attemptId`, `nextQuestionId`, `answer`, and `explanation`.
Return HTTP 200 with `status: "verified" | "needsPractice" | "educatorReview"`
and `reason`. Use the private question's verification rubric; sufficient evidence
of a reasoning error means needsPractice, while uncertainty means educatorReview.
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

The future verify handler must validate payload shape, supported token version, timestamps,
signature, expiry, current course-pack version, both question IDs, same-concept
pairing, and the submitted `nextQuestionId` matching the assigned ID. Review
attempts with a null next question cannot be verified. Altered, expired, malformed,
or mismatched tokens get HTTP 400. Local verification is stateless and permits
replay until expiry; the UI should replace a result for the same attempt rather
than count repeated submissions as new learning. No server student database exists.

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
