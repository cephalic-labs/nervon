# Learner API handoff

Status: contracts only. Neither endpoint, signing, nor live inference is implemented.
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

## Stateless attempt binding (implementation deferred)

Use `attemptId` as an opaque token signed with server-only `ATTEMPT_SIGNING_SECRET`.
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

Before assessment, validate payload shape, supported token version, timestamps,
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

## Development examples

`tests/fixtures/learner-contracts.ts` contains typed synthetic response fixtures
and reasoning examples. They are disconnected from app imports and are not
prewritten live AI results. Use them to develop the UI and manually evaluate
providers once live inference exists; they do not establish diagnostic accuracy.
