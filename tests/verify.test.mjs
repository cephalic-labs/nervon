import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { POST, runtime } from '../app/api/verify/route.ts';
import { createVerifyHandler } from '../lib/verify.ts';
import { signAttempt, verifyAttempt } from '../lib/attempt.ts';
import { generateVerification } from '../lib/feedback.ts';
import { verificationContext } from '../lib/decision.ts';
import { getCourse, getQuestion } from '../lib/course.ts';
import { ConfigurationError, ProviderError } from '../lib/openrouter.ts';
import { InvalidRequestError, validateVerify } from '../lib/validation.ts';

const env = { OPENROUTER_API_KEY: 'test-only-key', ATTEMPT_SIGNING_SECRET: 'x'.repeat(32) };
const config = { apiKey: env.OPENROUTER_API_KEY, jevModel: 'typesafe/jev-1.13', generativeModel: 'deepseek/deepseek-v4.1-flash', signingSecret: env.ATTEMPT_SIGNING_SECRET };
const binding = { courseId: 'classical-genetics', coursePackVersion: getCourse('classical-genetics').version, originalQuestionId: 'genotype-phenotype-1', nextQuestionId: 'genotype-phenotype-2', localSessionId: 'synthetic-session' };
const { question: target } = getQuestion(binding.courseId, binding.nextQuestionId);
const rubric = target.verificationRubric;
const answer = { status: 'verified', reason: 'Rr is red because R masks the recessive r allele without removing it.' };
const context = { ...getQuestion(binding.courseId, binding.nextQuestionId), answer: 'RR or Rr', explanation: 'R masks r, so Rr is red and still carries r.' };
const attempt = (overrides = {}) => signAttempt({ ...binding, ...overrides }, env.ATTEMPT_SIGNING_SECRET);
const body = (overrides = {}) => ({ attemptId: attempt(), nextQuestionId: binding.nextQuestionId, answer: context.answer, explanation: context.explanation, ...overrides });
const request = value => new Request('http://localhost/api/verify', { method: 'POST', body: typeof value === 'string' ? value : JSON.stringify(value) });
const chat = data => async () => Response.json({ model: config.generativeModel, choices: [{ message: { content: JSON.stringify(data) }, finish_reason: 'stop' }] });
const json = data => async () => Response.json(data);
function setup(responses = [answer], configured = env) {
  const calls = []; const logs = [];
  const handler = createVerifyHandler({ env: () => configured, log: event => logs.push(event), fetcher: async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (next instanceof Response) return next;
    return chat(next)();
  } });
  return { handler, calls, logs };
}
const assertNoStore = response => {
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(response.headers.get('X-Request-Id') ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
};

test('attempt tokens are signed, timing-safe, and bound to one question until expiry', () => {
  const token = attempt();
  assert.deepEqual(verifyAttempt(token, env.ATTEMPT_SIGNING_SECRET), binding);
  assert.equal(verifyAttempt(token, 'y'.repeat(32)), null);
  const [payload, signature] = token.split('.');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url'));
  const reSign = data => { const signed = Buffer.from(JSON.stringify(data)).toString('base64url'); return `${signed}.${createHmac('sha256', env.ATTEMPT_SIGNING_SECRET).update(signed).digest('base64url')}`; };
  for (const altered of [
    { ...decoded, localSessionId: 'another-session' }, { ...decoded, nextQuestionId: 'segregation-1' },
    { ...decoded, tokenVersion: 2 }, { ...decoded, courseId: 'intro-stats' }, { ...decoded, nextQuestionId: 7 },
    { ...decoded, coursePackVersion: undefined }, { ...decoded, issuedAt: 'now' }, { ...decoded, expiresAt: decoded.issuedAt },
  ]) {
    const alteredPayload = Buffer.from(JSON.stringify(altered)).toString('base64url');
    assert.equal(verifyAttempt(`${alteredPayload}.${signature}`, env.ATTEMPT_SIGNING_SECRET), null, `Accepted altered payload: ${JSON.stringify(altered)}`);
  }
  assert.equal(verifyAttempt(`${payload}.${signature.slice(0, -1)}x`, env.ATTEMPT_SIGNING_SECRET), null);
  assert.equal(verifyAttempt(`${payload}.${signature.slice(0, -1)}`, env.ATTEMPT_SIGNING_SECRET), null);
  assert.equal(verifyAttempt(payload, env.ATTEMPT_SIGNING_SECRET), null);
  assert.equal(verifyAttempt(`${payload}.${signature}.extra`, env.ATTEMPT_SIGNING_SECRET), null);
  assert.equal(verifyAttempt(attempt(), env.ATTEMPT_SIGNING_SECRET, decoded.expiresAt + 1), null);
  assert.ok(verifyAttempt(token, env.ATTEMPT_SIGNING_SECRET, decoded.expiresAt - 1));
  assert.equal(verifyAttempt(reSign({ ...decoded }), env.ATTEMPT_SIGNING_SECRET).nextQuestionId, binding.nextQuestionId);
  assert.equal(verifyAttempt(attempt({ nextQuestionId: null }), env.ATTEMPT_SIGNING_SECRET).nextQuestionId, null);
});

test('verify input is trimmed, bounded, and rejected before any provider call', () => {
  const valid = body();
  assert.deepEqual(validateVerify({ ...valid, attemptId: ` ${valid.attemptId} `, answer: ' RR or Rr ', explanation: '\tRr carries r.\n' }), { attemptId: valid.attemptId, nextQuestionId: valid.nextQuestionId, answer: 'RR or Rr', explanation: 'Rr carries r.' });
  assert.ok(validateVerify({ ...valid, attemptId: 'x'.repeat(4096), answer: 'x'.repeat(2000), explanation: 'x'.repeat(4000) }));
  for (const bad of ['{', null, [], 'a string', 7, {}, { ...valid, attemptId: 7 }, { ...valid, attemptId: '' }, { ...valid, attemptId: '   ' }, { ...valid, attemptId: 'x'.repeat(4097) }, { ...valid, nextQuestionId: '' }, { ...valid, answer: 'x'.repeat(2001) }, { ...valid, explanation: 'x'.repeat(4001) }, { ...valid, explanation: null }]) {
    assert.throws(() => validateVerify(bad), InvalidRequestError, `Accepted malformed body: ${JSON.stringify(bad)}`);
  }
  assert.throws(() => validateVerify(null), /attempt token, question ID, answer, and explanation/);
  assert.throws(() => validateVerify(null), e => !/session/i.test(e.message));
});

test('verification judges the second attempt against the question verification rubric', async () => {
  let sent;
  const result = await generateVerification(context, config, async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return chat(answer)(); });
  assert.ok(sent.url.endsWith('/v1/chat/completions'));
  assert.equal(sent.body.model, config.generativeModel);
  assert.equal(sent.body.stream, false);
  assert.equal(sent.body.provider.require_parameters, true);
  assert.equal(sent.body.response_format.json_schema.strict, true);
  assert.deepEqual(sent.body.response_format.json_schema.schema.properties.status.enum, ['verified', 'needsPractice', 'educatorReview']);
  const sentPrompt = JSON.parse(sent.body.messages[1].content);
  assert.deepEqual(sentPrompt.verificationRubric, rubric);
  assert.deepEqual(sentPrompt.requiredReasoning, target.requiredReasoning);
  assert.equal(sentPrompt.question, target.prompt);
  assert.equal(sentPrompt.referenceAnswer, target.referenceAnswer);
  assert.deepEqual(sentPrompt.studentResponse, { answer: context.answer, explanation: context.explanation });
  const serialized = sent.body.messages[1].content;
  for (const criteria of Object.values(rubric)) assert.ok(serialized.includes(criteria), `Rubric criteria missing from the request: ${criteria}`);
  assert.ok(sent.body.messages[0].content.includes('verificationRubric'));
  assert.deepEqual(Object.keys(result).sort(), ['model', 'reason', 'status', 'usage']);
  assert.equal(result.status, answer.status);
  assert.equal(result.reason, answer.reason);
});

