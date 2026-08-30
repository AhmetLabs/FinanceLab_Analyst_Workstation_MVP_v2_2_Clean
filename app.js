import { ASSIGNMENTS, CONCEPTS, CURRICULUM, DIAGNOSTIC_IDS, MARKET_SCENARIOS, PRACTICE_QUESTIONS, RESEARCH_PACKETS, SKILLS } from './src/content.js';
import { dcfModel, formatMoney, mergerModel, parseNumber, validateDcf } from './src/finance.js';
import {
  allSkillProfiles, assignmentStatus, chooseQuestion, conceptProfile, curriculumStatus, generateDailyBrief,
  gradeDeliverable, gradeQuestion, nextRecommendation, overallMastery, recordEvidence, scoreStructuredText,
  seededShuffle, shuffledQuestion, skillProfile, stageName,
} from './src/learning.js';
import { clearState, exportState, importState, loadState, saveState } from './src/state.js';
import { requestAiFeedback, requestFundCommittee } from './src/ai-client.js';
import { FUND_AGENTS, FUND_DATA_STATUS, FUND_SETTINGS, FUND_UNIVERSE, SECTOR_TAPE } from './src/fund-data.js';
import { addPaperPosition, buildCommittee, mergeAiCommittee, portfolioSnapshot, scanMarket } from './src/fund.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const viewRoot = $('#appView');
const title = $('#pageTitle');
const toast = $('#toast');
const modal = $('#modal');
const modalCard = $('#modalCard');
const onboarding = $('#onboarding');
const onboardCard = $('#onboardCard');

let state = loadState();
let route = { view:state.currentView || 'overview', id:null };
let selectedConcept = CONCEPTS[0].id;
let selectedSkill = 'valuation';
let practice = { question:null, result:null, briefItemId:null };
let activeModel = 'dcf';
let activePacket = 'atlas';
let activeScenario = MARKET_SCENARIOS[0].id;
let diagnostic = { profile:null, questions:[], index:0, answers:[] };
let aiRequestInFlight = false;
let fundRequestInFlight = false;

