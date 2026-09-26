# Autonomous Nervon demo handoff

Use the [one-page PDF](nervon-day-1.pdf), editable at `/demo` in
`app/demo/page.tsx`. Export with `npm run slide:export` against the running app.
The slide is 16:9 and must remain exactly one page.

## Seven-minute run

| Time | Action |
| --- | --- |
| 0:00–0:45 | Show the slide: a score does not expose reasoning. Nervon investigates, teaches and checks independently. State the synthetic-data assumption. |
| 0:45–1:30 | Open Practice → genotype/phenotype. Answer `PP or Pp`, explain `I guessed.` Submit live. |
| 1:30–2:30 | Read the targeted diagnostic question. Respond in your own words: one P can make Pp purple, p remains present, and appearance cannot distinguish PP from Pp. |
| 2:30–3:15 | Show the changed diagnosis and feedback. Expand the course source. Explain that the knowledge base supplies probes and learning scaffolds; inference remains live. |
| 3:15–4:15 | For the red-flower check, answer `RR or Rr; r may be present.` Explain that R masks the recessive phenotype without removing r. Submit. |
| 4:15–5:00 | Open Progress, refresh and resume this exact conversation. No teacher referral or educator dashboard is involved. |
| 5:00–6:15 | Accept fresh invented judge wording. If uncertainty persists, show the worked example and guided practice instead of claiming a misconception. |
| 6:15–7:00 | Explain limitations: three concepts, unvalidated synthetic rubrics, model errors, no retention proof. Future evaluation uses independent expert labels and delayed recall. |

## Before presenting

1. Set `.env.local`, run `npm run build`, then `npm start` and keep it running.
2. Run `npm run smoke:coach` and `npm run smoke:journey` explicitly; these incur model usage.
3. Open `/demo`, `/learn` and `/progress`. Reset personal progress before presenting.
4. Allow for up to 10 seconds per Jev call and 30 seconds per generative call.
5. Submit the reviewed code to the event destination before the original 4:30 pm IST
   cutoff. This task does not upload or push remotely.

## Honest outcomes

- Unsupported reasoning asks a focused question, up to two distinct probes.
- Persistent uncertainty gets a sourced foundational lesson and another question.
- An unsuccessful check gets a worked example and one retry. Continued difficulty
  ends with a self-study plan and an option to start again—not a handoff or success claim.
- Model errors preserve the form for manual retry; no fixture is substituted.
- Continuations expire in two hours and bind the exact history. They are not user
  authentication. Private rubrics and keys remain server-side.
- Browser storage retains up to 20 conversations, including student text. Use
  invented examples only. Reset clears them; there is no student database.

## Acceptance evidence — 26 September 2026

- 46 offline tests pass, including knowledge coverage, exact evidence, source IDs,
  provider failures, transcript tampering, expiry, bounded transitions and persistence.
- 18 Chromium browser tests pass at 1440px, 390px and 320px. Tested clarification,
  guided retry, unresolved plans, saved conversations, exact history selection,
  errors, cross-tab updates, reset, blocked storage and keyboard submission. Axe
  reported no violations in the tested screens/states.
- Live API conversation: initial `I guessed` → clarify; corrected reasoning →
  `sound-reasoning` in 13,060ms; follow-up → verified in 1,845ms.
- Separate live API conversation: repeated uncertainty → two probes → sourced
  lesson → needsPractice → guided retry → verified. Final retry took 4,035ms.
- Fresh live browser conversation also passed: clarify → sound reasoning (5,782ms) →
  verified (2,687ms), with personal progress preserved after reload.
- TypeScript, lint and the production Turbopack build passed. The revised PDF exports
  as exactly one 16:9 page.
- An initial live test exposed anchoring on the original answer; the implementation
  now sends the latest response as primary evidence with the full prior dialogue.
  A regression test covers this. Timings are observations, not guarantees.

These checks establish integration, not educational accuracy. Human event
presentation and external upload remain team actions.
