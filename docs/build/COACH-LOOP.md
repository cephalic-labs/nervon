# Autonomous subject coaching

The student never needs a teacher handoff. Uncertainty triggers targeted evidence
collection, not a confident diagnosis. Implement in local atomic slices:

1. Add a versioned genetics knowledge base: prerequisites, two diagnostic probes
   per question, a sourced worked example and concrete self-study steps. Test
   coverage, source references and question/probe uniqueness.
2. Add `/api/coach`: initial explained answer → up to two distinct probes →
   grounded teaching → paired verification → one supported retry → explicit
   completion or unresolved practice plan. Reuse live Jev and generative adapters;
   all follow-up responses inform reassessment. Never substitute fixtures.
3. Bind continuation to server-issued state with HMAC over a SHA-256 state digest.
   Tokens contain routing/version/expiry and a digest, not student text or keys.
   The public conversation transcript travels separately and cannot be altered
   without invalidating the token. Two-hour fixed expiry, bounded five exchanges,
   no database or new credentials. Replay is allowed; one session entry per
   conversation prevents double-counting. Tokens are not user authentication.
4. Replace educator navigation with personal progress. Preserve prior local
   history, show the conversation, resume on reload, display sources and a clear
   next action. Verify responsiveness, keyboard use, errors and all loop branches.
5. Update the slide, documentation and live smoke script; run offline, browser,
   production and fresh live acceptance checks.

The original analyze/verify endpoints remain compatibility primitives. Their
uncertain outcome is `needsClarification`, not educator review. Content quality
review remains a separate future validation activity, never a learner dependency.