const pageNames = {
  overview:'Overview', assignments:'Assignments', assignment:'Assignment Workspace', models:'Models', research:'Investment Research',
  brief:'Daily Development Brief', knowledge:'Knowledge', skills:'Skills & Development Path', practice:'Adaptive Practice',
  review:'Development Review', markets:'Market Scenarios', settings:'Settings',
  fund:'AI Fund',
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function initials(name = 'Analyst') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function humanDate(value) {
  return new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function persist() {
  saveState(state);
  updateChrome();
}

function updateChrome() {
  const profile = state.profile || { name:'Analyst', goal:'Explore Finance' };
  const init = initials(profile.name);
  $$('.avatar').forEach((item) => { item.textContent = init; });
  $('#profileMini b').textContent = profile.name;
  $('#profileMini span').textContent = `${stageName(state)} · ${profile.goal}`;
  const ready = ASSIGNMENTS.filter((item) => assignmentStatus(state, item) === 'ready').length;
  $('#assignmentBadge').textContent = ready;
  $('#assignmentBadge').hidden = ready === 0;
  const sessionEvidence = state.evidence.filter((item) => item.sessionId === state.activeSessionId).length;
  $('#sessionStatus').innerHTML = `<i></i>${sessionEvidence} evidence item${sessionEvidence === 1 ? '' : 's'} this session`;
}

function navigate(view, id = null) {
  route = { view, id };
  if (pageNames[view] && view !== 'assignment') {
    state.currentView = view;
    saveState(state);
  }
  title.textContent = pageNames[view] || 'FinanceLab';
  $$('.nav').forEach((button) => button.classList.toggle('active', button.dataset.view === view || (view === 'assignment' && button.dataset.view === 'assignments')));
  if (view === 'overview') renderOverview();
  else if (view === 'assignments') renderAssignments();
  else if (view === 'assignment') renderAssignment(id);
  else if (view === 'brief') renderBrief();
  else if (view === 'knowledge') renderKnowledge(selectedConcept);
  else if (view === 'skills') renderSkills(selectedSkill);
  else if (view === 'practice') renderPractice();
  else if (view === 'models') renderModels(activeModel);
  else if (view === 'research') renderResearch(activePacket);
  else if (view === 'markets') renderMarkets(activeScenario);
  else if (view === 'fund') renderFund();
  else if (view === 'review') renderReview();
  else if (view === 'settings') renderSettings();
  else renderOverview();
  updateChrome();
  window.scrollTo({ top:0, behavior:'smooth' });
}

function progressBar(value, confidence = null) {
  return `<div class="bar"><i style="width:${Math.max(2, value)}%"></i></div>${confidence === null ? '' : `<div class="confidence" title="Evidence confidence"><i style="width:${confidence}%"></i></div>`}`;
}

function renderOverview() {
  const profiles = allSkillProfiles(state);
  const recommendation = nextRecommendation(state);
  const brief = generateDailyBrief(state);
  persist();
  const completedBrief = brief.items.filter((item) => item.completed).length;
  const current = ASSIGNMENTS.find((item) => assignmentStatus(state, item) === 'ready') || ASSIGNMENTS.find((item) => assignmentStatus(state, item) === 'locked');
  const completedAssignments = ASSIGNMENTS.filter((item) => assignmentStatus(state, item) === 'complete').length;
  const appliedEvidence = state.evidence.filter((item) => ['case','model','research','scenario','checkpoint'].includes(item.type)).length;
  const recent = state.activity.slice(0, 8);
  viewRoot.innerHTML = `<div class="workspace">
    <div class="sectionHead"><div><div class="eyebrow">EVIDENCE-BASED DEVELOPMENT</div><h2>${escapeHtml(state.profile?.name || 'Analyst')}'s workstation</h2><p>Work, feedback and recommendations are derived from demonstrated finance evidence—not XP or static demo progress.</p></div><span class="pill">${stageName(state)}</span></div>
    <div class="statGrid">
      <div class="statCard"><span>OVERALL MASTERY</span><b>${overallMastery(state)}%</b><small>Weighted across eight finance skills</small></div>
      <div class="statCard"><span>EVIDENCE RECORDS</span><b>${state.evidence.length}</b><small>${appliedEvidence} applied records</small></div>
      <div class="statCard"><span>ASSIGNMENTS</span><b>${completedAssignments}/${ASSIGNMENTS.length}</b><small>Completed with assessed deliverables</small></div>
      <div class="statCard"><span>DAILY BRIEF</span><b>${completedBrief}/${brief.items.length}</b><small>Stable evidence queue for today</small></div>
    </div>
    <div class="overviewGrid">
      <article class="panel actionHero">
        <div class="eyebrow">CURRENT WORK</div><h2>${escapeHtml(current?.title || 'No active assignment')}</h2>
        <div class="actionMeta"><span class="pill ${current ? assignmentStatus(state,current) : ''}">${current?.type || 'Review'}</span><span class="pill">${current?.difficulty || stageName(state)}</span><span class="pill">${current?.duration || 10} min</span></div>
        <p>${escapeHtml(current?.description || 'Review your evidence and select the next development action.')}</p>
        <div class="reasonBox"><b>Why now:</b> ${escapeHtml(current && assignmentStatus(state,current) === 'ready' ? 'Your current evidence satisfies the prerequisites for this applied assignment.' : 'This assignment is visible, but its evidence prerequisites still need work.')}</div>
        <div class="buttonRow"><button class="primary" data-action="${current && assignmentStatus(state,current)==='ready' ? 'open-assignment' : 'open-recommendation'}" data-id="${current?.id || ''}">${current && assignmentStatus(state,current)==='ready' ? 'Open assignment →' : 'Build prerequisites →'}</button><button class="secondary" data-action="navigate" data-view="assignments">View work queue</button></div>
      </article>
      <article class="panel actionHero">
        <div class="eyebrow">NEXT BEST ACTION</div><h2>${escapeHtml(recommendation.title)}</h2><p>${escapeHtml(recommendation.reason)}</p>
        <div class="mastery"><span>${escapeHtml(SKILLS.find((item)=>item.id===recommendation.skill)?.name || 'Current')} mastery</span><b>${recommendation.metric}%</b></div>${progressBar(recommendation.metric)}
        <div class="reasonBox">Recommendation engine considered recent mistakes, prerequisites, confidence and unfinished applied work.</div>
        <button class="primary" data-action="open-recommendation">Start recommended action →</button>
      </article>
      <article class="panel wide"><div class="panelHead compact"><div><div class="eyebrow">ANALYST DEVELOPMENT</div><h3>Skill evidence profile</h3></div><button class="textButton" data-action="navigate" data-view="skills">Open full development path →</button></div>
        <div class="skillGrid">${SKILLS.map((skill) => { const profile=profiles[skill.id]; return `<button class="skillCard" data-action="open-skill" data-id="${skill.id}"><div class="masteryRow"><div><h3>${escapeHtml(skill.name)}</h3><span>${profile.status}</span></div><strong>${profile.mastery}</strong></div>${progressBar(profile.mastery,profile.confidence)}<div class="subtle">${profile.evidenceCount} records · ${profile.confidence}% confidence</div></button>`; }).join('')}</div>
      </article>
      <article class="panel wide"><div class="panelHead compact"><div><div class="eyebrow">RECENT EVIDENCE</div><h3>Actual completed work</h3></div><button class="textButton" data-action="navigate" data-view="review">Open development review →</button></div>
        ${recent.length ? `<div class="dynamicTable"><table><thead><tr><th>ACTIVITY</th><th>TYPE</th><th>SKILL</th><th>SCORE</th><th>DATE</th></tr></thead><tbody>${recent.map((item)=>`<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(SKILLS.find((skill)=>skill.id===item.skill)?.name || item.skill)}</td><td>${item.score}%</td><td>${humanDate(item.date)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="emptyState"><h3>No assessed work yet</h3><p>Complete a diagnostic, drill, case or model to create the first evidence record.</p></div>`}
      </article>
    </div>
  </div>`;
}

function renderAssignments(filter = 'All') {
  const types = ['All', ...new Set(ASSIGNMENTS.map((item) => item.type))];
  const shown = filter === 'All' ? ASSIGNMENTS : ASSIGNMENTS.filter((item) => item.type === filter);
  const statuses = ASSIGNMENTS.map((item) => assignmentStatus(state, item));
  viewRoot.innerHTML = `<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">ADAPTIVE WORK QUEUE</div><h2>Assignments</h2><p>Cases, models, research briefs and scenarios are labelled honestly. Unlocks require mastery plus evidence confidence.</p></div><div class="queueSummary"><span><b>${statuses.filter((s)=>s==='ready').length}</b> ready</span><span><b>${statuses.filter((s)=>s==='complete').length}</b> complete</span><span><b>${statuses.filter((s)=>s==='locked').length}</b> locked</span></div></div>
    <div class="assignmentFilters">${types.map((type)=>`<button class="filterButton ${type===filter?'active':''}" data-action="assignment-filter" data-id="${escapeHtml(type)}">${escapeHtml(type)}</button>`).join('')}</div>
    <div class="assignmentGrid">${shown.map((item) => {
      const status=assignmentStatus(state,item); const result=state.assignments[item.id];
      const missing=(item.prerequisites||[]).filter(([skill,target])=>skillProfile(state,skill).mastery<target || skillProfile(state,skill).confidence<20);
      return `<article class="assignmentCard ${status}"><div class="assignmentTop"><div><span class="assignmentType">${item.id} · ${escapeHtml(item.type)}</span><h3>${escapeHtml(item.title)}</h3></div><div class="scoreBadge">${result?.score ?? '—'}${result?.score!==undefined?'<small>%</small>':''}</div></div><p>${escapeHtml(item.description)}</p><div class="actionMeta"><span class="pill ${status}">${status}</span><span class="pill">${escapeHtml(item.area)}</span><span class="pill">${item.duration} min</span></div><div class="reasonBox">${status==='locked' ? `Requires ${missing.map(([skill,target])=>`${SKILLS.find((s)=>s.id===skill)?.name} ${target}+ with evidence`).join(' · ')}` : status==='complete' ? 'Evidence recorded. You can review or improve the submission.' : 'Prerequisites met. Ready for applied work.'}</div><div class="buttonRow"><button class="${status==='locked'?'secondary':'primary'}" data-action="${status==='locked'?'open-skill':'open-assignment'}" data-id="${status==='locked'?(missing[0]?.[0]||item.skill):item.id}">${status==='locked'?'Inspect prerequisite':status==='complete'?'Review work':'Open assignment →'}</button></div></article>`;
    }).join('')}</div></div>`;
}

function inputForDeliverable(item, previous = '') {
  if (item.type === 'select') return `<select class="fieldControl" name="${item.id}"><option value="">Select a decision…</option>${item.options.map((option)=>`<option value="${escapeHtml(option)}" ${previous===option?'selected':''}>${escapeHtml(option.replaceAll('-',' '))}</option>`).join('')}</select>`;
  if (item.type === 'text') return `<textarea class="fieldControl" name="${item.id}" placeholder="Use case-specific evidence, explain the mechanism and state the implication.">${escapeHtml(previous)}</textarea>`;
  return `<input class="fieldControl" name="${item.id}" inputmode="decimal" value="${escapeHtml(previous)}" placeholder="Enter value with units where relevant">`;
}

function renderAssignment(id) {
  const assignment = ASSIGNMENTS.find((item) => item.id === id);
  if (!assignment) return navigate('assignments');
  if (assignment.route === 'models') { activeModel = assignment.model || 'dcf'; return navigate('models'); }
  if (assignment.route === 'research') { activePacket = assignment.packet || 'atlas'; return navigate('research'); }
  if (assignment.route === 'markets') { activeScenario = assignment.scenario || MARKET_SCENARIOS[0].id; return navigate('markets'); }
  const stored = state.assignments[id] || { answers:{}, results:[] };
  title.textContent = assignment.title;
  viewRoot.innerHTML = `<div class="workspace"><div class="sectionHead"><div><button class="back" data-action="navigate" data-view="assignments">← Back to assignments</button><div class="eyebrow">${assignment.id} · ${escapeHtml(assignment.type)} · ${escapeHtml(assignment.difficulty)}</div><h2>${escapeHtml(assignment.title)}</h2><p>${escapeHtml(assignment.description)}</p></div>${stored.completed?`<div class="statCard"><span>BEST SCORE</span><b>${stored.score}%</b><small>Evidence recorded</small></div>`:''}</div>
    <div class="workbench"><div><article class="panel"><div class="eyebrow">CASE DATA ROOM</div><h3>Facts supplied</h3><div class="dataRoom">${assignment.facts.map(([label,value])=>`<div class="fact"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('')}</div></article>
      <form id="assignmentForm">${assignment.deliverables.map((deliverable,index)=>{
        const result=stored.results?.find((item)=>item.id===deliverable.id); return `<section class="deliverable ${result?.correct?'completed':''}"><div class="eyebrow">DELIVERABLE ${String(index+1).padStart(2,'0')} · ${escapeHtml(CONCEPTS.find((item)=>item.id===deliverable.conceptId)?.name || deliverable.conceptId)}</div><h4>${escapeHtml(deliverable.label)}</h4>${deliverable.guidance?`<p>${escapeHtml(deliverable.guidance)}</p>`:''}${inputForDeliverable(deliverable,stored.answers?.[deliverable.id]||'')}${result?`<div class="feedback ${result.correct?'good':'review'}"><b>${result.score}/100.</b> ${escapeHtml(result.feedback)}</div>`:''}</section>`;
      }).join('')}<div class="buttonRow" style="margin-top:12px"><button class="primary" type="submit">Assess complete assignment →</button><span class="subtle">Every deliverable creates criterion-level evidence.</span></div></form></div>
      <aside class="panel caseRail"><div class="eyebrow">ASSIGNMENT CONTROL</div><h3>${stored.completed?'Submission review':'Required work'}</h3><p>${assignment.deliverables.length} assessed deliverables. Credit is never granted for prefilled calculations.</p>${assignment.deliverables.map((deliverable,index)=>{const result=stored.results?.find((item)=>item.id===deliverable.id);return `<div class="step ${result?.correct?'done':result?'current':''}"><i>${result?.correct?'✓':String(index+1).padStart(2,'0')}</i><div><b>${escapeHtml(deliverable.label)}</b><span>${result?`${result.score}/100`:'Not assessed'}</span></div></div>`}).join('')}${stored.score!==undefined?`<div class="caseResult"><span class="subtle">OVERALL</span><strong>${stored.score}%</strong>${progressBar(stored.score)}<p class="muted">${stored.completed?'Completion evidence is active. Retake to improve weak criteria.':'Strengthen failed deliverables before this assignment counts as complete.'}</p></div>`:''}${stored.results?.length?aiCoachButton('assignment',assignment.id):''}</aside></div></div>`;
  $('#assignmentForm').addEventListener('submit', (event) => submitAssignment(event, assignment));
}

function submitAssignment(event, assignment) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const answers = Object.fromEntries(data.entries());
  const results = assignment.deliverables.map((deliverable) => ({ id:deliverable.id, ...gradeDeliverable(deliverable, answers[deliverable.id]) }));
  const score = Math.round(results.reduce((sum,item)=>sum+item.score,0)/results.length);
  const completed = score >= 70 && results.every((item)=>item.score>=55);
  state.assignments[assignment.id] = { answers, results, score:Math.max(state.assignments[assignment.id]?.score || 0,score), completed:state.assignments[assignment.id]?.completed || completed, updatedAt:Date.now() };
  results.forEach((result,index) => {
    const deliverable=assignment.deliverables[index];
    recordEvidence(state,{ activityId:`${assignment.id}-${deliverable.id}`, skill:assignment.skill, conceptId:deliverable.conceptId, type:assignment.type==='Checkpoint'?'checkpoint':'case', difficulty:assignment.difficulty.includes('II')?3:2, score:result.score, correct:result.correct, misconception:result.correct?'':CONCEPTS.find((item)=>item.id===deliverable.conceptId)?.mistake, feedback:result.feedback, criteria:result.criteria, label:`${assignment.title} · ${deliverable.label}` });
  });
  markBriefComplete({ assignmentId:assignment.id });
  persist();
  renderAssignment(assignment.id);
  showToast(completed ? `Assignment complete · ${score}/100` : `Review required · ${score}/100`);
}

function renderBrief() {
  const brief=generateDailyBrief(state); persist();
  const complete=brief.items.filter((item)=>item.completed).length;
  viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">${brief.date} · EVIDENCE QUEUE</div><h2>Daily Development Brief</h2><p>A stable daily mix of evidence gaps, retention work, recent mistakes and applied assignments. No streaks or reward farming.</p></div><div class="statCard"><span>PROGRESS</span><b>${complete}/${brief.items.length}</b><small>${Math.round(complete/brief.items.length*100)}% complete</small></div></div><article class="panel"><div class="briefList">${brief.items.map((item,index)=>`<div class="briefItem ${item.completed?'done':''}"><div class="briefIndex">${item.completed?'✓':String(index+1).padStart(2,'0')}</div><div><b>${escapeHtml(item.title)}</b><span>${escapeHtml(SKILLS.find((skill)=>skill.id===item.skill)?.name || item.skill)} · ${escapeHtml(item.reason)}</span></div><button class="${item.completed?'secondary':'primary'}" data-action="${item.assignmentId?'open-assignment':'brief-question'}" data-id="${item.assignmentId || item.questionId}" data-brief="${item.id}">${item.completed?'Review':'Start →'}</button></div>`).join('')}</div></article></div>`;
}

function renderKnowledge(conceptId = selectedConcept, filter = '', skillFilter = 'all') {
  selectedConcept=conceptId;
  const item=CONCEPTS.find((concept)=>concept.id===conceptId)||CONCEPTS[0];
  const shown=CONCEPTS.filter((concept)=>(skillFilter==='all'||concept.skill===skillFilter)&&(!filter||`${concept.name} ${concept.definition} ${concept.formula}`.toLowerCase().includes(filter.toLowerCase())));
  const profile=conceptProfile(state,item.id);
  viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">DEVELOPMENT LIBRARY · ${CONCEPTS.length} CONCEPTS</div><h2>Knowledge</h2><p>Definitions connect directly to formulas, misconceptions, evidence and applied work.</p></div><button class="primary" data-action="practice-concept" data-id="${item.id}">Practice selected concept →</button></div><div class="knowledgeLayout"><aside class="panel knowledgeList"><input class="searchInput" id="conceptSearch" value="${escapeHtml(filter)}" placeholder="Search concepts…"><select class="fieldControl" id="conceptSkillFilter" style="margin-top:8px"><option value="all">All skills</option>${SKILLS.map((skill)=>`<option value="${skill.id}" ${skill.id===skillFilter?'selected':''}>${escapeHtml(skill.name)}</option>`).join('')}</select><div style="margin-top:8px">${shown.map((concept)=>`<button class="conceptLink ${concept.id===item.id?'active':''}" data-action="open-concept" data-id="${concept.id}"><b>${escapeHtml(concept.name)}</b><span>${escapeHtml(SKILLS.find((skill)=>skill.id===concept.skill)?.name)}</span></button>`).join('')}</div></aside><article class="panel conceptHero"><div class="eyebrow">${escapeHtml(SKILLS.find((skill)=>skill.id===item.skill)?.name)} · DIFFICULTY ${item.difficulty}</div><h2>${escapeHtml(item.name)}</h2><p class="muted">${escapeHtml(item.definition)}</p><div class="mastery"><span>Concept mastery · ${profile.evidenceCount} records</span><b>${profile.mastery}%</b></div>${progressBar(profile.mastery,profile.confidence)}${item.formula?`<div class="formulaCard">${escapeHtml(item.formula)}</div>`:''}<div class="conceptSections"><article><div class="eyebrow">WORKED APPLICATION</div><h4>How to use it</h4><p>${escapeHtml(item.example)}</p></article><article><div class="eyebrow">COMMON ANALYST MISTAKE</div><h4>What to avoid</h4><p>${escapeHtml(item.mistake || 'Keep the conclusion proportionate to the evidence available.')}</p></article><article><div class="eyebrow">CONNECTED CONCEPTS</div><div class="connectionList">${item.connections.map((id)=>{const connected=CONCEPTS.find((concept)=>concept.id===id);return connected?`<button class="pill" data-action="open-concept" data-id="${connected.id}">${escapeHtml(connected.name)}</button>`:''}).join('')}</div></article><article><div class="eyebrow">EVIDENCE ACTIONS</div><h4>Prove understanding</h4><p>Complete recall, calculation or applied work. Opening this page does not increase mastery.</p><button class="secondary" data-action="practice-concept" data-id="${item.id}">Open targeted drill</button></article></div></article></div></div>`;
  $('#conceptSearch').addEventListener('input',(event)=>renderKnowledge(selectedConcept,event.target.value,$('#conceptSkillFilter').value));
  $('#conceptSkillFilter').addEventListener('change',(event)=>renderKnowledge(selectedConcept,$('#conceptSearch').value,event.target.value));
}

function renderSkills(skillId = selectedSkill) {
  selectedSkill=skillId;
  const profiles=allSkillProfiles(state); const selected=SKILLS.find((skill)=>skill.id===skillId)||SKILLS[0]; const evidence=state.evidence.filter((item)=>item.skill===selected.id).slice().reverse().slice(0,10);
  viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">SKILL INTELLIGENCE · ${stageName(state)}</div><h2>Skills & Development Path</h2><p>Mastery combines accuracy, difficulty, evidence type, retries, recency and breadth. Confidence shows how much evidence supports the score.</p></div><div class="statCard"><span>OVERALL</span><b>${overallMastery(state)}%</b><small>${state.evidence.length} evidence records</small></div></div><div class="skillsLayout"><div><div class="skillCards">${SKILLS.map((skill)=>{const profile=profiles[skill.id];return `<button class="skillCard ${skill.id===selected.id?'active':''}" data-action="open-skill" data-id="${skill.id}"><div class="masteryRow"><div><h3>${escapeHtml(skill.name)}</h3><span>${profile.status}</span></div><strong>${profile.mastery}</strong></div>${progressBar(profile.mastery,profile.confidence)}<div class="subtle">${profile.evidenceCount} records · ${profile.uniqueConcepts} concepts · ${profile.confidence}% confidence</div></button>`}).join('')}</div><article class="panel" style="margin-top:14px"><div class="eyebrow">EVIDENCE INSPECTOR</div><h3>${escapeHtml(selected.name)}</h3><p class="muted">${escapeHtml(selected.description)}</p><div class="evidenceDetails">${evidence.length?evidence.map((record)=>`<div class="evidenceRecord"><b>${escapeHtml(record.label)} · ${record.score}/100</b><span>${humanDate(record.timestamp)} · ${escapeHtml(record.type)} · attempt ${record.attempt}${record.misconception?` · misconception: ${escapeHtml(record.misconception)}`:''}</span></div>`).join(''):'<div class="emptyState">No direct evidence yet. Complete a diagnostic or targeted drill.</div>'}</div></article></div><article class="panel"><div class="eyebrow">MASTERY-BASED CURRICULUM</div><h3>Analyst Development Path</h3><div class="pathGrid">${CURRICULUM.map((module)=>{const status=curriculumStatus(state,module);const profile=profiles[module.skill];return `<div class="pathModule ${status}"><div class="masteryRow"><div><b>${escapeHtml(module.title)}</b><span>${escapeHtml(module.track)} · ${status}</span></div><strong>${profile.mastery}%</strong></div><div class="nodeRow">${module.nodes.map((node,index)=>`<span class="nodeDot ${(state.moduleProgress[module.id]||0)>index?'done':''}" title="${node}">${node.slice(0,1).toUpperCase()}</span>`).join('')}</div><span>${status==='locked'?`Requires ${(module.prerequisites||[]).map(([skill,target])=>`${SKILLS.find((item)=>item.id===skill)?.name} ${target}+`).join(' · ')}`:`Target ${module.target}% plus applied evidence`}</span></div>`}).join('')}</div></article></div></div>`;
}

function startPractice(skill='adaptive', conceptId=null, questionId=null, briefItemId=null) {
  let question=questionId?PRACTICE_QUESTIONS.find((item)=>item.id===questionId):null;
  if(!question&&conceptId) question=PRACTICE_QUESTIONS.find((item)=>item.conceptId===conceptId);
  if(!question) question=chooseQuestion(state,skill,`${Date.now()}-${state.evidence.length}`);
  practice={question:shuffledQuestion(question,`${state.activeSessionId}-${state.evidence.length}`),result:null,briefItemId};
  navigate('practice');
}

function renderPractice() {
  if(!practice.question) startPractice('adaptive');
  const question=practice.question; const profiles=allSkillProfiles(state); const attempts=state.evidence.filter((item)=>['practice','recall','calculation'].includes(item.type)); const correct=attempts.filter((item)=>item.score>=70).length;
  viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">ADAPTIVE QUESTION ENGINE · ${PRACTICE_QUESTIONS.length} ITEMS</div><h2>Practice</h2><p>Selection prioritises weak concepts, recent mistakes, due retention and evidence gaps. Answer order is shuffled.</p></div><span class="pill">${question.type} · difficulty ${question.difficulty}</span></div><div class="practiceLayout"><aside class="panel practiceControl"><div class="eyebrow">PRACTICE MODE</div><select class="fieldControl" id="practiceSkill"><option value="adaptive">Adaptive — weakest evidence</option>${SKILLS.map((skill)=>`<option value="${skill.id}">${escapeHtml(skill.name)} · ${profiles[skill.id].mastery}%</option>`).join('')}</select><div class="practiceStats"><div><span>ATTEMPTS</span><b>${attempts.length}</b></div><div><span>ACCURACY</span><b>${attempts.length?Math.round(correct/attempts.length*100):'—'}${attempts.length?'%':''}</b></div></div><div class="reasonBox">Selected concept: <b>${escapeHtml(CONCEPTS.find((item)=>item.id===question.conceptId)?.name || question.conceptId)}</b><br>${question.misconception?`Misconception monitored: ${escapeHtml(question.misconception)}`:'Evidence breadth is currently the main selection reason.'}</div><button class="secondary" data-action="next-question">Select another question</button></aside><article class="panel practiceQuestion"><div class="eyebrow">${escapeHtml(SKILLS.find((skill)=>skill.id===question.skill)?.name)} · ${escapeHtml(question.type)}</div><h2>${escapeHtml(question.prompt)}</h2><div class="optionList">${question.options.map((option,index)=>`<button class="practiceOption ${practice.result&&option===question.correct?'correctOption':''} ${practice.result&&option===practice.result.answer&&option!==question.correct?'wrongOption':''}" data-action="answer-question" data-answer="${escapeHtml(option)}" ${practice.result?'disabled':''}><i>${String.fromCharCode(65+index)}</i><span>${escapeHtml(option)}</span></button>`).join('')}</div>${practice.result?`<div class="feedback ${practice.result.correct?'good':'review'}"><b>${practice.result.correct?'Correct':'Review required'} · ${practice.result.score}/100.</b> ${escapeHtml(practice.result.feedback)}${practice.result.misconception?`<br><b>Misconception:</b> ${escapeHtml(practice.result.misconception)}`:''}</div><div class="buttonRow" style="margin-top:12px"><button class="primary" data-action="next-question">Next adaptive question →</button><button class="secondary" data-action="open-concept" data-id="${question.conceptId}">Review concept</button></div>`:''}</article></div></div>`;
  $('#practiceSkill').addEventListener('change',(event)=>startPractice(event.target.value));
}

function answerQuestion(answer) {
  if(practice.result) return;
  const result=gradeQuestion(practice.question,answer); practice.result={...result,answer};
  recordEvidence(state,{activityId:practice.question.id,skill:practice.question.skill,conceptId:practice.question.conceptId,type:practice.question.type==='recall'?'recall':'practice',difficulty:practice.question.difficulty,score:result.score,correct:result.correct,misconception:result.misconception,feedback:result.feedback,label:`Practice · ${CONCEPTS.find((item)=>item.id===practice.question.conceptId)?.name}`});
  if(result.correct&&practice.briefItemId) markBriefComplete({briefItemId:practice.briefItemId});
  persist(); renderPractice();
}

const DCF_DEFAULT={revenue:520,ebitdaMargin:24,growth:11,taxRate:25,daPercent:3,capexPercent:5,nwcPercent:1.5,wacc:9.5,terminalGrowth:3,debt:260,cash:80,shares:120};

function renderModels(model=activeModel) {
  activeModel=model;
  viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">MODELING WORKSPACE</div><h2>Models</h2><p>Build assumptions, audit finance logic and interpret the output. Valid inputs alone no longer guarantee 100/100.</p></div><span class="pill model">DCF · Comps · Merger</span></div><div class="modelTabs">${[['dcf','DCF Model'],['comps','Comparable Companies'],['merger','Merger Model']].map(([id,label])=>`<button class="modelTab ${id===model?'active':''}" data-action="model-tab" data-id="${id}">${label}</button>`).join('')}</div>${model==='dcf'?renderDcfModel():model==='comps'?renderCompsModel():renderMergerModel()}</div>`;
  const form=$(`#${model}Form`); if(form) form.addEventListener('submit',model==='dcf'?submitDcf:model==='comps'?submitComps:submitMerger);
}

function renderDcfModel() {
  const saved=state.models.dcf; const values={...DCF_DEFAULT,...(saved?.inputs||{})};
  const fields=[['revenue','Revenue — Year 0 (€M)'],['ebitdaMargin','EBITDA Margin (%)'],['growth','Year 1 Growth (%)'],['taxRate','Tax Rate (%)'],['daPercent','D&A / Revenue (%)'],['capexPercent','CapEx / Revenue (%)'],['nwcPercent','ΔNWC / Revenue (%)'],['wacc','WACC (%)'],['terminalGrowth','Terminal Growth (%)'],['debt','Debt (€M)'],['cash','Cash (€M)'],['shares','Diluted Shares (M)']];
  return `<div class="modelGrid"><form class="panel" id="dcfForm"><div class="eyebrow">ASSUMPTIONS & INTERPRETATION</div><h3>Veltrix five-year DCF</h3><div class="modelFields">${fields.map(([id,label])=>`<label>${label}<input class="fieldControl" name="${id}" value="${values[id]}"></label>`).join('')}</div><label class="questionLabel">VALUATION CONCLUSION</label><textarea class="fieldControl" name="conclusion" placeholder="Interpret WACC, terminal growth, terminal-value dependence and the EV-to-Equity bridge.">${escapeHtml(saved?.conclusion||'')}</textarea><button class="primary" type="submit" style="margin-top:10px">Calculate, audit & record →</button><div id="modelFeedback"></div></form><article class="panel" id="modelOutput">${saved?.output?dcfOutputHtml(saved.output,saved.score):`<div class="emptyState"><h3>Build the operating case</h3><p>Forecast, discounting audit, valuation bridge and sensitivity will appear here.</p></div>`}</article></div>`;
}

function dcfOutputHtml(result,score) {
  return `<div class="eyebrow">DCF OUTPUT · SCORE ${score}/100</div><div class="outputGrid"><div><span>ENTERPRISE VALUE</span><b>${formatMoney(result.enterpriseValue)}</b></div><div><span>EQUITY VALUE</span><b>${formatMoney(result.equityValue)}</b></div><div><span>VALUE / SHARE</span><b>€${result.perShare.toFixed(2)}</b></div><div><span>TERMINAL / EV</span><b>${Math.round(result.terminalShare)}%</b></div></div><div class="dynamicTable"><table><thead><tr><th>YEAR</th><th>GROWTH</th><th>REVENUE</th><th>EBITDA</th><th>UFCF</th><th>DISCOUNT</th><th>PV UFCF</th></tr></thead><tbody>${result.forecast.map((row)=>`<tr><td>Y${row.year}</td><td>${row.growth.toFixed(1)}%</td><td>${formatMoney(row.revenue)}</td><td>${formatMoney(row.ebitda)}</td><td>${formatMoney(row.ufcf)}</td><td>${row.discountFactor.toFixed(3)}</td><td>${formatMoney(row.presentValue)}</td></tr>`).join('')}</tbody></table></div><div class="auditFlag">Terminal Value was measured at Year 5 and discounted to present value. ${result.terminalShare>75?'Terminal Value exceeds 75% of EV: the valuation is highly assumption-sensitive.':'Terminal-value dependence is within the prototype review threshold.'}</div>${sensitivityHtml(result)}${aiCoachButton('model','dcf','Review my DCF conclusion')}</div>`;
}

function sensitivityHtml(result) {
  const base=state.models.dcf?.inputs||DCF_DEFAULT; const waccs=[base.wacc-1,base.wacc-.5,base.wacc,base.wacc+.5,base.wacc+1]; const growths=[base.terminalGrowth-.5,base.terminalGrowth,base.terminalGrowth+.5];
  return `<div class="dynamicTable"><table class="sensitivityTable"><thead><tr><th>g / WACC</th>${waccs.map((w)=>`<th>${w.toFixed(1)}%</th>`).join('')}</tr></thead><tbody>${growths.map((g)=>`<tr><th>${g.toFixed(1)}%</th>${waccs.map((w)=>{try{const value=dcfModel(base,w,g).perShare;return `<td class="${w===base.wacc&&g===base.terminalGrowth?'selectedCell':''}">€${value.toFixed(2)}</td>`}catch{return '<td>—</td>'}}).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function submitDcf(event) {
  event.preventDefault(); const data=Object.fromEntries(new FormData(event.currentTarget).entries()); const inputs=Object.fromEntries(Object.entries(data).filter(([key])=>key!=='conclusion').map(([key,value])=>[key,parseNumber(value)])); const conclusion=data.conclusion||''; const error=validateDcf(inputs);
  if(error){$('#modelFeedback').innerHTML=`<div class="feedback review"><b>Review assumptions.</b> ${escapeHtml(error)}</div>`;return}
  const output=dcfModel(inputs); const interpretation=scoreStructuredText(conclusion,['wacc','terminal','cash flow','equity','sensitivity']); const assumptionScore=(output.terminalShare<82?25:15)+(inputs.wacc>inputs.terminalGrowth+1?20:0)+(inputs.growth<30&&inputs.ebitdaMargin<60?15:5); const score=Math.min(100,Math.round(assumptionScore+interpretation.score*.4));
  state.models.dcf={inputs,conclusion,output,score,completed:score>=70,updatedAt:Date.now()}; recordEvidence(state,{activityId:'model-dcf',skill:'valuation',conceptId:'dcf',type:'model',difficulty:2,score,correct:score>=70,misconception:output.terminalShare>82?'terminal-value concentration':'',feedback:`DCF audit score ${score}.`,criteria:{assumptions:assumptionScore,interpretation:interpretation.score},label:'Veltrix DCF Model'}); persist(); renderModels('dcf'); showToast(`DCF recorded · ${score}/100`);
}

function renderCompsModel() {const saved=state.models.comps;return `<div class="modelGrid"><form class="panel" id="compsForm"><div class="eyebrow">PEER SELECTION & VALUATION</div><h3>Helios Comparable Companies</h3><div class="dataRoom"><div class="fact"><span>Peer A</span><b>6.8×</b></div><div class="fact"><span>Peer B</span><b>7.6×</b></div><div class="fact"><span>Peer C</span><b>8.0×</b></div><div class="fact"><span>Peer D</span><b>8.2×</b></div><div class="fact"><span>Peer E</span><b>14.9×</b></div></div><div class="modelFields" style="margin-top:10px"><label>Target EBITDA (€M)<input class="fieldControl" name="ebitda" value="200"></label><label>Selected multiple<input class="fieldControl" name="multiple" value="${saved?.inputs?.multiple||''}"></label><label>Debt (€M)<input class="fieldControl" name="debt" value="400"></label><label>Cash (€M)<input class="fieldControl" name="cash" value="100"></label><label>Shares (M)<input class="fieldControl" name="shares" value="100"></label></div><label class="questionLabel">SELECTION RATIONALE</label><textarea class="fieldControl" name="conclusion" placeholder="Identify the outlier, defend the selected multiple and interpret the equity-value range.">${escapeHtml(saved?.conclusion||'')}</textarea><button class="primary" type="submit" style="margin-top:10px">Value company & record →</button></form><article class="panel">${saved?`<div class="eyebrow">COMPS OUTPUT · ${saved.score}/100</div><div class="outputGrid"><div><span>IMPLIED EV</span><b>${formatMoney(saved.output.ev)}</b></div><div><span>EQUITY VALUE</span><b>${formatMoney(saved.output.equity)}</b></div><div><span>VALUE / SHARE</span><b>€${saved.output.perShare.toFixed(2)}</b></div><div><span>SELECTED MULTIPLE</span><b>${saved.inputs.multiple.toFixed(1)}×</b></div></div><div class="auditFlag">14.9× is isolated from the 6.8×–8.2× cluster. The selected multiple requires an explicit comparability rationale.</div>${aiCoachButton('model','comps','Review my comps rationale')}`:`<div class="emptyState"><h3>Select, bridge and defend</h3><p>Do not use a median mechanically. Identify comparability and outlier issues.</p></div>`}</article></div>`}

function submitComps(event){event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget).entries());const inputs={ebitda:parseNumber(data.ebitda),multiple:parseNumber(data.multiple),debt:parseNumber(data.debt),cash:parseNumber(data.cash),shares:parseNumber(data.shares)};if(Object.values(inputs).some((value)=>!Number.isFinite(value))){showToast('Complete every model input.');return}const output={ev:inputs.ebitda*inputs.multiple};output.equity=output.ev-inputs.debt+inputs.cash;output.perShare=output.equity/inputs.shares;const rationale=scoreStructuredText(data.conclusion,['peer','outlier','multiple','equity']);const multipleScore=inputs.multiple>=7.4&&inputs.multiple<=8.4?45:15;const score=Math.min(100,Math.round(multipleScore+rationale.score*.55));state.models.comps={inputs,conclusion:data.conclusion,output,score,completed:score>=70};recordEvidence(state,{activityId:'model-comps',skill:'valuation',conceptId:'comps',type:'model',difficulty:2,score,correct:score>=70,feedback:'Peer selection, EV bridge and rationale assessed.',criteria:{selection:multipleScore,rationale:rationale.score},label:'Helios Comparable Companies Model'});persist();renderModels('comps');showToast(`Comps model · ${score}/100`)}

function renderMergerModel(){const saved=state.models.merger;return `<div class="modelGrid"><form class="panel" id="mergerForm"><div class="eyebrow">FINANCING-ADJUSTED ACCRETION</div><h3>Crestview Merger Model</h3><div class="modelFields">${[['purchasePrice','Purchase Price (€M)',1200],['cashPercent','Cash (%)',25],['debtPercent','Debt (%)',45],['stockPercent','Stock (%)',30],['buyerSharePrice','Buyer Share Price (€)',50],['buyerNetIncome','Buyer Net Income (€M)',500],['buyerShares','Buyer Shares (M)',150],['targetNetIncome','Target Net Income (€M)',95],['synergies','After-tax Synergies (€M)',35],['interestRate','Interest Rate (%)',5.5],['taxRate','Tax Rate (%)',25],['integrationCosts','After-tax Integration Cost (€M)',18]].map(([id,label,value])=>`<label>${label}<input class="fieldControl" name="${id}" value="${saved?.inputs?.[id]??value}"></label>`).join('')}</div><label class="questionLabel">FINANCING RISK CONCLUSION</label><textarea class="fieldControl" name="conclusion" placeholder="Connect new debt, interest, new shares, synergies and accretion to value risk.">${escapeHtml(saved?.conclusion||'')}</textarea><button class="primary" type="submit" style="margin-top:10px">Run merger model →</button></form><article class="panel">${saved?`<div class="eyebrow">MERGER OUTPUT · ${saved.score}/100</div><div class="outputGrid"><div><span>NEW DEBT</span><b>${formatMoney(saved.output.debtValue)}</b></div><div><span>NEW SHARES</span><b>${saved.output.newShares.toFixed(1)}M</b></div><div><span>AFTER-TAX INTEREST</span><b>${formatMoney(saved.output.interest,1)}</b></div><div><span>ACCRETION</span><b>${saved.output.accretion.toFixed(1)}%</b></div></div><div class="dynamicTable"><table><tbody><tr><th>Pre-deal EPS</th><td>€${saved.output.preDealEPS.toFixed(2)}</td></tr><tr><th>Pro Forma Net Income</th><td>${formatMoney(saved.output.proFormaNetIncome)}</td></tr><tr><th>Pro Forma Shares</th><td>${saved.output.proFormaShares.toFixed(1)}M</td></tr><tr><th>Pro Forma EPS</th><td>€${saved.output.proFormaEPS.toFixed(2)}</td></tr></tbody></table></div>${aiCoachButton('model','merger','Review my financing conclusion')}`:`<div class="emptyState"><h3>Build Sources, shares and financing costs</h3><p>The financing mix must equal 100%. Accretion remains an output, not proof of value creation.</p></div>`}</article></div>`}

function submitMerger(event){event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget).entries());const inputs=Object.fromEntries(Object.entries(data).filter(([key])=>key!=='conclusion').map(([key,value])=>[key,parseNumber(value)]));const mix=inputs.cashPercent+inputs.debtPercent+inputs.stockPercent;if(Math.abs(mix-100)>.01){showToast('Cash + debt + stock must equal 100%.');return}const output=mergerModel(inputs);const rationale=scoreStructuredText(data.conclusion,['debt','interest','shares','synerg','accretion','risk']);const score=Math.min(100,45+Math.round(rationale.score*.55));state.models.merger={inputs,conclusion:data.conclusion,output,score,completed:score>=70};recordEvidence(state,{activityId:'model-merger',skill:'ma',conceptId:'merger-model',type:'model',difficulty:3,score,correct:score>=70,misconception:/creates value|value creation/.test(data.conclusion)&&!/risk|depends|not/.test(data.conclusion)?'accretion-equals-value':'',feedback:'Financing mix, pro forma EPS and risk rationale assessed.',criteria:{mechanics:45,rationale:rationale.score},label:'Crestview Merger Model'});persist();renderModels('merger');showToast(`Merger model · ${score}/100`)}

function renderResearch(packetId=activePacket){activePacket=packetId;const packet=RESEARCH_PACKETS[packetId]||RESEARCH_PACKETS.atlas;viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">EVIDENCE-BASED RESEARCH</div><h2>Investment Research</h2><p>Use supplied local company packets. Facts, hypotheses, scenarios and conclusions remain separate.</p></div><span class="pill">${state.research.notes.length} saved briefs</span></div><div class="researchLayout"><aside class="panel"><div class="eyebrow">RESEARCH PACKETS</div>${Object.values(RESEARCH_PACKETS).map((item)=>`<button class="packetButton ${item.id===packet.id?'active':''}" data-action="research-packet" data-id="${item.id}"><b>${escapeHtml(item.company)}</b><span>${escapeHtml(item.sector)}</span></button>`).join('')}<h3>${escapeHtml(packet.company)} · ${escapeHtml(packet.ticker)}</h3><div class="dataRoom">${packet.metrics.map(([label,value])=>`<div class="fact"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join('')}</div><div class="reasonBox"><b>Local sources:</b><br>${packet.sources.map((source)=>`• ${escapeHtml(source)}`).join('<br>')}</div></aside><form class="panel researchForm" id="researchForm"><div class="eyebrow">ANALYST BRIEF</div><input type="hidden" name="packetId" value="${packet.id}"><label class="questionLabel">FACTS & EVIDENCE</label><textarea class="fieldControl" name="facts" placeholder="State at least three sourced facts. Do not explain them yet."></textarea><label class="questionLabel">BASE-CASE THESIS</label><textarea class="fieldControl" name="thesis" placeholder="Evidence → mechanism → implication → valuation → conclusion."></textarea><div class="modelFields"><label>Bull-case mechanism<textarea class="fieldControl" name="bull"></textarea></label><label>Bear-case mechanism<textarea class="fieldControl" name="bear"></textarea></label><label>Primary catalyst<input class="fieldControl" name="catalyst"></label><label>Thesis-breaking risk<input class="fieldControl" name="risk"></label></div><label class="questionLabel">UNANSWERED DILIGENCE QUESTION</label><input class="fieldControl" name="question" placeholder="What evidence would change the decision?"><button class="primary" type="submit" style="margin-top:10px">Assess & save research brief →</button><div id="researchFeedback"></div></form></div><article class="panel researchLibrary"><div class="eyebrow">RESEARCH NOTEBOOK</div>${state.research.notes.length?state.research.notes.map((note)=>`<article class="researchNote"><div class="masteryRow"><div><b>${escapeHtml(note.company)} · ${escapeHtml(note.ticker)}</b><span>${humanDate(note.date)}</span></div><strong>${note.score}%</strong></div><p>${escapeHtml(note.thesis)}</p>${aiCoachButton('research',note.id,'Review this research brief')}</article>`).join(''):`<div class="emptyState">No saved research evidence yet.</div>`}</article></div>`;$('#researchForm').addEventListener('submit',submitResearch)}

function submitResearch(event){event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget).entries());const packet=RESEARCH_PACKETS[data.packetId];const facts=scoreStructuredText(data.facts,['revenue','margin','cash','retention','valuation','backlog']);const thesis=scoreStructuredText(data.thesis,['revenue','margin','cash','valuation','risk']);const scenarios=Math.min(100,(data.bull.trim().split(/\s+/).length>=12?30:10)+(data.bear.trim().split(/\s+/).length>=12?30:10)+(data.catalyst.trim().split(/\s+/).length>=3?20:5)+(data.risk.trim().split(/\s+/).length>=3?20:5));const diligence=data.question.trim().split(/\s+/).length>=6?100:35;const score=Math.round(facts.score*.2+thesis.score*.4+scenarios*.25+diligence*.15);const note={id:`note-${Date.now()}`,packetId:packet.id,company:packet.company,ticker:packet.ticker,facts:data.facts,thesis:data.thesis,bull:data.bull,bear:data.bear,catalyst:data.catalyst,risk:data.risk,question:data.question,score,date:Date.now()};state.research.notes.unshift(note);recordEvidence(state,{activityId:`research-${packet.id}`,skill:'writing',conceptId:'thesis',type:'research',difficulty:2,score,correct:score>=70,feedback:'Evidence, thesis, scenarios and diligence question assessed separately.',criteria:{facts:facts.score,thesis:thesis.score,scenarios,diligence},label:`${packet.company} Research Brief`});persist();renderResearch(packet.id);showToast(`Research brief saved · ${score}/100`)}

function renderMarkets(id=activeScenario){activeScenario=id;const scenario=MARKET_SCENARIOS.find((item)=>item.id===id)||MARKET_SCENARIOS[0];const saved=state.markets.scores[id];viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">EXPECTED → ACTUAL → TRANSMISSION</div><h2>Market Scenarios</h2><p>Reasoning quality is assessed independently from P&L or lucky guesses.</p></div><span class="pill">${Object.values(state.markets.scores).filter((item)=>item.score>=70).length}/${MARKET_SCENARIOS.length} passed</span></div><div class="scenarioLayout"><aside class="panel">${MARKET_SCENARIOS.map((item)=>{const score=state.markets.scores[item.id]?.score;return `<button class="scenarioButton ${item.id===scenario.id?'active':''}" data-action="market-scenario" data-id="${item.id}"><span>${escapeHtml(item.tag)}</span><b>${escapeHtml(item.title)}</b><em>${score===undefined?'Not attempted':`Best ${score}%`}</em></button>`}).join('')}</aside><form class="panel" id="marketForm"><div class="eyebrow">${escapeHtml(scenario.tag)} · EVENT REPLAY</div><h2>${escapeHtml(scenario.title)}</h2><div class="surpriseGrid"><div><span>PREVIOUS</span><b>${escapeHtml(scenario.previous)}</b></div><div><span>CONSENSUS</span><b>${escapeHtml(scenario.consensus)}</b></div><div><span>ACTUAL</span><b>${escapeHtml(scenario.actual)}</b></div></div><div class="reasonBox"><b>Surprise:</b> ${escapeHtml(scenario.surprise)}<br>${escapeHtml(scenario.prompt)}</div><label class="questionLabel">BASE-CASE REACTION MAP</label><div class="reactionOptions">${[['hawkish','Yields rise; duration pressured; currency may strengthen'],['dovish','Yields fall; risk assets supported, but growth signal matters'],['recession','Sovereign bonds strengthen; cyclicals weaken; credit spreads widen'],['soft','Equities supported; bonds can gain; spreads tighten'],['oil','Energy gains; inflation risk rises; consumers pressured'],['credit','Credit and equity pressured; peer spreads widen']].map(([value,label])=>`<label><input type="radio" name="reaction" value="${value}"><span>${escapeHtml(label)}</span></label>`).join('')}</div><label class="questionLabel">MECHANISM & UNCERTAINTY</label><textarea class="fieldControl" name="reasoning" placeholder="Connect the surprise to rates, earnings, discount factors, credit, FX or sector effects. State at least one uncertainty."></textarea><button class="primary" type="submit" style="margin-top:10px">Assess scenario →</button>${saved?`<div class="feedback ${saved.score>=70?'good':'review'}"><b>Best score ${saved.score}/100.</b> ${escapeHtml(scenario.explanation)}</div>${aiCoachButton('market',scenario.id,'Review my reaction analysis')}`:''}</form></div></div>`;$('#marketForm').addEventListener('submit',(event)=>submitMarket(event,scenario))}

function submitMarket(event,scenario){event.preventDefault();const data=new FormData(event.currentTarget);const reaction=data.get('reaction');const reasoning=String(data.get('reasoning')||'');const structured=scoreStructuredText(reasoning,scenario.keywords);const direction=reaction===scenario.correct?45:0;const score=Math.min(100,direction+Math.round(structured.score*.55));state.markets.scores[scenario.id]={score:Math.max(state.markets.scores[scenario.id]?.score||0,score),reaction,reasoning,date:Date.now()};recordEvidence(state,{activityId:`scenario-${scenario.id}`,skill:'markets',conceptId:scenario.id.includes('credit')?'credit-spread':'inflation-surprise',type:'scenario',difficulty:2,score,correct:score>=70,feedback:scenario.explanation,criteria:{direction,mechanism:structured.score},label:scenario.title});persist();renderMarkets(scenario.id);showToast(`Scenario assessed · ${score}/100`)}

function fundMoney(value) {
  return new Intl.NumberFormat('en-US',{ style:'currency',currency:'USD',maximumFractionDigits:0 }).format(Number(value)||0);
}

function signed(value,suffix='%') {
  const number=Number(value)||0;
  return `${number>0?'+':''}${number.toFixed(1)}${suffix}`;
}

function latestCommittee(ticker) {
  return state.fund.committeeRuns.find((item)=>item.ticker===ticker) || null;
}

function ensureFundScan(force=false) {
  if(force||!state.fund.scan?.ranked?.length) {
    state.fund.scan=scanMarket(FUND_UNIVERSE,state.fund.portfolio,FUND_SETTINGS);
    const first=state.fund.scan.ranked.find((item)=>item.status==='candidate')||state.fund.scan.ranked[0];
    if(!state.fund.selectedTicker&&first) state.fund.selectedTicker=first.ticker;
    persist();
  }
  return state.fund.scan;
}

function fundStatus(status) {
  return ({ candidate:'Candidate',watchlist:'Watchlist',monitor:'Monitor',veto:'Risk veto',pass:'Pass',review:'Review',debate:'Debate',approved:'Approved' })[status]||status;
}

function committeeDecisionLabel(value) {
  return ({ 'paper-approved':'Paper approved',watchlist:'Watchlist only',rejected:'Rejected by risk' })[value]||value;
}

function agentCard(agent) {
  return `<article class="fundAgent ${agent.status} ${agent.id==='risk'?'riskAgent':''}"><div class="agentTop"><i>${String(agent.number).padStart(2,'0')}</i><div><span>${escapeHtml(agent.layer)} · ${agent.engine==='kimi'?'KIMI-ENRICHED':'RULE ENGINE'}</span><h4>${escapeHtml(agent.name)}</h4></div><em class="fundStatus ${agent.status}">${escapeHtml(fundStatus(agent.status))}</em></div><p>${escapeHtml(agent.summary)}</p><footer><span>${escapeHtml(agent.mandate)}</span><b>${Number.isFinite(agent.score)?`${agent.score}/100`:''}</b></footer></article>`;
}

function fundMemoHtml(run) {
  if(!run) return `<div class="fundEmpty"><span>10</span><h3>No committee run yet</h3><p>Select a candidate and run the investment committee. The risk agent always has the final veto.</p></div>`;
  const memo=run.ai?.memo;
  const decision=committeeDecisionLabel(run.finalDecision);
  const paperExists=state.fund.portfolio.positions.some((item)=>item.ticker===run.ticker);
  return `<div class="fundCommitteeHead"><div><div class="eyebrow">10-AGENT INVESTMENT COMMITTEE</div><h3>${escapeHtml(run.asset.company)} · ${escapeHtml(run.ticker)}</h3><p>${run.ai?`Kimi qualitative layer · ${escapeHtml(run.ai.confidence)} confidence`:'Deterministic fallback · Kimi enrichment unavailable or not yet returned'}</p></div><div class="fundDecision ${run.finalDecision}"><span>FINAL FUND DECISION</span><b>${escapeHtml(decision)}</b></div></div>
    ${fundRequestInFlight&&state.fund.selectedTicker===run.ticker?`<div class="fundAiProgress"><i></i><div><b>Kimi agents are reviewing the supplied packet…</b><span>Risk sizing and veto rules are already locked.</span></div></div>`:''}
    ${run.aiError?`<div class="fundWarning"><b>Kimi layer unavailable.</b> ${escapeHtml(run.aiError)} The deterministic committee remains usable and no risk rule changed.</div>`:''}
    <div class="fundAgentGrid">${run.agents.map(agentCard).join('')}</div>
    <div class="fundDebate"><article><div class="eyebrow">BULL ADVOCATE</div><h3>Why the setup can work</h3><p>${escapeHtml(run.agents.find((item)=>item.id==='bull')?.summary||'')}</p></article><article><div class="eyebrow">BEAR ADVOCATE</div><h3>Why the trade can fail</h3><p>${escapeHtml(run.agents.find((item)=>item.id==='bear')?.summary||'')}</p></article></div>
    <div class="fundFinalGrid"><article class="fundMemo"><div class="eyebrow">FUND SYNTHESIS</div><h3>${memo?escapeHtml(memo.summary):'Deterministic committee completed. Run Kimi enrichment for the qualitative fund memo.'}</h3><dl><div><dt>Catalyst</dt><dd>${escapeHtml(memo?.catalyst||run.asset.catalyst.mechanism)}</dd></div><div><dt>Primary risk</dt><dd>${escapeHtml(memo?.primaryRisk||run.agents.find((item)=>item.id==='bear')?.summary||'')}</dd></div><div><dt>Invalidation</dt><dd>${escapeHtml(memo?.invalidation||`Exit if the supplied catalyst fails to translate into operating evidence or the $${run.risk.stopPrice} risk level is breached.`)}</dd></div></dl>${memo?.openQuestions?.length?`<div class="fundQuestions"><span>OPEN DILIGENCE</span>${memo.openQuestions.map((item)=>`<p>• ${escapeHtml(item)}</p>`).join('')}</div>`:''}</article>
      <article class="riskGate ${run.risk.hardVeto?'veto':'clear'}"><div class="eyebrow">NON-NEGOTIABLE RISK GATE</div><div class="riskGateTitle"><h3>${run.risk.hardVeto?'VETO ACTIVE':'LIMITS CLEARED'}</h3><b>${run.risk.positionPct}% max</b></div><div class="riskChecks">${run.risk.checks.map((check)=>`<div class="riskCheck ${check.pass?'pass':'fail'}"><i>${check.pass?'✓':'×'}</i><div><b>${escapeHtml(check.label)}</b><span>${escapeHtml(check.detail)}</span></div></div>`).join('')}</div><div class="riskSizing"><span><small>SHARES</small><b>${run.risk.shares}</b></span><span><small>ENTRY</small><b>$${run.asset.price.toFixed(2)}</b></span><span><small>STOP</small><b>$${run.risk.stopPrice.toFixed(2)}</b></span><span><small>LOSS BUDGET</small><b>${fundMoney(run.risk.riskBudget)}</b></span></div>${run.finalDecision==='paper-approved'&&!paperExists?`<button class="primary fundPaperButton" data-action="add-paper-position" data-id="${escapeHtml(run.id)}">Add risk-sized paper position →</button>`:paperExists?`<div class="paperAdded">✓ Position is in the paper portfolio</div>`:`<button class="secondary fundPaperButton" disabled>Risk approval required</button>`}</article></div>`;
}

function renderFund() {
  const scan=ensureFundScan();
  const selectedTicker=state.fund.selectedTicker||scan.ranked[0]?.ticker;
  const selectedAsset=FUND_UNIVERSE.find((item)=>item.ticker===selectedTicker)||FUND_UNIVERSE[0];
  const selectedRow=scan.ranked.find((item)=>item.ticker===selectedAsset.ticker);
  const run=latestCommittee(selectedAsset.ticker);
  const portfolio=portfolioSnapshot(state.fund.portfolio);
  viewRoot.innerHTML=`<div class="workspace fundWorkspace">
    <div class="fundHero"><div><div class="eyebrow">FINANCELAB AI FUND · PAPER SYSTEM</div><h2>One investment system. Ten accountable agents.</h2><p>Scan the tape, explain the move, test the setup, force a bull/bear debate and let hard risk rules decide what can enter the paper portfolio.</p></div><button class="primary fundScanButton" data-action="run-fund-scan">Run complete market scan →</button></div>
    <div class="fundBoundary"><div><i></i><span><b>DATA MODE · ${escapeHtml(FUND_DATA_STATUS.label)}</b>${escapeHtml(FUND_DATA_STATUS.asOf)}</span></div><em>${escapeHtml(FUND_DATA_STATUS.universe)}</em><p>${escapeHtml(FUND_DATA_STATUS.limitation)}</p></div>
    <div class="fundStats"><article><span>UNIVERSE SCANNED</span><b>${scan.universeCount}</b><small>provider-ready securities</small></article><article><span>UNUSUAL MOVES</span><b>${scan.unusualCount}</b><small>anomaly score 60+</small></article><article><span>RISK-ELIGIBLE</span><b>${scan.candidateCount}</b><small>before committee debate</small></article><article><span>PAPER NAV</span><b>${fundMoney(portfolio.nav)}</b><small>${portfolio.grossPct.toFixed(1)}% gross exposure</small></article></div>
    <section class="panel sectorPanel"><div class="panelHead compact"><div><div class="eyebrow">SECTOR & REGIME TAPE</div><h3>Leadership before stock selection</h3></div><span class="pill">${SECTOR_TAPE.filter((item)=>item.day>0).length}/${SECTOR_TAPE.length} sectors positive</span></div><div class="sectorTape">${SECTOR_TAPE.map((item)=>`<div class="sectorTile ${item.day>=0?'up':'down'}"><span>${escapeHtml(item.sector)}</span><b>${signed(item.day)}</b><div><i style="width:${item.breadth}%"></i></div><small>${item.breadth}% breadth · ${escapeHtml(item.trend)}</small></div>`).join('')}</div></section>
    <div class="fundScanGrid"><section class="panel fundTablePanel"><div class="panelHead compact"><div><div class="eyebrow">CROSS-SECTIONAL SCAN</div><h3>Ranked opportunities</h3></div><span class="pill">Signal ≠ trade</span></div><div class="tableScroll"><table class="fundTable"><thead><tr><th>#</th><th>Security</th><th>Sector</th><th>1D</th><th>20D</th><th>Rel vol</th><th>Signal</th><th>Gate</th></tr></thead><tbody>${scan.ranked.map((item,index)=>{const asset=FUND_UNIVERSE.find((candidate)=>candidate.ticker===item.ticker);return `<tr class="${item.ticker===selectedAsset.ticker?'selected':''}" data-action="select-fund-candidate" data-id="${asset.ticker}" tabindex="0"><td>${String(index+1).padStart(2,'0')}</td><td><b>${asset.ticker}</b><span>${escapeHtml(asset.company)}</span></td><td>${escapeHtml(asset.sector)}</td><td class="${asset.dayMove>=0?'positive':'negative'}">${signed(asset.dayMove)}</td><td class="${asset.monthMove>=0?'positive':'negative'}">${signed(asset.monthMove)}</td><td>${asset.relativeVolume.toFixed(1)}×</td><td><b>${item.metrics.signal}</b></td><td><em class="fundStatus ${item.status}">${escapeHtml(fundStatus(item.status))}</em></td></tr>`}).join('')}</tbody></table></div></section>
      <aside class="panel fundCandidate"><div class="candidateIdentity"><div><span>${escapeHtml(selectedAsset.sector)}</span><h2>${escapeHtml(selectedAsset.ticker)}</h2><p>${escapeHtml(selectedAsset.company)}</p></div><strong>${selectedRow.metrics.signal}<small>/100</small></strong></div><div class="candidateMove"><span><small>DAY</small><b class="${selectedAsset.dayMove>=0?'positive':'negative'}">${signed(selectedAsset.dayMove)}</b></span><span><small>MONTH</small><b class="${selectedAsset.monthMove>=0?'positive':'negative'}">${signed(selectedAsset.monthMove)}</b></span><span><small>REL VOLUME</small><b>${selectedAsset.relativeVolume.toFixed(1)}×</b></span></div><div class="whyMove"><div class="eyebrow">WHY IT IS MOVING</div><h3>${escapeHtml(selectedAsset.catalyst.headline)}</h3><p>${escapeHtml(selectedAsset.catalyst.mechanism)}</p><footer><span>${escapeHtml(selectedAsset.catalyst.source)}</span><b>${selectedAsset.catalyst.confidence}% confidence</b></footer></div><div class="fundamentalsStrip"><span><small>REVENUE</small><b>${signed(selectedAsset.revenueGrowth)}</b></span><span><small>EPS</small><b>${signed(selectedAsset.epsGrowth)}</b></span><span><small>FCF MARGIN</small><b>${selectedAsset.fcfMargin}%</b></span><span><small>NET DEBT</small><b>${selectedAsset.netDebtEbitda}×</b></span></div><div class="setupStrip"><div><span>SETUP TEST</span><b>${selectedAsset.setup.hitRate}% hit rate · n=${selectedAsset.setup.sample}</b></div><em>${signed(selectedAsset.setup.averageReturn)} avg / ${selectedAsset.setup.downside}% downside</em></div><button class="primary fullButton" data-action="run-fund-committee" data-id="${selectedAsset.ticker}" ${fundRequestInFlight?'disabled':''}>${fundRequestInFlight?'Committee running…':'Run 10-agent committee →'}</button></aside></div>
    <section class="panel fundCommittee">${fundMemoHtml(run)}</section>
    <section class="panel paperPortfolio"><div class="panelHead compact"><div><div class="eyebrow">PAPER PORTFOLIO</div><h3>Only risk-approved ideas enter</h3></div><div class="portfolioLimits"><span>Max trade <b>${FUND_SETTINGS.maxPositionPct}%</b></span><span>Risk/trade <b>${FUND_SETTINGS.riskPerTradePct}%</b></span><span>Max gross <b>${FUND_SETTINGS.maxGrossPct}%</b></span></div></div>${state.fund.portfolio.positions.length?`<div class="tableScroll"><table><thead><tr><th>SECURITY</th><th>DIRECTION</th><th>SHARES</th><th>ENTRY</th><th>STOP</th><th>VALUE</th><th>SECTOR</th></tr></thead><tbody>${state.fund.portfolio.positions.map((position)=>`<tr><td><b>${escapeHtml(position.ticker)}</b><span>${escapeHtml(position.company)}</span></td><td>${escapeHtml(position.direction)}</td><td>${position.shares}</td><td>$${Number(position.entryPrice).toFixed(2)}</td><td>$${Number(position.stopPrice).toFixed(2)}</td><td>${fundMoney(position.entryValue)}</td><td>${escapeHtml(position.sector)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="fundEmpty compact"><h3>No paper positions</h3><p>A candidate must pass all hard risk checks and the complete committee before it can be added.</p></div>`}</section>
    <div class="fundDisclaimer">Training and research workflow only. Demo data are fictional, the scan is not live, and nothing in this workspace is investment advice or an instruction to trade.</div>
  </div>`;
}

function fundPayload(run) {
  const asset=run.asset;
  return {
    ticker:run.ticker,
    riskDecision:run.finalDecision,
    context:[
      `Data boundary: ${FUND_DATA_STATUS.label}; ${FUND_DATA_STATUS.asOf}.`,
      `Company: ${asset.company} (${asset.ticker}), sector ${asset.sector}, proposed direction ${asset.direction}.`,
      `Price and move: $${asset.price}; day ${asset.dayMove}%; week ${asset.weekMove}%; month ${asset.monthMove}%; gap ${asset.gap}%.`,
      `Volume and risk: relative volume ${asset.relativeVolume}x; volume z-score ${asset.volumeZ}; volatility ${asset.volatility}%; beta ${asset.beta}; spread ${asset.spreadBps} bps.`,
      `Supplied catalyst: ${asset.catalyst.headline}. Source: ${asset.catalyst.source}. Age: ${asset.catalyst.ageHours} hours. Mechanism: ${asset.catalyst.mechanism}. Source quality: ${asset.sourceQuality}.`,
      `Fundamentals: revenue growth ${asset.revenueGrowth}%; EPS growth ${asset.epsGrowth}%; FCF margin ${asset.fcfMargin}%; net debt/EBITDA ${asset.netDebtEbitda}x; forward P/E ${asset.forwardPE||'not meaningful'}x.`,
      `Setup packet: ${asset.setup.sample} analogues; ${asset.setup.hitRate}% hit rate; ${asset.setup.averageReturn}% average return; ${asset.setup.downside}% downside; ${asset.setup.holdingDays}-day horizon.`,
    ].join('\n'),
    deterministic:[
      `Composite signal ${run.metrics.signal}/100; momentum ${run.metrics.momentum}; anomaly ${run.metrics.anomaly}; setup ${run.metrics.setup}.`,
      `Risk decision ${run.finalDecision}; hard veto ${run.risk.hardVeto}; maximum paper position ${run.risk.positionPct}% (${run.risk.shares} shares); stop $${run.risk.stopPrice}; loss budget $${run.risk.riskBudget}.`,
      `Risk checks: ${run.risk.checks.map((item)=>`${item.label}=${item.pass?'pass':'fail'} (${item.detail})`).join('; ')}.`,
    ].join('\n'),
  };
}

async function runFundCommittee(ticker) {
  if(fundRequestInFlight){showToast('The investment committee is already running.');return}
  let run=buildCommittee(ticker,state.fund.portfolio,FUND_SETTINGS,FUND_UNIVERSE);
  state.fund.committeeRuns=[run,...state.fund.committeeRuns.filter((item)=>item.ticker!==ticker)].slice(0,20);
  state.fund.selectedTicker=ticker;
  fundRequestInFlight=true;
  persist();
  renderFund();
  try {
    const result=await requestFundCommittee(fundPayload(run));
    run=mergeAiCommittee(run,result.committee);
    run.aiModel=result.model;
    showToast(`${ticker} committee completed · ${committeeDecisionLabel(run.finalDecision)}`);
  } catch(error) {
    run={...run,aiError:error.message};
    showToast(`${ticker} deterministic committee completed; Kimi was unavailable.`);
  } finally {
    fundRequestInFlight=false;
    state.fund.committeeRuns=[run,...state.fund.committeeRuns.filter((item)=>item.id!==run.id&&item.ticker!==ticker)].slice(0,20);
    persist();
    renderFund();
  }
}

function addFundPaperPosition(runId) {
  const run=state.fund.committeeRuns.find((item)=>item.id===runId);
  if(!run){showToast('Run the committee again before adding this paper position.');return}
  try {
    state.fund.portfolio=addPaperPosition(state.fund.portfolio,run);
    state.fund.scan=scanMarket(FUND_UNIVERSE,state.fund.portfolio,FUND_SETTINGS);
    persist();
    renderFund();
    showToast(`${run.ticker} added to the paper portfolio within risk limits.`);
  } catch(error) { showToast(error.message) }
}

function renderReview(){const profiles=allSkillProfiles(state);const session=state.evidence.filter((item)=>item.sessionId===state.activeSessionId);const mistakes=[...state.evidence].reverse().filter((item)=>item.score<60).slice(0,4);const improvements=SKILLS.map((skill)=>({skill,...profiles[skill.id]})).sort((a,b)=>b.mastery-a.mastery).slice(0,3);const recommendation=nextRecommendation(state);viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">SESSION & EVIDENCE HISTORY</div><h2>Development Review</h2><p>Every assessed activity contributes to the profile. This review is not tied to one specific case.</p></div><div class="statCard"><span>SESSION EVIDENCE</span><b>${session.length}</b><small>Started ${humanDate(state.sessionStartedAt)}</small></div></div><div class="overviewGrid"><article class="panel"><div class="eyebrow">CURRENT STRENGTHS</div><h3>Highest demonstrated mastery</h3>${improvements.map((item)=>`<div class="progressLine"><span>${escapeHtml(item.skill.name)}</span><div>${progressBar(item.mastery,item.confidence)}</div><strong>${item.mastery}</strong></div>`).join('')}</article><article class="panel"><div class="eyebrow">NEXT ACTION</div><h3>${escapeHtml(recommendation.title)}</h3><p class="muted">${escapeHtml(recommendation.reason)}</p><button class="primary" data-action="open-recommendation">Start →</button></article><article class="panel"><div class="eyebrow">REPEATED MISTAKES</div><h3>Corrective work</h3>${mistakes.length?mistakes.map((item)=>`<div class="evidenceRecord"><b>${escapeHtml(item.label)} · ${item.score}/100</b><span>${escapeHtml(item.misconception||'Insufficient evidence or accuracy')} · ${humanDate(item.timestamp)}</span></div>`).join(''):`<div class="emptyState">No unresolved low-scoring evidence yet.</div>`}</article><article class="panel journal"><div class="eyebrow">ANALYST JOURNAL</div><h3>Session reflection</h3><textarea id="journalText" placeholder="What did you learn, where were you uncertain, and what will you verify next?"></textarea><button class="secondary" data-action="save-journal" style="margin-top:8px">Save reflection</button></article><article class="panel wide"><div class="eyebrow">EVIDENCE TIMELINE</div><h3>Recent development history</h3><div class="timeline">${state.activity.length?state.activity.slice(0,30).map((item)=>`<div class="timelineItem"><time>${humanDate(item.date)}</time><div><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.type)} · ${escapeHtml(SKILLS.find((skill)=>skill.id===item.skill)?.name||item.skill)}</span></div><strong>${item.score}%</strong></div>`).join(''):`<div class="emptyState">Complete work to create the first timeline record.</div>`}</div></article></div></div>`}

function renderSettings(){const profile=state.profile||{name:'Analyst',goal:'Explore Finance'};viewRoot.innerHTML=`<div class="workspace"><div class="sectionHead"><div><div class="eyebrow">LOCAL PRE-PUBLIC MVP</div><h2>Settings</h2><p>FinanceLab stores progress on this device. Back up the workspace before moving devices or clearing browser data.</p></div></div><div class="settingsGrid"><form class="panel" id="profileForm"><div class="eyebrow">ANALYST PROFILE</div><label class="questionLabel">NAME<input class="fieldControl" name="name" value="${escapeHtml(profile.name)}"></label><label class="questionLabel">PRIMARY GOAL<select class="fieldControl" name="goal">${['Investment Banking','Investing / Equity Research','Corporate Finance','Markets','Explore Finance'].map((goal)=>`<option ${goal===profile.goal?'selected':''}>${goal}</option>`).join('')}</select></label><button class="primary" type="submit" style="margin-top:10px">Save profile</button></form><article class="panel"><div class="eyebrow">DATA PORTABILITY</div><h3>Backup or restore</h3><p class="muted">Exports include profile, diagnostic evidence, cases, models, research, markets and journal history.</p><div class="buttonRow"><button class="secondary" data-action="export-state">Download backup</button><label class="secondary fileButton">Restore backup<input type="file" id="importState" accept="application/json"></label></div></article><article class="panel"><div class="eyebrow">DEVELOPMENT SESSION</div><h3>Start a fresh evidence session</h3><p class="muted">Keeps all progress but starts a new session summary.</p><button class="secondary" data-action="new-session">Start new session</button></article><article class="panel"><div class="eyebrow">RESET</div><h3>Clear this local workspace</h3><p class="muted">This removes all local FinanceLab progress from this browser.</p><button class="dangerButton" data-action="reset-state">Reset workspace</button></article></div></div>`;$('#profileForm').addEventListener('submit',(event)=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget).entries());state.profile={...(state.profile||{}),name:data.name.trim()||'Analyst',goal:data.goal,interests:state.profile?.interests||[]};persist();renderSettings();showToast('Profile saved.')} );$('#importState').addEventListener('change',importStateFile)}

