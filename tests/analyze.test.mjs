import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { createAnalyzeHandler } from '../lib/analyze.ts';
import { signAttempt } from '../lib/attempt.ts';
import { reasoningExamples } from './fixtures/learner-contracts.ts';

const env = { OPENROUTER_API_KEY: 'test-only-key', ATTEMPT_SIGNING_SECRET: 'x'.repeat(32) };
const valid = { courseId: 'classical-genetics', questionId: 'genotype-phenotype-1', answer: 'PP only', explanation: 'Purple is dominant, so both alleles must be P.', localSessionId: 'synthetic-session' };
const request = body => new Request('http://localhost/api/analyze', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
function jev(label = 'dominant-means-homozygous', support = 'sufficient') {
  const choice = (selected, keys) => ({ type: 'choice', choice: selected, confidence: 0.9, probabilities: Object.fromEntries(keys.map(key => [key, key === selected ? 1 : 0])) });
  return { answers: { pattern: choice(label, ['dominant-means-homozygous', 'recessive-allele-disappears', 'sound-reasoning', 'unrelated-reasoning', 'insufficient-evidence']), evidence: choice(support, ['sufficient', 'insufficient', 'contradictory']) } };
}
const assessment = { label: 'dominant-means-homozygous', evidence: 'both alleles must be P', diagnosisSupported: true, reviewRequired: false, feedbackText: 'Pp can also produce purple flowers. Separate genotype from phenotype and explain the role of p.', sourceIds: ['genotype-phenotype-source'] };
function setup(responses, configured = env) {
  const calls = []; const logs = [];
  const handler = createAnalyzeHandler({ env: () => configured, log: event => logs.push(event), fetcher: async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (next instanceof Response) return next;
    if (url.endsWith('/decisions')) return Response.json(next);
    return Response.json({ model: 'deepseek/deepseek-v4.1-flash', choices: [{ message: { content: JSON.stringify(next) }, finish_reason: 'stop' }] });
  } });
  return { handler, calls, logs };
}

test('invalid requests never call providers, even with missing config', async () => {
  for (const body of ['{', null, [], {}, { ...valid, explanation: 3 }, { ...valid, explanation: '   ' }, { ...valid, answer: 'x'.repeat(2001) }, { ...valid, explanation: 'x'.repeat(4001) }, { ...valid, localSessionId: 'x'.repeat(129) }, { ...valid, localSessionId: '' }, { ...valid, courseId: 'intro-stats' }, { ...valid, questionId: 'missing' }]) {
    const { handler, calls } = setup([], {});
    const response = await handler(request(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(calls.length, 0);
  }
});

test('valid boundary lengths are trimmed and accepted; config checked before inference', async () => {
  const { handler, calls } = setup([jev('insufficient-evidence', 'insufficient')]);
  const response = await handler(request({ ...valid, answer: ' ' + 'x'.repeat(2000) + ' ', explanation: ' ' + 'x'.repeat(4000) + ' ', localSessionId: 's'.repeat(128) }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].body.state.studentResponse.answer.length, 2000);
  const bad = setup([], {});
  assert.equal((await bad.handler(request(valid))).status, 500);
  assert.equal(bad.calls.length, 0);
});

test('Jev path returns grounded feedback, paired question and private signed token', async () => {
  const { handler, calls, logs } = setup([jev(), assessment]);
  const response = await handler(request(valid));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.diagnosis.decisionProvider, 'jev');
  assert.equal(data.diagnosis.evidence, assessment.evidence);
  assert.equal(data.nextQuestion.id, 'genotype-phenotype-2');
  const [payload, signature] = data.attemptId.split('.');
  assert.equal(signature, createHmac('sha256', env.ATTEMPT_SIGNING_SECRET).update(payload).digest('base64url'));
  const decoded = JSON.parse(Buffer.from(payload, 'base64url'));
  assert.equal(decoded.expiresAt - decoded.issuedAt, 7200);
  assert.equal(decoded.nextQuestionId, data.nextQuestion.id);
  assert.equal(decoded.localSessionId, valid.localSessionId);
  assert.deepEqual(Object.keys(decoded).sort(), ['tokenVersion', 'courseId', 'coursePackVersion', 'originalQuestionId', 'nextQuestionId', 'localSessionId', 'issuedAt', 'expiresAt'].sort());
  assert.ok(!JSON.stringify(data).includes('referenceAnswer'));
  assert.ok(!JSON.stringify(decoded).includes(valid.explanation));
  assert.ok(!JSON.stringify(logs).includes(valid.explanation));
  assert.ok(!JSON.stringify(logs).includes(env.OPENROUTER_API_KEY));
  assert.equal(calls.length, 2);
});

test('Jev review states skip teaching calls and assign no verification question', async () => {
  for (const [label, support] of [['insufficient-evidence', 'insufficient'], ['dominant-means-homozygous', 'contradictory'], ['unrelated-reasoning', 'sufficient']]) {
    const { handler, calls } = setup([jev(label, support)]);
    const data = await (await handler(request(valid))).json();
    assert.equal(data.diagnosis.reviewRequired, true);
    assert.equal(data.feedback, null); assert.equal(data.nextQuestion, null);
    assert.equal(JSON.parse(Buffer.from(data.attemptId.split('.')[0], 'base64url')).nextQuestionId, null);
    assert.equal(calls.length, 1);
  }
});

test('Jev failure uses one disclosed baseline; generative failures do not change paths', async () => {
  for (const failure of [new Response('private provider details', { status: 503 }), {}, new Error('timeout')]) {
    const { handler, calls, logs } = setup([failure, assessment]);
    const data = await (await handler(request(valid))).json();
    assert.equal(data.diagnosis.decisionProvider, 'generative-baseline');
    assert.equal(calls.length, 2);
    assert.ok(logs.some(event => event.fallback === true));
  }
  for (const responses of [[jev(), new Response('SECRET', { status: 500 })], [{}, new Response('SECRET', { status: 429 })], [jev(), { ...assessment, sourceIds: ['fake'] }], [jev(), { ...assessment, evidence: 'fake quote' }]]) {
    const { handler, calls } = setup(responses);
    const response = await handler(request(valid));
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error.code, 'PROVIDER_FAILURE');
    assert.equal(calls.length, 2);
  }
});

