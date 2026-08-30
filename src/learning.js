import { ASSIGNMENTS, CONCEPTS, CURRICULUM, PRACTICE_QUESTIONS, SKILLS } from './content.js';
import { clamp, nearlyEqual, parseFinanceAmount, parsePercent } from './finance.js';

export function hashSeed(value = '') {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed = 1) {
  let value = seed || 1;
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(items, seedValue) {
  const result = [...items];
  const random = seededRandom(typeof seedValue === 'number' ? seedValue : hashSeed(seedValue));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function evidenceWeight(record, now = Date.now()) {
  const ageDays = Math.max(0, (now - Number(record.timestamp || now)) / 86400000);
  const recency = Math.max(0.45, Math.pow(0.985, ageDays));
  const typeWeight = { lesson:0.25, recall:0.45, practice:0.65, diagnostic:0.55, calculation:0.85, reasoning:0.9, case:1.15, model:1.2, research:1.05, scenario:1, checkpoint:1.3 }[record.type] || 0.7;
  const difficulty = { 1:0.8, 2:1, 3:1.2 }[record.difficulty] || 1;
  const retry = record.attempt > 1 ? Math.max(0.35, 1 / record.attempt) : 1;
  return recency * typeWeight * difficulty * retry;
}

export function skillProfile(state, skillId) {
  const baseline = Number(state.baseline?.[skillId]?.score ?? 35);
  const records = (state.evidence || []).filter((item) => item.skill === skillId).slice(-80);
  if (!records.length) return { mastery:baseline, confidence:state.baseline?.[skillId]?.confidence || 12, evidenceCount:0, uniqueConcepts:0, status:'Low confidence' };

  let weighted = 0;
  let totalWeight = 0;
  records.forEach((record) => {
    const weight = evidenceWeight(record);
    weighted += clamp(record.score) * weight;
    totalWeight += weight;
  });
  const observed = totalWeight ? weighted / totalWeight : baseline;
  const mastery = clamp(baseline * 0.28 + observed * 0.72);
  const uniqueConcepts = new Set(records.map((item) => item.conceptId).filter(Boolean)).size;
  const evidenceTypes = new Set(records.map((item) => item.type)).size;
  const confidence = clamp(Math.min(100, records.length * 5 + uniqueConcepts * 6 + evidenceTypes * 8));
  const status = confidence < 35 ? 'Low confidence' : mastery >= 78 ? 'Strong' : mastery >= 62 ? 'Developing' : mastery >= 48 ? 'Needs work' : 'Foundation';
  return { mastery, confidence, evidenceCount:records.length, uniqueConcepts, status };
}

export function allSkillProfiles(state) {
  return Object.fromEntries(SKILLS.map((skill) => [skill.id, skillProfile(state, skill.id)]));
}

export function conceptProfile(state, conceptId) {
  const concept = CONCEPTS.find((item) => item.id === conceptId);
  const records = (state.evidence || []).filter((item) => item.conceptId === conceptId);
  if (!concept) return { mastery:0, confidence:0, evidenceCount:0 };
  if (!records.length) return { mastery:skillProfile(state, concept.skill).mastery * 0.65, confidence:0, evidenceCount:0 };
  const total = records.reduce((sum, record) => sum + evidenceWeight(record), 0);
  const mastery = total ? records.reduce((sum, record) => sum + record.score * evidenceWeight(record), 0) / total : 0;
  return { mastery:clamp(mastery), confidence:clamp(records.length * 12 + new Set(records.map((item) => item.type)).size * 12), evidenceCount:records.length };
}

export function recordEvidence(state, input) {
  const key = input.activityId || input.questionId || `${input.type}-${input.conceptId}`;
  const previousAttempts = (state.evidence || []).filter((item) => item.activityId === key).length;
  const record = {
    id:`ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp:Date.now(),
    sessionId:state.activeSessionId,
    activityId:key,
    skill:input.skill,
    conceptId:input.conceptId || '',
    type:input.type || 'practice',
    difficulty:input.difficulty || 1,
    attempt:previousAttempts + 1,
    score:clamp(input.score),
    correct:Boolean(input.correct ?? input.score >= 70),
    misconception:input.misconception || '',
    feedback:input.feedback || '',
    label:input.label || key,
    criteria:input.criteria || {},
  };
  state.evidence.push(record);
  state.evidence = state.evidence.slice(-600);
  state.activity.unshift({ id:record.id, date:record.timestamp, type:record.type, label:record.label, score:record.score, skill:record.skill });
  state.activity = state.activity.slice(0, 200);
  return record;
}

export function curriculumStatus(state, module) {
  const profiles = allSkillProfiles(state);
  const ready = (module.prerequisites || []).every(([skill, target]) => profiles[skill].mastery >= target && profiles[skill].confidence >= 25);
  const profile = profiles[module.skill];
  const applied = (state.evidence || []).some((item) => item.skill === module.skill && ['case','model','research','scenario','checkpoint'].includes(item.type) && item.score >= 70);
  if (profile.mastery >= module.target && profile.confidence >= 55 && applied) return 'mastered';
  if (!ready) return 'locked';
  if ((state.moduleProgress?.[module.id] || 0) > 0) return 'in progress';
  return 'ready';
}

export function assignmentStatus(state, assignment) {
  if (state.assignments?.[assignment.id]?.completed) return 'complete';
  const profiles = allSkillProfiles(state);
  const ready = (assignment.prerequisites || []).every(([skill, target]) => profiles[skill].mastery >= target && profiles[skill].confidence >= 20);
  return ready ? 'ready' : 'locked';
}

export function stageName(state) {
  const profiles = allSkillProfiles(state);
  const appliedCount = (state.evidence || []).filter((item) => ['case','model','research','scenario'].includes(item.type) && item.score >= 70).length;
  if (profiles.ma.mastery >= 70 && profiles.reasoning.mastery >= 66 && profiles.writing.mastery >= 60 && appliedCount >= 8) return 'Analyst II';
  if (profiles.valuation.mastery >= 58 && profiles.reasoning.mastery >= 52 && appliedCount >= 3) return 'Analyst I';
  return 'Foundation';
}

export function dueConcepts(state) {
  const lastByConcept = {};
  (state.evidence || []).forEach((item) => { lastByConcept[item.conceptId] = item; });
  return CONCEPTS.map((item) => {
    const last = lastByConcept[item.id];
    const profile = conceptProfile(state, item.id);
    const age = last ? (Date.now() - last.timestamp) / 86400000 : 999;
    const mistakeBoost = last && last.score < 70 ? 40 : 0;
    const dueScore = (100 - profile.mastery) + Math.min(35, age * 2) + mistakeBoost + (profile.confidence < 30 ? 18 : 0);
    return { ...item, dueScore, last };
  }).sort((a, b) => b.dueScore - a.dueScore);
}

export function generateDailyBrief(state, date = new Date()) {
  const key = dayKey(date);
  if (state.dailyBrief?.date === key && Array.isArray(state.dailyBrief.items) && state.dailyBrief.items.length) return state.dailyBrief;
  const due = dueConcepts(state);
  const weak = due.slice(0, 5);
  const goalSkill = { 'Investment Banking':'ma', 'Investing / Equity Research':'valuation', 'Corporate Finance':'corporate', Markets:'markets' }[state.profile?.goal] || 'reasoning';
  const goalConcepts = due.filter((item) => item.skill === goalSkill && !weak.some((weakItem) => weakItem.id === item.id)).slice(0, 3);
  const retention = seededShuffle(due.filter((item) => !weak.some((weakItem) => weakItem.id === item.id)), `${key}-${state.profile?.name || 'analyst'}`).slice(0, 2);
  const selected = [...weak, ...goalConcepts, ...retention].slice(0, 10);
  const items = selected.map((item, index) => {
    const question = PRACTICE_QUESTIONS.find((candidate) => candidate.conceptId === item.id) || PRACTICE_QUESTIONS[index];
    return { id:`brief-${key}-${index}`, conceptId:item.id, questionId:question.id, title:item.name, skill:item.skill, reason:item.last?.score < 70 ? 'Recent mistake' : item.last ? 'Retention due' : index < 5 ? 'Evidence gap' : 'Current development goal', completed:false };
  });
  const assignment = ASSIGNMENTS.find((candidate) => assignmentStatus(state, candidate) === 'ready');
  if (assignment) items.push({ id:`brief-${key}-assignment`, assignmentId:assignment.id, title:assignment.title, skill:assignment.skill, reason:'Ready applied work', completed:false });
  state.dailyBrief = { date:key, items };
  return state.dailyBrief;
}

export function chooseQuestion(state, skill = 'adaptive', seed = Date.now()) {
  const profiles = allSkillProfiles(state);
  const targetSkill = skill === 'adaptive'
    ? [...SKILLS].sort((a, b) => (profiles[a.id].mastery + profiles[a.id].confidence * 0.15) - (profiles[b.id].mastery + profiles[b.id].confidence * 0.15))[0].id
    : skill;
  const recent = new Set((state.evidence || []).slice(-12).map((item) => item.activityId));
  const pool = PRACTICE_QUESTIONS.filter((item) => item.skill === targetSkill);
  const ranked = pool.map((item) => {
    const profile = conceptProfile(state, item.conceptId);
    const seen = (state.evidence || []).filter((record) => record.activityId === item.id);
    const last = seen.at(-1);
    const weakness = 100 - profile.mastery;
    const novelty = seen.length ? 0 : 25;
    const mistake = last && last.score < 70 ? 35 : 0;
    const recentPenalty = recent.has(item.id) ? -60 : 0;
    return { item, score:weakness + novelty + mistake + recentPenalty + (item.difficulty || 1) * 3 };
  }).sort((a, b) => b.score - a.score);
  const candidates = ranked.slice(0, Math.min(5, ranked.length));
  return candidates[Math.floor(seededRandom(typeof seed === 'number' ? seed : hashSeed(seed))() * candidates.length)]?.item || PRACTICE_QUESTIONS[0];
}

export function shuffledQuestion(question, seed) {
  return { ...question, options:seededShuffle(question.options, `${seed}-${question.id}`) };
}

export function gradeQuestion(question, answer) {
  const correct = String(answer) === String(question.correct);
  return { correct, score:correct ? 100 : 0, feedback:question.explanation, misconception:correct ? '' : question.misconception };
}

export function scoreStructuredText(text, requiredKeywords = []) {
  const normalized = String(text).toLowerCase();
  const words = normalized.trim().split(/\s+/).filter(Boolean);
  const hits = requiredKeywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
  const criteria = {
    evidence:Math.min(25, hits.length * 5),
    mechanism:/because|therefore|waardoor|omdat|leidt|implies|betekent|mechanism/.test(normalized) ? 20 : 5,
    uncertainty:/risk|risico|uncertain|onzeker|may|kan |diligence|onderzoek/.test(normalized) ? 20 : 5,
    conclusion:/recommend|aanrad|conclusion|conclusie|reject|accept|proceed|doorgaan/.test(normalized) ? 20 : 5,
    clarity:words.length >= 35 ? 15 : words.length >= 18 ? 10 : 4,
  };
  return { score:clamp(Object.values(criteria).reduce((sum, value) => sum + value, 0)), criteria, hits };
}

export function gradeDeliverable(deliverable, value) {
  if (deliverable.type === 'number') {
    const expected = Number(deliverable.expected);
    let parsed = parsePercent(value);
    if (Math.abs(expected) >= 100 || String(value).toLowerCase().match(/[bmk]|milj|million|miljoen/)) {
      const unit = Math.abs(expected) < 10 ? 'B' : 'M';
      parsed = parseFinanceAmount(value, unit);
    }
    const correct = nearlyEqual(parsed, expected, deliverable.tolerance || 0.5);
    return { score:correct ? 100 : 0, correct, feedback:correct ? 'Calculation is within the accepted tolerance.' : `Recheck the calculation and units. Expected approximately ${expected}.`, criteria:{ accuracy:correct ? 100 : 0 } };
  }
  if (deliverable.type === 'select') {
    const correct = String(value) === String(deliverable.expected);
    return { score:correct ? 100 : 0, correct, feedback:correct ? 'Decision matches the case evidence.' : 'Review the mechanism before selecting the decision.', criteria:{ decision:correct ? 100 : 0 } };
  }
  const scored = scoreStructuredText(value, Array.isArray(deliverable.expected) ? deliverable.expected : []);
  return { ...scored, correct:scored.score >= 68, feedback:scored.score >= 68 ? 'The response connects evidence, mechanism and decision.' : 'Add case-specific evidence, explain the mechanism and state a decision or diligence action.' };
}

export function nextRecommendation(state) {
  const profiles = allSkillProfiles(state);
  const recentMistake = [...(state.evidence || [])].reverse().find((item) => item.score < 60 && item.conceptId);
  if (recentMistake) {
    const concept = CONCEPTS.find((item) => item.id === recentMistake.conceptId);
    return { type:'concept', id:concept?.id, title:`Correct ${concept?.name || 'recent weakness'}`, reason:`A recent ${recentMistake.label} attempt scored ${recentMistake.score}. Corrective evidence is now the highest-priority action.`, metric:conceptProfile(state, recentMistake.conceptId).mastery, skill:recentMistake.skill };
  }
  const blocker = ASSIGNMENTS.find((assignment) => assignmentStatus(state, assignment) === 'locked');
  if (blocker) {
    const missing = blocker.prerequisites.find(([skill, target]) => profiles[skill].mastery < target || profiles[skill].confidence < 20);
    if (missing) return { type:'practice', id:missing[0], title:`Build ${SKILLS.find((skill) => skill.id === missing[0])?.name}`, reason:`${blocker.title} requires ${missing[0]} mastery ${missing[1]}+ with supporting evidence.`, metric:profiles[missing[0]].mastery, skill:missing[0] };
  }
  const ready = ASSIGNMENTS.find((assignment) => assignmentStatus(state, assignment) === 'ready');
  if (ready) return { type:'assignment', id:ready.id, title:ready.title, reason:'Prerequisites are satisfied and this is the next applied evidence gap.', metric:profiles[ready.skill].mastery, skill:ready.skill };
  const nextModule = CURRICULUM.find((module) => curriculumStatus(state, module) !== 'mastered') || CURRICULUM[0];
  return { type:'curriculum', id:nextModule.id, title:nextModule.title, reason:'Selected from the next unmastered curriculum requirement.', metric:profiles[nextModule.skill].mastery, skill:nextModule.skill };
}

export function overallMastery(state) {
  const profiles = allSkillProfiles(state);
  return Math.round(SKILLS.reduce((sum, skill) => sum + profiles[skill.id].mastery, 0) / SKILLS.length);
}