function openRecommendation(){const rec=nextRecommendation(state);if(rec.type==='assignment')navigate('assignment',rec.id);else if(rec.type==='concept'){selectedConcept=rec.id;navigate('knowledge')}else if(rec.type==='practice'){startPractice(rec.id)}else{selectedSkill=rec.skill;navigate('skills')}}

function markBriefComplete({briefItemId=null,questionId=null,assignmentId=null}){const brief=state.dailyBrief;if(!brief?.items)return;const item=brief.items.find((candidate)=>candidate.id===briefItemId||(questionId&&candidate.questionId===questionId)||(assignmentId&&candidate.assignmentId===assignmentId));if(item)item.completed=true}

function aiCoachButton(mode,id,label='Ask Kimi for coaching') {
  return `<button class="aiCoachButton" data-action="ask-kimi" data-mode="${mode}" data-id="${escapeHtml(id)}"><span class="aiCoachMark">K</span><span>${escapeHtml(label)}</span><em>Advisory · does not change mastery</em></button>`;
}

function buildAiPayload(mode,id) {
  if(mode==='assignment') {
    const assignment=ASSIGNMENTS.find((item)=>item.id===id);const stored=state.assignments[id];
    if(!assignment||!stored?.results?.length) throw new Error('Complete and assess the assignment before requesting Kimi feedback.');
    return {
      mode,contextId:id,
      context:[`Assignment: ${assignment.title}`,assignment.description,`Facts: ${assignment.facts.map(([label,value])=>`${label}: ${value}`).join('; ')}`,`Required deliverables: ${assignment.deliverables.map((item)=>item.label).join('; ')}`].join('\n'),
      deterministic:`FinanceLab score: ${stored.score}/100. Criterion review: ${stored.results.map((result)=>`${assignment.deliverables.find((item)=>item.id===result.id)?.label}: ${result.score}/100 — ${result.feedback}`).join(' | ')}`,
      submission:Object.entries(stored.answers||{}).map(([key,value])=>`${assignment.deliverables.find((item)=>item.id===key)?.label||key}: ${value}`).join('\n'),
    };
  }
  if(mode==='model') {
    const saved=state.models[id];if(!saved) throw new Error('Run and save the model before requesting Kimi feedback.');
    const names={dcf:'Veltrix five-year DCF',comps:'Helios Comparable Companies',merger:'Crestview Merger Model'};
    const compactOutput=id==='dcf'?{enterpriseValue:saved.output.enterpriseValue,equityValue:saved.output.equityValue,perShare:saved.output.perShare,terminalShare:saved.output.terminalShare}:saved.output;
    return {mode,contextId:id,context:`Model: ${names[id]}. Inputs: ${JSON.stringify(saved.inputs)}. Deterministic output: ${JSON.stringify(compactOutput)}.`,deterministic:`FinanceLab interpretation score: ${saved.score}/100. Calculations remain authoritative and must not be replaced.`,submission:`Learner conclusion: ${saved.conclusion||'No written conclusion supplied.'}`};
  }
  if(mode==='research') {
    const note=state.research.notes.find((item)=>item.id===id);if(!note) throw new Error('Save the research brief before requesting Kimi feedback.');
    const packet=RESEARCH_PACKETS[note.packetId];
    return {mode,contextId:note.packetId,context:`Company packet: ${packet.company} (${packet.ticker}), ${packet.sector}. Metrics: ${packet.metrics.map(([label,value])=>`${label}: ${value}`).join('; ')}. Local sources: ${packet.sources.join('; ')}.`,deterministic:`FinanceLab structured-writing score: ${note.score}/100. This score must not be changed.`,submission:[`Facts: ${note.facts}`,`Thesis: ${note.thesis}`,`Bull case: ${note.bull}`,`Bear case: ${note.bear}`,`Catalyst: ${note.catalyst}`,`Risk: ${note.risk}`,`Diligence question: ${note.question}`].join('\n')};
  }
  if(mode==='market') {
    const scenario=MARKET_SCENARIOS.find((item)=>item.id===id);const saved=state.markets.scores[id];if(!scenario||!saved) throw new Error('Assess the market scenario before requesting Kimi feedback.');
    return {mode,contextId:id,context:`Scenario: ${scenario.title}. Previous: ${scenario.previous}. Consensus: ${scenario.consensus}. Actual: ${scenario.actual}. Defined surprise: ${scenario.surprise}. Reference explanation: ${scenario.explanation}`,deterministic:`FinanceLab scenario score: ${saved.score}/100. Selected reaction map: ${saved.reaction}.`,submission:`Learner mechanism and uncertainty analysis: ${saved.reasoning}`};
  }
  throw new Error('This Kimi feedback mode is not available.');
}

