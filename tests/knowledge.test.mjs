import test from 'node:test';
import assert from 'node:assert/strict';
import { getCourse, getPublicCourse } from '../lib/course.ts';
import { getKnowledge, selectProbe } from '../lib/knowledge.ts';
test('every question has distinct grounded diagnostic probes and a concrete learning plan',()=>{
 const ids=new Set();
 for(const concept of getCourse('classical-genetics').concepts){
  const k=getKnowledge(concept.id);
  assert.ok(k.prerequisites.length && k.lesson.steps.length>=3 && k.lesson.workedExample);
  assert.ok(k.lesson.sourceIds.every(id=>concept.sources.some(s=>s.id===id)));
  for(const q of concept.questions){
   const first=selectProbe(q.id,[],null);const second=selectProbe(q.id,[first.id],null);
   for(const p of [first,second]){assert.ok(p.prompt&&p.hypotheses.length);assert.ok(!ids.has(p.id));ids.add(p.id);}
   assert.equal(selectProbe(q.id,[first.id,second.id],null),null);
  }
 }
 assert.equal(ids.size,12);
 assert.ok(!JSON.stringify(getPublicCourse('classical-genetics')).includes('hypotheses'));
});
test('known hypothesis selects its matching probe without repeating it',()=>{
 const probe=selectProbe('genotype-phenotype-1',[],'recessive-allele-disappears');
 assert.ok(probe.hypotheses.includes('recessive-allele-disappears'));
 assert.notEqual(selectProbe('genotype-phenotype-1',[probe.id],'recessive-allele-disappears').id,probe.id);
 assert.throws(()=>getKnowledge('missing'));
});
