import test from 'node:test';
import assert from 'node:assert/strict';
import { exportState, importState, migrateLegacy, normalizeState, STATE_VERSION } from '../src/state.js';

test('legacy v0.4 progress migrates into evidence-based state', () => {
  const migrated=migrateLegacy({profile:{name:'Alex',goal:'Investment Banking'},skills:{Accounting:76,Valuation:66,'M&A':54},training:{calculate:true,apply:true},case:{submitted:true,review:{overall:82}},models:{completed:true,score:88}});
  assert.equal(migrated.profile.name,'Alex');
  assert.equal(migrated.baseline.accounting.score,76);
  assert.ok(migrated.evidence.some((item)=>item.label==='Vertex acquisition'));
  assert.ok(migrated.evidence.some((item)=>item.type==='model'));
});

test('normalization recovers malformed collections safely', () => {
  const normalized=normalizeState({profile:{name:'A'},evidence:'bad',activity:null,research:{notes:'bad'}});
  assert.equal(normalized.version,STATE_VERSION);
  assert.deepEqual(normalized.evidence,[]);
  assert.deepEqual(normalized.research.notes,[]);
});

test('backup export and import round trip preserves valid progress', () => {
  const source=normalizeState({profile:{name:'Round Trip',goal:'Markets'},evidence:[{id:'e1',skill:'markets',score:90}],assignments:{'MKT-012':{completed:true,score:90}},fund:{selectedTicker:'QNTM',portfolio:{cash:950000,positions:[{ticker:'QNTM',sector:'Semiconductors',entryValue:50000,marketValue:50000}],peakNav:1000000}}});
  const restored=importState(exportState(source));
  assert.equal(restored.profile.name,'Round Trip');
  assert.equal(restored.assignments['MKT-012'].completed,true);
  assert.equal(restored.evidence.length,1);
  assert.equal(restored.fund.selectedTicker,'QNTM');
  assert.equal(restored.fund.portfolio.positions.length,1);
});