test('unusable rubric data is a configuration failure, not a silent default', () => {
  assert.deepEqual(Object.keys(verificationContext(context).verificationRubric).sort(), ['educatorReview', 'needsPractice', 'verified']);
  for (const unusable of [undefined, null, {}, { ...rubric, verified: '   ' }, { ...rubric, needsPractice: 7 }, { ...rubric, educatorReview: undefined }]) {
    assert.throws(() => verificationContext({ ...context, question: { ...target, verificationRubric: unusable } }), ConfigurationError);
  }
  return assert.rejects(generateVerification({ ...context, question: { ...target, verificationRubric: {} } }, config, json({})), ConfigurationError);
});

test('provider output is validated before it can reach a learner', async () => {
  for (const bad of [{}, { status: 'verified' }, { reason: 'ok' }, { ...answer, status: 'mastered' }, { ...answer, reason: '   ' }, { ...answer, reason: 'x'.repeat(501) }, { ...answer, reason: 7 }, { ...answer, status: 'verified', note: 'extra' }]) {
    await assert.rejects(generateVerification(context, config, chat(bad)), ProviderError, `Accepted invalid output: ${JSON.stringify(bad)}`);
  }
  await assert.rejects(generateVerification(context, config, json({ choices: [{ message: { content: 'not JSON' }, finish_reason: 'stop' }] })), error => error.reason === 'INVALID_JSON');
  await assert.rejects(generateVerification(context, config, json({ choices: [{ message: { content: '{}' }, finish_reason: 'length' }] })), error => error.reason === 'INCOMPLETE_OUTPUT');
  await assert.rejects(generateVerification(context, config, json({ model: config.generativeModel, choices: [] })), ProviderError);
  await assert.rejects(generateVerification(context, config, chat({ ...answer, status: 'mastered' })), error => error.reason === 'INVALID_STATUS');
  await assert.rejects(generateVerification(context, config, chat({ ...answer, reason: 'x'.repeat(501) })), error => error.reason === 'INVALID_REASON');
});