function aiFeedbackHtml(feedback,model) {
  const list=(items)=>items.map((item)=>`<li>${escapeHtml(item)}</li>`).join('');
  return `<div class="modalHead"><div><div class="eyebrow">KIMI COACH · ${escapeHtml(feedback.confidence.toUpperCase())} CONFIDENCE</div><h2 id="modalTitle">Formative analyst feedback</h2></div><button class="closeModal" data-action="close-modal" aria-label="Close feedback">×</button></div><div class="aiNotice">This feedback is advisory. FinanceLab calculations, scores, mastery and unlocks remain deterministic.</div><div class="aiSummary">${escapeHtml(feedback.summary)}</div><div class="aiFeedbackGrid"><section><div class="eyebrow">WHAT WORKS</div><ul class="aiList strength">${list(feedback.strengths)}</ul></section><section><div class="eyebrow">EVIDENCE GAPS</div><ul class="aiList gap">${list(feedback.gaps)}</ul></section></div><section class="aiNext"><div class="eyebrow">NEXT REVISION</div><p>${escapeHtml(feedback.nextStep)}</p></section><section class="aiQuestion"><div class="eyebrow">COACHING QUESTION</div><p>${escapeHtml(feedback.followUpQuestion)}</p></section><div class="aiFooter">Generated by ${escapeHtml(model)} from the selected submission only. This response is not saved automatically.</div>`;
}

