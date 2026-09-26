# Autonomous subject coaching

The learner never needs a teacher handoff. Uncertainty triggers evidence collection,
then grounded teaching and practice. All slices are implemented locally.

## Knowledge

The server retrieves by concept and original question from a versioned genetics
knowledge base: prerequisites, two diagnostic probes per question, a worked example
and concrete study steps. Sources resolve to the course's OpenStax attributions.
Private hypothesis mappings and assessment keys never enter the browser.

## State machine

1. **Explain:** submit an answer and explanation to `/api/coach`.
2. **Clarify:** uncertain reasoning selects an unused question-specific probe. A
   candidate Jev label can guide the probe, without being asserted as a diagnosis.
   The next response becomes the primary evidence; all prior exchanges provide
   context. Explicit corrections can supersede earlier reasoning.
3. **Teach and verify:** supported reasoning receives live grounded feedback and
   the other question in that concept. After two unresolved probes, disclose the
   uncertainty and offer an authored foundational example before the new question.
4. **Retry:** an unsuccessful check returns a worked example and steps, then one
   retry of the same check (labelled as a retry, not a new transfer question).
5. **Complete:** record either immediate verification or an unresolved practice
   plan. Unresolved does not mean mastered. A fresh session is always available.

Maximum five sequential submitted responses per path: initial + two probes +
check + retry. No automatic provider retries or infinite questioning.

## Integrity and privacy

The public transcript and server-produced state travel separately from an HMAC
continuation token. The token authenticates a SHA-256 digest of the exact JSON
state, using a domain-separated HMAC-SHA256 signature. It contains a version,
digest, issue time and fixed two-hour expiry, with no response text or private keys.
State tampering, expired or future-issued tokens, course/knowledge version changes,
and attempts to continue a completed state fail before inference.

No new secret or database is needed. A valid token can be replayed until expiry;
this is not authentication or an assessment record. Browser updates replace the
same conversation entry. Context and tokens are excluded from routine logs.

## Compatibility

`/api/analyze` and `/api/verify` remain tested single-turn compatibility primitives.
Their old `reviewRequired`/`educatorReview` names represent uncertainty. The new
learning path calls `/api/coach`, maps uncertainty to clarification or self-guided
practice and never presents a human handoff. Old `/educator` bookmarks redirect to
personal `/progress`; prior local attempt history is preserved as earlier practice.
Content validation by independent experts is future evaluation work, not a learner
workflow dependency.
