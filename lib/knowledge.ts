import 'server-only';
import knowledge from '../data/genetics-knowledge.json' with {type:'json'};
import { getQuestion } from './course';
export const KNOWLEDGE_VERSION = knowledge.version;
export function getKnowledge(conceptId:string) {
 const concept=knowledge.concepts.find(c=>c.conceptId===conceptId);
 if(!concept)throw new Error('Unknown knowledge concept');
 return concept;
}
export function selectProbe(questionId:string,used:string[],label:string|null) {
 const {concept}=getQuestion('classical-genetics',questionId);
 const probes=getKnowledge(concept.id).probes.filter(p=>p.questionId===questionId&&!used.includes(p.id));
 return probes.find(p=>label&&p.hypotheses.includes(label))??probes[0]??null;
}