async function askKimi(mode,id) {
  if(aiRequestInFlight){showToast('Kimi is already reviewing another submission.');return}
  let payload;
  try{payload=buildAiPayload(mode,id)}catch(error){showToast(error.message);return}
  aiRequestInFlight=true;
  showModal(`<div class="modalHead"><div><div class="eyebrow">KIMI COACH · SECURE SERVER REQUEST</div><h2 id="modalTitle">Reviewing your analyst work</h2></div><button class="closeModal" data-action="close-modal" aria-label="Close feedback">×</button></div><div class="aiLoading"><span></span><div><b>Building evidence-based feedback…</b><p>Only this submission and its FinanceLab rubric are being sent.</p></div></div>`);
  try {
    const result=await requestAiFeedback(payload);
    modalCard.innerHTML=aiFeedbackHtml(result.feedback,result.model);
  } catch(error) {
    modalCard.innerHTML=`<div class="modalHead"><div><div class="eyebrow">KIMI COACH · UNAVAILABLE</div><h2 id="modalTitle">Feedback could not be completed</h2></div><button class="closeModal" data-action="close-modal" aria-label="Close feedback">×</button></div><div class="aiError"><b>No FinanceLab progress was changed.</b><p>${escapeHtml(error.message)}</p></div><button class="secondary" data-action="close-modal">Return to the workstation</button>`;
  } finally { aiRequestInFlight=false }
}