test('generative contradiction guard suppresses teaching and baseline can abstain', async () => {
  for (const first of [jev(), {}]) {
    const { handler } = setup([first, { ...assessment, diagnosisSupported: false, reviewRequired: true, feedbackText: null, sourceIds: [] }]);
    const data = await (await handler(request(valid))).json();
    assert.equal(data.diagnosis.reviewRequired, true);
    assert.equal(data.feedback, null); assert.equal(data.nextQuestion, null);
  }
});

test('failed feedback logs safe stage diagnostics without changing the public error', async () => {
  const { handler, logs } = setup([jev(), { ...assessment, evidence: 'fabricated private provider output' }]);
  const response = await handler(request(valid));
  const data = await response.json();
  assert.equal(response.status, 502);
  assert.deepEqual(Object.keys(data.error).sort(), ['code', 'message']);
  assert.ok(logs.some(event => event.stage === 'feedback' && event.reason === 'INVALID_EVIDENCE'));
  assert.ok(!JSON.stringify(logs).includes('fabricated private provider output'));
});

test('signed binding has fixed expiry and contains no assessment content', () => {
  const token = signAttempt({ courseId: 'classical-genetics', coursePackVersion: '1.0.0', originalQuestionId: 'genotype-phenotype-1', nextQuestionId: null, localSessionId: 'session' }, env.ATTEMPT_SIGNING_SECRET, 1000);
  const binding = JSON.parse(Buffer.from(token.split('.')[0], 'base64url'));
  assert.equal(binding.issuedAt, 1000); assert.equal(binding.expiresAt, 8200);
  assert.equal(binding.tokenVersion, 1);
});

test('a fresh supplied explanation is passed to the real inference boundary', async () => {
  const example = reasoningExamples[0];
  const { handler, calls } = setup([jev('sound-reasoning'), { ...assessment, label: 'sound-reasoning', evidence: 'P masks the recessive phenotype' }]);
  const response = await handler(request({ ...valid, answer: example.answer, explanation: example.explanation }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].body.state.studentResponse.explanation, example.explanation);
});
