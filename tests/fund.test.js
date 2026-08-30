import test from 'node:test';
import assert from 'node:assert/strict';
import { FUND_AGENTS, FUND_SETTINGS, FUND_UNIVERSE } from '../src/fund-data.js';
import { addPaperPosition, buildCommittee, emptyFundState, riskGate, scanMarket } from '../src/fund.js';

test('fund has exactly ten distinct accountable agents and risk is the final agent', () => {
  assert.equal(FUND_AGENTS.length, 10);
  assert.equal(new Set(FUND_AGENTS.map((agent) => agent.id)).size, 10);
  assert.equal(FUND_AGENTS.at(-1).id, 'risk');
});

test('market scan ranks every asset and preserves deterministic metrics', () => {
  const fund = emptyFundState();
  const first = scanMarket(FUND_UNIVERSE, fund.portfolio);
  const second = scanMarket(FUND_UNIVERSE, fund.portfolio);
  assert.equal(first.ranked.length, FUND_UNIVERSE.length);
  assert.deepEqual(first.ranked.map((item) => [item.ticker, item.metrics]), second.ranked.map((item) => [item.ticker, item.metrics]));
  assert.ok(first.ranked[0].metrics.signal >= first.ranked.at(-1).metrics.signal);
});

test('hard liquidity and tradability failures create a non-overridable risk veto', () => {
  const fund = emptyFundState();
  const unsafe = FUND_UNIVERSE.find((asset) => asset.ticker === 'SOLA');
  const gate = riskGate(unsafe, fund.portfolio, FUND_SETTINGS);
  const committee = buildCommittee(unsafe.ticker, fund.portfolio);
  assert.equal(gate.hardVeto, true);
  assert.equal(committee.finalDecision, 'rejected');
  assert.throws(() => addPaperPosition(fund.portfolio, { ...committee, finalDecision:'paper-approved' }), /risk-approved/);
});

test('approved paper position respects risk budget, position cap and portfolio cash', () => {
  const fund = emptyFundState();
  const committee = buildCommittee('QNTM', fund.portfolio);
  assert.equal(committee.finalDecision, 'paper-approved');
  assert.ok(committee.risk.positionPct <= FUND_SETTINGS.maxPositionPct);
  const updated = addPaperPosition(fund.portfolio, committee);
  assert.equal(updated.positions.length, 1);
  assert.ok(updated.cash < fund.portfolio.cash);
  assert.ok(updated.positions[0].entryValue <= FUND_SETTINGS.nav * FUND_SETTINGS.maxPositionPct / 100);
});