function showModal(html){modalCard.innerHTML=html;modal.classList.remove('hidden');setTimeout(()=>$('.closeModal',modalCard)?.focus(),0)}
function closeModal(){modal.classList.add('hidden');modalCard.innerHTML=''}
function openSearch(){showModal(`<div class="modalHead"><div><div class="eyebrow">QUICK NAVIGATION</div><h2 id="modalTitle">Search FinanceLab</h2></div><button class="closeModal" data-action="close-modal">×</button></div><input class="searchInput" id="searchInput" placeholder="Search concepts, assignments and models…"><div class="searchResults" id="searchResults"></div>`);const input=$('#searchInput');const render=()=>{const term=input.value.toLowerCase();const results=[...CONCEPTS.map((item)=>({id:item.id,type:'concept',title:item.name,detail:SKILLS.find((skill)=>skill.id===item.skill)?.name})),...ASSIGNMENTS.map((item)=>({id:item.id,type:'assignment',title:item.title,detail:`${item.type} · ${item.area}`}))].filter((item)=>!term||`${item.title} ${item.detail}`.toLowerCase().includes(term)).slice(0,15);$('#searchResults').innerHTML=results.map((item)=>`<button class="searchResult" data-action="search-result" data-type="${item.type}" data-id="${item.id}"><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.detail)}</span></button>`).join('')};input.addEventListener('input',render);render();input.focus()}

