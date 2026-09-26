import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getQuestion } from '../lib/course.ts';
import { loadConfig, ProviderError, postOpenRouter } from '../lib/openrouter.ts';
import { classifyWithJev } from '../lib/jev.ts';
import { generateAssessment } from '../lib/feedback.ts';

const config = { apiKey: 'test-only-key', jevModel: 'typesafe/jev-1.13', generativeModel: 'deepseek/deepseek-v4.1-flash', signingSecret: 'x'.repeat(32) };
const context = { ...getQuestion('classical-genetics', 'genotype-phenotype-1'), answer: 'PP only', explanation: 'Purple is dominant, so both alleles must be P.' };
const choice = (label, labels) => ({ type: 'choice', choice: label, confidence: 0.8, probabilities: Object.fromEntries(labels.map(x => [x, x === label ? 1 : 0])) });
export function jevResponse(label = 'dominant-means-homozygous', support = 'sufficient') {
  return { answers: { pattern: choice(label, context.question.diagnosticRubric.map(x => x.label)), evidence: choice(support, ['sufficient', 'insufficient', 'contradictory']) }, model: config.jevModel, usage: { cost: 0.001 } };
}
const output = { label: 'dominant-means-homozygous', evidence: 'both alleles must be P', reviewRequired: false, diagnosisSupported: true, feedbackText: 'Appearance alone cannot distinguish PP from Pp. Explain how P masks the recessive phenotype without removing p.', sourceIds: ['genotype-phenotype-source'] };
const json = data => async () => Response.json(data);
const chat = data => json({ model: config.generativeModel, choices: [{ message: { content: JSON.stringify(data) }, finish_reason: 'stop' }] });

test('configuration defaults and explicit model selection', () => {
  assert.throws(() => loadConfig({}), /configuration/i);
  assert.throws(() => loadConfig({ OPENROUTER_API_KEY: 'key', ATTEMPT_SIGNING_SECRET: 'short' }), /configuration/i);
  const loaded = loadConfig({ OPENROUTER_API_KEY: 'key', ATTEMPT_SIGNING_SECRET: config.signingSecret });
  assert.equal(loaded.generativeModel, config.generativeModel);
  assert.equal(loadConfig({ OPENROUTER_API_KEY: 'key', ATTEMPT_SIGNING_SECRET: config.signingSecret, OPENROUTER_GENERATIVE_MODEL: 'stealth/space-bunny-alpha' }).generativeModel, 'stealth/space-bunny-alpha');
});

test('Jev uses dedicated endpoint and validates choices and distributions', async () => {
  let request;
  const result = await classifyWithJev(context, config, async (url, init) => {
    request = { url, body: JSON.parse(init.body) };
    return Response.json(jevResponse());
  });
  assert.ok(request.url.endsWith('/alpha/decisions'));
  assert.equal(request.body.questions.pattern.type, 'choice');
  assert.equal(request.body.questions.evidence.type, 'choice');
  assert.equal(result.label, output.label);
  assert.equal(result.reviewRequired, false);
  for (const bad of [ {}, jevResponse('invented'), { answers: { pattern: { type: 'choice', choice: output.label, probabilities: {} } } } ]) {
    await assert.rejects(classifyWithJev(context, config, json(bad)), ProviderError);
  }
  const review = await classifyWithJev(context, config, json(jevResponse(output.label, 'contradictory')));
  assert.equal(review.reviewRequired, true);
});

test('generative requests require structured output and ground evidence and sources', async () => {
  let body;
  const result = await generateAssessment(context, config, output.label, async (url, init) => {
    assert.ok(url.endsWith('/chat/completions'));
    body = JSON.parse(init.body);
    return chat(output)();
  });
  assert.equal(body.provider.require_parameters, true);
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.stream, false);
  assert.equal(result.evidence, output.evidence);
  assert.deepEqual(result.feedback.sourceIds, output.sourceIds);
  for (const bad of [ { ...output, label: 'invented' }, { ...output, evidence: 'fabricated words' }, { ...output, sourceIds: ['other-concept'] }, { ...output, feedbackText: '' }, { ...output, feedbackText: 'x'.repeat(1201) } ]) {
    await assert.rejects(generateAssessment(context, config, output.label, chat(bad)), ProviderError);
  }
  await assert.rejects(generateAssessment(context, config, null, json({ choices: [{ message: { content: 'not JSON' } }] })), ProviderError);
  const review = await generateAssessment(context, config, output.label, chat({ ...output, diagnosisSupported: false }));
  assert.equal(review.reviewRequired, true);
  assert.equal(review.feedback, null);
});

test('transport handles HTTP errors and timeouts with no retry or leaked error', async () => {
  let calls = 0;
  await assert.rejects(postOpenRouter('/alpha/decisions', {}, config, 10, async () => { calls++; return new Response('SECRET provider details', { status: 429 }); }), error => error instanceof ProviderError && error.reason === 'HTTP_ERROR' && error.httpStatus === 429 && !error.message.includes('SECRET'));
  assert.equal(calls, 1);
  await assert.rejects(postOpenRouter('/alpha/decisions', {}, config, 5, async (_url, init) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('unexpected timeout')), 100);
    init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal.reason); });
  })), error => error instanceof ProviderError && error.reason === 'TIMEOUT');
});

test('feedback diagnostic codes distinguish fabricated evidence and invalid sources', async () => {
  await assert.rejects(generateAssessment(context, config, output.label, chat({ ...output, evidence: 'fabricated quote' })), error => error.reason === 'INVALID_EVIDENCE');
  await assert.rejects(generateAssessment(context, config, output.label, chat({ ...output, sourceIds: ['missing'] })), error => error.reason === 'INVALID_SOURCE_IDS');
});
