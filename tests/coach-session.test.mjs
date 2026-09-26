import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCoach,parseSession } from '../lib/session.ts';
import { isCoachResponse } from '../lib/client-coach.ts';
const response={state:{version:1,id:'conversation',courseId:'classical-genetics',courseVersion:'1.0.0',knowledgeVersion:'1.0.0',questionId:'genotype-phenotype-1',localSessionId:'session',issuedAt:100,phase:'clarify',turns:[{kind:'initial',questionId:'genotype-phenotype-1',prompt:'Question',answer:'PP',explanation:'I guessed.'}],pending:{id:'probe',prompt:'Explain dominance.'},diagnosis:null,feedback:null,result:null},continuationToken:'test-token',message:'One question',lesson:null};
test('coaching updates replace one conversation and survive parsing without losing old history',()=>{
 const session={version:1,id:'session',attempts:[]};
 const first=saveCoach(session,response,100);
 const changed=saveCoach(first,{...response,message:'Next question'},101);
 assert.equal(changed.coaching.length,1);assert.equal(first.coaching[0].response.message,'One question');
 assert.deepEqual(parseSession(JSON.stringify(changed)),changed);
 assert.deepEqual(changed.attempts,[]);
});
test('invalid coaching shapes cannot masquerade as completed understanding',()=>{
 assert.equal(isCoachResponse(response),true);
 for(const state of [{...response.state,phase:'complete'},{...response.state,turns:[]},{...response.state,result:{status:'invented',reason:'Fake'}}])assert.equal(isCoachResponse({...response,state}),false);
});