function latestEvidence(){const item=state.evidence.at(-1);showToast(item?`${item.label} · ${item.score}/100`:'No evidence recorded yet.')}

function exportBackup(){const blob=new Blob([exportState(state)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`financelab-backup-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);showToast('Workspace backup downloaded.')}
function importStateFile(event){const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{state=importState(reader.result);persist();navigate('overview');showToast('Workspace restored.')}catch(error){showToast(error.message)}};reader.readAsText(file)}

function startOnboarding(){diagnostic={profile:null,questions:[],index:0,answers:[]};onboarding.classList.remove('hidden');renderOnboardingProfile()}
function renderOnboardingProfile(){onboardCard.innerHTML=`<div class="onboardBrand"><div class="logo">FL</div><div><div class="eyebrow">FINANCELAB PRE-PUBLIC MVP</div><h2 id="onboardTitle">Build an evidence-based analyst baseline</h2></div></div><p>FinanceLab measures what you can apply. The diagnostic contains 16 varied questions; untested skills remain low-confidence.</p><form id="onboardProfile"><div class="formGrid"><label class="field">Your name<input name="name" value="Analyst"></label><label class="field">Primary goal<select name="goal"><option>Investment Banking</option><option>Investing / Equity Research</option><option>Corporate Finance</option><option>Markets</option><option>Explore Finance</option></select></label></div><button class="primary onboardNext" type="submit">Start diagnostic →</button></form>`;$('#onboardProfile').addEventListener('submit',(event)=>{event.preventDefault();diagnostic.profile=Object.fromEntries(new FormData(event.currentTarget).entries());diagnostic.questions=seededShuffle(DIAGNOSTIC_IDS.map((id)=>PRACTICE_QUESTIONS.find((item)=>item.id===id)),`${diagnostic.profile.name}-${Date.now()}`).map((question,index)=>shuffledQuestion(question,`diagnostic-${index}-${diagnostic.profile.name}`));diagnostic.index=0;diagnostic.answers=[];renderDiagnosticQuestion()})}
function renderDiagnosticQuestion(){const question=diagnostic.questions[diagnostic.index];onboardCard.innerHTML=`<div class="diagnosticMeta"><span>BASELINE DIAGNOSTIC</span><b>${diagnostic.index+1} / ${diagnostic.questions.length}</b></div><div class="eyebrow">${escapeHtml(SKILLS.find((skill)=>skill.id===question.skill)?.name)} · DIFFICULTY ${question.difficulty}</div><div class="assessmentQuestion"><h3>${escapeHtml(question.prompt)}</h3><p>Choose the strongest answer. Option order is randomised.</p></div><div class="assessmentOptions">${question.options.map((option)=>`<button class="assessmentOption" data-onboard="answer" data-answer="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('')}</div>`}
function answerDiagnostic(answer){const question=diagnostic.questions[diagnostic.index];diagnostic.answers.push({question,answer,result:gradeQuestion(question,answer)});diagnostic.index+=1;if(diagnostic.index<diagnostic.questions.length)renderDiagnosticQuestion();else finishDiagnostic()}
function finishDiagnostic(){state.profile={name:diagnostic.profile.name.trim()||'Analyst',goal:diagnostic.profile.goal,interests:[]};SKILLS.forEach((skill)=>{const answers=diagnostic.answers.filter((item)=>item.question.skill===skill.id);state.baseline[skill.id]={score:answers.length?Math.round(28+answers.filter((item)=>item.result.correct).length/answers.length*52):30,confidence:Math.min(70,answers.length*22)}});diagnostic.answers.forEach(({question,result})=>recordEvidence(state,{activityId:`diagnostic-${question.id}`,skill:question.skill,conceptId:question.conceptId,type:'diagnostic',difficulty:question.difficulty,score:result.score,correct:result.correct,misconception:result.misconception,feedback:result.feedback,label:`Diagnostic · ${CONCEPTS.find((item)=>item.id===question.conceptId)?.name}`}));persist();const profiles=allSkillProfiles(state);const weakest=[...SKILLS].sort((a,b)=>profiles[a.id].mastery-profiles[b.id].mastery)[0];onboardCard.innerHTML=`<div class="resultSeal">✓</div><div class="eyebrow">BASELINE CREATED</div><h2>Your first analyst profile is ready</h2><p>Scores show current evidence and confidence—not a permanent level or qualification.</p><div class="baselineGrid">${SKILLS.map((skill)=>`<div class="baselineResult"><span>${escapeHtml(skill.name)}</span><b>${profiles[skill.id].mastery}</b><small>${profiles[skill.id].confidence}% confidence</small></div>`).join('')}</div><div class="reasonBox"><b>Recommended starting area:</b> ${escapeHtml(weakest.name)} because it has the weakest current evidence profile.</div><button class="primary" data-onboard="enter">Enter analyst workspace →</button>`}

document.addEventListener('click',(event)=>{
  const nav=event.target.closest('[data-view]');if(nav&&(nav.classList.contains('nav')||nav.classList.contains('settings'))){navigate(nav.dataset.view);return}
  const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;const id=button.dataset.id;
  if(action==='navigate')navigate(button.dataset.view);
  else if(action==='open-assignment')navigate('assignment',id);
  else if(action==='assignment-filter')renderAssignments(id);
  else if(action==='open-recommendation')openRecommendation();
  else if(action==='open-skill'){selectedSkill=id;navigate('skills')}
  else if(action==='open-concept'){selectedConcept=id;closeModal();navigate('knowledge')}
  else if(action==='practice-concept')startPractice('adaptive',id);
  else if(action==='brief-question')startPractice('adaptive',null,id,button.dataset.brief);
  else if(action==='answer-question')answerQuestion(button.dataset.answer);
  else if(action==='next-question')startPractice($('#practiceSkill')?.value||'adaptive');
  else if(action==='model-tab')renderModels(id);
  else if(action==='research-packet')renderResearch(id);
  else if(action==='market-scenario')renderMarkets(id);
  else if(action==='run-fund-scan'){ensureFundScan(true);renderFund();showToast('Market scan refreshed from the bundled training snapshot.')}
  else if(action==='select-fund-candidate'){state.fund.selectedTicker=id;persist();renderFund()}
  else if(action==='run-fund-committee')runFundCommittee(id);
  else if(action==='add-paper-position')addFundPaperPosition(id);
  else if(action==='save-journal'){const text=$('#journalText').value.trim();if(text){state.journal.unshift({id:`journal-${Date.now()}`,date:Date.now(),text});persist();showToast('Session reflection saved.')}}
  else if(action==='ask-kimi')askKimi(button.dataset.mode,id);
  else if(action==='close-modal')closeModal();
  else if(action==='search-result'){closeModal();if(button.dataset.type==='concept'){selectedConcept=id;navigate('knowledge')}else navigate('assignment',id)}
  else if(action==='export-state')exportBackup();
  else if(action==='new-session'){state.activeSessionId=`session-${Date.now()}`;state.sessionStartedAt=Date.now();persist();navigate('review');showToast('New evidence session started.')}
  else if(action==='reset-state'){if(confirm('Reset all local FinanceLab progress on this device?')){clearState();state=loadState();startOnboarding();showToast('Local workspace reset.')}}
});

onboardCard.addEventListener('click',(event)=>{const button=event.target.closest('[data-onboard]');if(!button)return;if(button.dataset.onboard==='answer')answerDiagnostic(button.dataset.answer);else if(button.dataset.onboard==='enter'){onboarding.classList.add('hidden');generateDailyBrief(state);persist();navigate('overview')}});
$('#globalSearch').addEventListener('click',openSearch);
$('#latestEvidence').addEventListener('click',latestEvidence);
$('#profileButton').addEventListener('click',()=>navigate('settings'));
modal.addEventListener('click',(event)=>{if(event.target===modal)closeModal()});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape')closeModal();if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openSearch()}});

updateChrome();
if(!state.profile)startOnboarding();else{generateDailyBrief(state);persist();navigate(pageNames[route.view]?route.view:'overview')}