test('a verified attempt returns only the public contract with no-store and a request id', async () => {
  const { handler, calls, logs } = setup();
  const submitted = body();
  const response = await handler(request(submitted));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(data, answer);
  assertNoStore(response);
  assert.equal(logs.at(-1).requestId, response.headers.get('X-Request-Id'));
  assert.equal(logs.at(-1).questionId, binding.nextQuestionId);
  assert.equal(logs.at(-1).status, answer.status);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].body.messages[1].content.includes(rubric.needsPractice));
  const disclosed = JSON.stringify(data) + JSON.stringify(logs);
  for (const privateValue of [submitted.answer, submitted.explanation, submitted.attemptId, env.OPENROUTER_API_KEY, env.ATTEMPT_SIGNING_SECRET, target.referenceAnswer, ...Object.values(rubric), ...target.requiredReasoning]) {
    assert.ok(!disclosed.includes(privateValue), `Disclosed private value: ${privateValue}`);
  }
  const second = await handler(request(body()));
  assert.notEqual(second.headers.get('X-Request-Id'), response.headers.get('X-Request-Id'));
});

test('malformed and mismatched attempts fail closed without a provider call', async () => {
  for (const bad of ['{', null, [], 'a string', {}, { ...body(), attemptId: 7 }, { ...body(), explanation: '   ' }, { ...body(), attemptId: 'x'.repeat(4097) }]) {
    const { handler, calls } = setup([], {});
    const response = await handler(request(bad));
    const data = await response.json();
    assert.equal(response.status, 400, `Unexpected status for: ${JSON.stringify(bad)}`);
    assert.equal(data.error.code, 'INVALID_REQUEST');
    assert.deepEqual(Object.keys(data.error).sort(), ['code', 'message']);
    assertNoStore(response);
    assert.equal(calls.length, 0);
  }
  const rejected = [
    ['tampered signature', { attemptId: `${attempt().split('.')[0]}.x` }],
    ['tampered payload', { attemptId: (() => { const [p, s] = attempt().split('.'); return `${Buffer.from(p.replace('genotype-phenotype-2', 'segregation-2')).toString('base64url')}.${s}`; })() }],
    ['wrong secret', { attemptId: signAttempt(binding, 'y'.repeat(32)) }],
    ['expired', { attemptId: signAttempt(binding, env.ATTEMPT_SIGNING_SECRET, 1000) }],
    ['review attempt without a next question', { attemptId: attempt({ nextQuestionId: null }) }],
    ['another question paired with the attempt', { nextQuestionId: 'segregation-2' }],
  ];
  for (const [label, overrides] of rejected) {
    const { handler, calls } = setup([], env);
    const response = await handler(request(body(overrides)));
    const data = await response.json();
    assert.equal(response.status, 400, label);
    assert.equal(data.error.code, 'INVALID_ATTEMPT', label);
    assertNoStore(response);
    assert.equal(calls.length, 0, label);
  }
  const unknown = setup([], env);
  const response = await unknown.handler(request(body({ attemptId: attempt({ nextQuestionId: 'missing-question' }), nextQuestionId: 'missing-question' })));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  assert.equal(unknown.calls.length, 0);
});

