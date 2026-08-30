import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSIGNMENTS, CONCEPTS, CURRICULUM, PRACTICE_QUESTIONS, SKILLS } from '../src/content.js';
import { allSkillProfiles, assignmentStatus, evidenceWeight, generateDailyBrief, gradeQuestion, recordEvidence, seededShuffle, shuffledQuestion, skillProfile } from '../src/learning.js';
import { emptyState } from '../src/state.js';

test('content catalogue meets MVP breadth and identifier rules', () => {
  assert.ok(CONCEPTS.length >= 40);
  assert.ok(PRACTICE_QUESTIONS.length >= 64);
  assert.ok(ASSIGNMENTS.length >= 8);
  assert.equal(new Set(CONCEPTS.map((item)=>item.id)).size, CONCEPTS.length);
  assert.equal(new Set(PRACTICE_QUESTIONS.map((item)=>item.id)).size, PRACTICE_QUESTIONS.length);
  assert.equal(new Set(ASSIGNMENTS.map((item)=>item.id)).size, ASSIGNMENTS.length);
  PRACTICE_QUESTIONS.forEach((item) => assert.ok(item.options.includes(item.correct)));
  CURRICULUM.forEach((module) => assert.ok(SKILLS.some((skill)=>skill.id===module.skill)));
});

test('answer shuffling is deterministic and preserves correct answer', () => {
  const question=PRACTICE_QUESTIONS[0];
  const first=shuffledQuestion(question,'stable-seed');
  const second=shuffledQuestion(question,'stable-seed');
  assert.deepEqual(first.options,second.options);
  assert.ok(first.options.includes(question.correct));
  assert.equal(gradeQuestion(first,question.correct).score,100);
});

test('retries receive lower evidence weight and wrong work reduces observed mastery', () => {
  const state=emptyState();
  state.baseline.valuation={score:60,confidence:40};
  recordEvidence(state,{activityId:'same',skill:'valuation',conceptId:'dcf',type:'practice',difficulty:2,score:100,correct:true,label:'DCF practice'});
  recordEvidence(state,{activityId:'same',skill:'valuation',conceptId:'dcf',type:'practice',difficulty:2,score:0,correct:false,label:'DCF practice'});
  assert.ok(evidenceWeight(state.evidence[1]) < evidenceWeight(state.evidence[0]));
  assert.ok(skillProfile(state,'valuation').mastery < 90);
  assert.equal(state.evidence[1].attempt,2);
});

test('assignment prerequisites require both mastery and confidence', () => {
  const state=emptyState();
  const northstar=ASSIGNMENTS.find((item)=>item.id==='CF-011');
  state.baseline.statements={score:80,confidence:0};
  assert.equal(assignmentStatus(state,northstar),'locked');
  for(let i=0;i<4;i+=1)recordEvidence(state,{activityId:`fs-${i}`,skill:'statements',conceptId:'working-capital',type:'practice',difficulty:2,score:90,correct:true,label:'Statements'});
  assert.equal(assignmentStatus(state,northstar),'ready');
});

test('daily brief remains stable for the same date', () => {
  const state=emptyState();
  state.profile={name:'Test Analyst',goal:'Investment Banking',interests:[]};
  const first=generateDailyBrief(state,new Date('2026-08-29T10:00:00Z'));
  const second=generateDailyBrief(state,new Date('2026-08-29T22:00:00Z'));
  assert.deepEqual(first.items.map((item)=>item.id),second.items.map((item)=>item.id));
  assert.ok(first.items.length >= 10);
});

test('seeded shuffle changes order without losing items', () => {
  const items=['a','b','c','d','e'];
  const shuffled=seededShuffle(items,'seed');
  assert.deepEqual([...shuffled].sort(),[...items].sort());
  assert.notDeepEqual(shuffled,items);
});
