import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getPublicCourse } from '../lib/course.ts';
test('authored cohort covers the real concepts with consistent, explicitly synthetic counts',()=>{
 const cohort=JSON.parse(fs.readFileSync(new URL('../data/synthetic-cohort.json',import.meta.url),'utf8'));
 assert.match(cohort.disclosure,/synthetic/i);
 assert.deepEqual(cohort.concepts.map(c=>c.conceptId).sort(),getPublicCourse('classical-genetics').concepts.map(c=>c.id).sort());
 for(const row of cohort.concepts){
  for(const field of ['attempts','verified','needsPractice','educatorReview','count'])assert.ok(Number.isSafeInteger(row[field])&&row[field]>=0);
  assert.equal(row.attempts,cohort.learnerCount);
  assert.equal(row.verified+row.needsPractice+row.educatorReview,row.attempts);
  assert.ok(row.count<=row.attempts);
 }
});
