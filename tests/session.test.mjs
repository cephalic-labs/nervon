import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSession, saveAttempt, saveVerification, summarize } from '../lib/session.ts';
const analysis = {attemptId:'test-token',conceptId:'genotype-phenotype',diagnosis:{label:'sound-reasoning',evidence:'one allele',decisionProvider:'jev',reviewRequired:false},feedback:{text:'A supported explanation.',sourceIds:['genotype-phenotype-source']},nextQuestion:{id:'genotype-phenotype-2',prompt:'Another question'}};
const empty = {version:1,id:'session',attempts:[]};
test('session retains multiple attempts and verification replaces a result without double counting', () => {
 const first=saveAttempt(empty,'genotype-phenotype-1',analysis,100);
 const second=saveAttempt(first,'genotype-phenotype-1',{...analysis,attemptId:'token-two'},101);
 const verified=saveVerification(second,'test-token',{status:'verified',reason:'Supported.'},102);
 const changed=saveVerification(verified,'test-token',{status:'needsPractice',reason:'Try again.'},103);
 assert.equal(changed.attempts.length,2);
 assert.deepEqual(summarize(changed.attempts),{attempts:2,verified:0,needsPractice:1,educatorReview:0,pending:1});
 assert.equal(first.attempts[0].verification,null);
 assert.deepEqual(parseSession(JSON.stringify(changed)),changed);
});
test('corrupt, future-version and invalid model-shaped session records are rejected',()=>{
 for(const raw of ['{','null',JSON.stringify({...empty,version:2}),JSON.stringify({...empty,attempts:[{analysis:{}}]})]) assert.equal(parseSession(raw),null);
 const session=saveAttempt(empty,'genotype-phenotype-1',analysis);
 session.attempts[0].analysis.diagnosis.decisionProvider='invented';
 assert.equal(parseSession(JSON.stringify(session)),null);
});
test('review attempts count as review, never as verified or pending',()=>{
 const review={...analysis,diagnosis:{...analysis.diagnosis,reviewRequired:true},feedback:null,nextQuestion:null};
 assert.equal(summarize(saveAttempt(empty,'genotype-phenotype-1',review).attempts).educatorReview,1);
});
