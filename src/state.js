import { SKILLS } from './content.js';
import { clamp } from './finance.js';
import { emptyFundState, normalizeFundState } from './fund.js';

export const STATE_VERSION = 2;
export const STORAGE_KEY = 'fl_mvp_state_v2';
export const LEGACY_KEYS = ['fl_v04_state', 'fl_v03_state'];

export function emptyState() {
  return {
    version:STATE_VERSION,
    profile:null,
    baseline:Object.fromEntries(SKILLS.map((skill) => [skill.id, { score:35, confidence:0 }])),
    evidence:[],
    activity:[],
    assignments:{},
    models:{},
    research:{ notes:[] },
    markets:{ scores:{} },
    fund:emptyFundState(),
    moduleProgress:{},
    dailyBrief:null,
    journal:[],
    currentView:'overview',
    activeSessionId:`session-${Date.now()}`,
    sessionStartedAt:Date.now(),
  };
}

function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export function normalizeState(source) {
  const base = emptyState();
  const input = source && typeof source === 'object' ? source : {};
  const state = {
    ...base,
    ...input,
    version:STATE_VERSION,
    profile:input.profile && typeof input.profile === 'object' ? {
      name:String(input.profile.name || 'Analyst').slice(0, 80),
      goal:String(input.profile.goal || 'Explore Finance').slice(0, 80),
      interests:Array.isArray(input.profile.interests) ? input.profile.interests.map(String).slice(0, 8) : [],
    } : null,
    baseline:{ ...base.baseline },
    evidence:Array.isArray(input.evidence) ? input.evidence.filter((item) => item && typeof item === 'object').slice(-600) : [],
    activity:Array.isArray(input.activity) ? input.activity.filter((item) => item && typeof item === 'object').slice(0, 200) : [],
    assignments:input.assignments && typeof input.assignments === 'object' ? input.assignments : {},
    models:input.models && typeof input.models === 'object' ? input.models : {},
    research:{ notes:Array.isArray(input.research?.notes) ? input.research.notes.filter(Boolean).slice(0, 50) : [] },
    markets:{ scores:input.markets?.scores && typeof input.markets.scores === 'object' ? input.markets.scores : {} },
    fund:normalizeFundState(input.fund),
    moduleProgress:input.moduleProgress && typeof input.moduleProgress === 'object' ? input.moduleProgress : {},
    journal:Array.isArray(input.journal) ? input.journal.filter(Boolean).slice(0, 100) : [],
  };
  SKILLS.forEach((skill) => {
    const record = input.baseline?.[skill.id];
    if (record && typeof record === 'object') state.baseline[skill.id] = { score:clamp(record.score), confidence:clamp(record.confidence) };
  });
  return state;
}

export function migrateLegacy(legacy) {
  const state = emptyState();
  if (!legacy || typeof legacy !== 'object') return state;
  if (legacy.profile) state.profile = { name:String(legacy.profile.name || 'Analyst'), goal:String(legacy.profile.goal || 'Explore Finance'), interests:Array.isArray(legacy.profile.interests) ? legacy.profile.interests : [] };
  const map = {
    Accounting:'accounting',
    'Financial Statements':'statements',
    'Corporate Finance':'corporate',
    Valuation:'valuation',
    'M&A':'ma',
    Markets:'markets',
    'Financial Reasoning':'reasoning',
    'Analyst Writing':'writing',
  };
  Object.entries(map).forEach(([oldName, newId]) => {
    const value = Number(legacy.skills?.[oldName]);
    if (Number.isFinite(value)) state.baseline[newId] = { score:clamp(value), confidence:35 };
  });
  const legacyEvidence = [];
  const add = (condition, label, skill, type, score, conceptId = '') => {
    if (!condition) return;
    legacyEvidence.push({ id:`legacy-${legacyEvidence.length}`, timestamp:Date.now() - 86400000, activityId:`legacy-${label}`, skill, conceptId, type, difficulty:1, attempt:1, score, correct:score >= 70, misconception:'', feedback:'Imported from the previous FinanceLab workspace.', label, criteria:{} });
  };
  add(legacy.training?.calculate, 'EV bridge calculation', 'valuation', 'calculation', 78, 'ev-equity-bridge');
  add(legacy.training?.apply, 'Helios mini case', 'valuation', 'case', 82, 'comps');
  add(legacy.case?.submitted, 'Vertex acquisition', 'ma', 'case', legacy.case?.review?.overall || 76, 'accretion');
  add(legacy.northstar?.completed, 'Northstar capital allocation', 'corporate', 'case', legacy.northstar?.score || 75, 'roic');
  add(legacy.models?.completed, 'Veltrix DCF', 'valuation', 'model', legacy.models?.score || 72, 'dcf');
  add(legacy.markets?.completed, 'Macro Reaction Lab', 'markets', 'scenario', 72, 'inflation-surprise');
  state.evidence = legacyEvidence;
  state.activity = legacyEvidence.map((item) => ({ id:item.id, date:item.timestamp, type:item.type, label:item.label, score:item.score, skill:item.skill }));
  return state;
}

export function loadState() {
  const current = safeStorageGet(STORAGE_KEY);
  if (current) {
    try { return normalizeState(JSON.parse(current)); } catch { /* recover below */ }
  }
  for (const key of LEGACY_KEYS) {
    const raw = safeStorageGet(key);
    if (!raw) continue;
    try {
      const migrated = migrateLegacy(JSON.parse(raw));
      safeStorageSet(STORAGE_KEY, JSON.stringify(migrated));
      return normalizeState(migrated);
    } catch { /* try next legacy state */ }
  }
  return emptyState();
}

export function saveState(state) {
  return safeStorageSet(STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function exportState(state) {
  return JSON.stringify({ product:'FinanceLab Analyst Workstation', exportedAt:new Date().toISOString(), state:normalizeState(state) }, null, 2);
}

export function importState(text) {
  const parsed = JSON.parse(text);
  const candidate = parsed?.state || parsed;
  if (!candidate || typeof candidate !== 'object') throw new Error('The selected file does not contain a FinanceLab workspace.');
  return candidate.version === STATE_VERSION ? normalizeState(candidate) : normalizeState(migrateLegacy(candidate));
}
