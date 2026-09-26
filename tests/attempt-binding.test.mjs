import test from 'node:test';
import assert from 'node:assert/strict';
import { signAttempt, verifyAttempt } from '../lib/attempt.ts';
const secret = 'test-signing-secret-with-at-least-32-bytes';
const binding = { courseId: 'classical-genetics', coursePackVersion: '1.0.0', originalQuestionId: 'genotype-phenotype-1', nextQuestionId: 'genotype-phenotype-2', localSessionId: 'test-session' };
test('verification rejects stale packs, cross-concept pairs, future and exactly expired tokens', () => {
  for (const change of [{coursePackVersion:'0.9.0'}, {nextQuestionId:'segregation-1'}, {originalQuestionId:'missing'}, {localSessionId:''}]) {
    assert.equal(verifyAttempt(signAttempt({...binding,...change},secret,100),secret,101),null);
  }
  assert.equal(verifyAttempt(signAttempt(binding,secret,100),secret,99),null);
  assert.equal(verifyAttempt(signAttempt(binding,secret,100),secret,7300),null);
});