test('configuration and provider failures keep the public error safe and diagnosable', async () => {
  const unconfigured = setup([], {});
  const response = await unconfigured.handler(request(body()));
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error.code, 'CONFIGURATION_ERROR');
  assertNoStore(response);
  assert.equal(unconfigured.calls.length, 0);
  for (const failure of [new Response('SECRET provider details', { status: 503 }), { model: 'x' }, new Error('network down')]) {
    const { handler, logs } = setup([failure]);
    const failed = await handler(request(body()));
    const data = await failed.json();
    assert.equal(failed.status, 502);
    assert.equal(data.error.code, 'PROVIDER_FAILURE');
    assertNoStore(failed);
    assert.ok(!JSON.stringify(data).includes('SECRET'));
    assert.ok(logs.some(event => event.stage === 'verification' && event.outcome === 'failed' && typeof event.reason === 'string'));
  }
  const upstream = setup([new Response('SECRET provider details', { status: 429 })]);
  await upstream.handler(request(body()));
  assert.ok(upstream.logs.some(event => event.reason === 'HTTP_ERROR' && event.httpStatus === 429));
});

test('an unexpected failure never emits an undocumented error code', async () => {
  const codes = [];
  const { handler, logs } = setup();
  // A body that only fails inside validation must not surface as a documented 400 either.
  const hostile = { json: async () => new Proxy({}, { get: (target, key) => key === "then" ? undefined : (() => { throw new TypeError('secret internal detail'); })() }) };
  const response = await handler(hostile);
  const data = await response.json();
  assert.equal(response.status, 500);
  codes.push(data.error.code);
  assertNoStore(response);
  assert.ok(!JSON.stringify(data).includes('secret internal detail'));
  assert.ok(!JSON.stringify(logs).includes('secret internal detail'));
  assert.ok(logs.some(event => event.stage === 'error' && event.code === data.error.code));
  for (const bad of ['{', null, [], {}, { ...body(), attemptId: 'tampered' }]) {
    codes.push((await (await handler(request(bad))).json()).error.code);
  }
  const verified = await handler(request(body()));
  assert.equal(verified.status, 200);
  assertNoStore(verified);
  assert.deepEqual([...new Set(codes)].sort(), ['CONFIGURATION_ERROR', 'INVALID_ATTEMPT', 'INVALID_REQUEST']);
});

test('the route export serves the same contract through process.env', async () => {
  assert.equal(runtime, 'nodejs');
  const saved = Object.fromEntries(['OPENROUTER_API_KEY', 'ATTEMPT_SIGNING_SECRET', 'OPENROUTER_GENERATIVE_MODEL', 'OPENROUTER_JEV_MODEL'].map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const calls = [];
  const logs = [];
  console.info = line => logs.push(JSON.parse(line));
  globalThis.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return Response.json({ model: 'stealth/space-bunny-alpha', choices: [{ message: { content: JSON.stringify({ ...answer, status: 'needsPractice', reason: 'Keeps PP possible while claiming dominance removes p.' }) }, finish_reason: 'stop' }] }); };
  Object.assign(process.env, env, { OPENROUTER_GENERATIVE_MODEL: 'stealth/space-bunny-alpha' });
  try {
    const response = await POST(request(body()));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(data, { status: 'needsPractice', reason: 'Keeps PP possible while claiming dominance removes p.' });
    assertNoStore(response);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.model, 'stealth/space-bunny-alpha');
    assert.ok(calls[0].body.messages[1].content.includes(rubric.educatorReview));
    assert.ok(logs.some(event => event.model === 'stealth/space-bunny-alpha' && event.status === 'needsPractice'));
    const failed = await POST(request('{'));
    assert.equal(failed.status, 400);
    assert.equal((await failed.json()).error.code, 'INVALID_REQUEST');
    assertNoStore(failed);
    assert.equal(calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
