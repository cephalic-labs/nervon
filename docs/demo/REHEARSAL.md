# Day 1 demo handoff

Presentation: [one-page PDF](nervon-day-1.pdf). Editable slide: `/demo` (`app/demo/page.tsx`).
Re-export with `npm run slide:export` while the local server is running. Chromium is
required (`npx playwright install chromium`). The export was checked with
`pdfinfo`: exactly one page, 960 × 540 points (16:9).

## Seven-minute run

| Time | Presenter | Action |
| --- | --- | --- |
| 0:00–0:45 | Yaazh | Show the slide. Explain the problem, synthetic assumptions and learning loop. |
| 0:45–1:15 | Yaazh | Open Practice, choose genotype/phenotype. Point out the requirement to explain. |
| 1:15–2:15 | Saumyajit | Enter `PP only`; explain `Purple is dominant, so both alleles must be P.` Submit live. Explain that the returned label is a hypothesis. |
| 2:15–3:00 | Saumyajit | Read the evidence and source-grounded feedback. Expand the OpenStax reading. Point out provider disclosure. |
| 3:00–4:00 | Yaazh | Answer the red-flower follow-up: `RR or Rr; r can be present.` Explain that one R masks r without eliminating it. Submit the live check. |
| 4:00–4:45 | Yaazh | Open Educator: show the saved verification, then distinguish the fixed synthetic cohort. Refresh to show persistence. |
| 4:45–6:15 | Saumyajit | Start a new attempt and accept fresh judge wording. If needed use `I guessed.` to show the honest review state. Allow time for provider latency. |
| 6:15–7:00 | Both | Explain next validation: consent, faculty labels, unseen scenarios, per-label errors, and delayed recall. |

## Before presenting

1. Run `npm ci`, set `.env.local`, `npm run build`, then `npm start`. Keep the server running.
2. Run `npm run smoke:analyze` and `npm run smoke:journey` explicitly; both incur live API usage.
3. Open `/demo`, `/learn`, and `/educator`. Reset the browser session once before the demonstration.
4. Use invented student data only. No canned response belongs in the live path.
5. Check the event upload destination and submit the reviewed code before the **4:30 pm IST** cutoff. No remote upload or push was performed by this implementation task.

## Failure and technical answers

- A provider failure is visible. Preserve the student's text and retry manually; never substitute fixtures.
- Uncertain reasoning asks for clarification or an educator. A generative fallback is explicitly disclosed.
- Jev timeout: 10 seconds; generative call: 30 seconds; no application retries. Network conditions can vary.
- Answer keys and rubrics stay server-side. Tokens are HMAC-signed, expire in two hours, and bind the course version and question pair.
- Browser history stores up to 50 attempts, feedback/evidence and checks. No student database or identity system; clearing browser storage removes it. Verification replays replace the same result.
- Immediate verification does not prove retention, mastery or diagnostic accuracy. Content and labels remain pending educator review.
- Laya and LMS integration are outside this Day 1 critical path.

## Verified on 26 September 2026

- 35 offline tests; TypeScript, lint and production build passed.
- 18 Chromium browser tests passed against both development and production: desktop 1440px, phone 390px, narrow phone 320px. No automated axe WCAG A/AA violations on the checked screens; keyboard skip link, no horizontal overflow, source rendering, cross-tab sync, persistence, reset, provider errors and all verification outcomes covered.
- Six live analysis examples passed with `typesafe/jev-1.13` and `deepseek/deepseek-v4.1-flash`. Analyze latencies were 456–15,201ms. Unrelated reasoning mapped to insufficient evidence with review, rather than its authored exact label; this was accepted as uncertainty.
- Fresh live browser journey: misconception diagnosis via Jev in 3,533ms; sound follow-up `verified` in 1,823ms; educator persistence confirmed. These are observed integration timings, not performance guarantees or educational validation.
- Browser bundles checked for private rubric field names and server credential names; none found.

The human rehearsal, event eligibility confirmation and upload remain presenter actions. The artifacts and technical implementation are ready locally.
