import test from 'node:test';
import assert from 'node:assert/strict';
import { handleWorkerRequest, requestKimiFundCommittee } from '../server/index.js';

const payload = {
  ticker:'QNTM',
  riskDecision:'paper-approved',
  context:'Company QuantumWorks. Supplied catalyst: raised revenue outlook in a company release. Revenue growth 31%, FCF margin 21%, relative volume 3.8x. This is a static training packet and not live data.',
  deterministic:'Composite signal 84/100. All liquidity, spread, volatility, capacity, evidence and setup checks pass. Maximum paper position 8%. Stop and loss budget are fixed by the risk engine.',
};

const committee = {
  catalyst:{ summary:'The supplied company release plausibly explains the volume-backed move, but persistence still needs operating confirmation.', confidence:'medium' },
  fundamentals:{ summary:'Growth and free cash flow support the thesis, while valuation remains an important sensitivity.', confidence:'medium' },
  bull:{ summary:'Estimate revisions and sector leadership could extend the move if capacity converts to revenue.', confidence:'medium' },
  bear:{ summary:'Expectations may already discount a rapid conversion and any delay would weaken the setup.', confidence:'medium' },
  memo:{ summary:'The supplied packet supports a monitored paper setup within the fixed risk limits.', catalyst:'Raised revenue outlook.', primaryRisk:'Capacity conversion falls short.', invalidation:'Revenue evidence fails to confirm the outlook.', openQuestions:['What backlog conversion is required?'], stance:'supportive' },
  confidence:'medium',
};

test('fund committee uses structured output and never returns the server credential', async () => {
  let upstream;
  const result = await requestKimiFundCommittee(payload, {
    apiKey:'test-only-placeholder',
    fetchImpl:async (url, options) => {
      upstream={ url, options };
      return new Response(JSON.stringify({ model:'test-model', choices:[{ message:{ content:JSON.stringify(committee) } }] }), { status:200 });
    },
  });
  assert.equal(upstream.url, 'https://api.moonshot.ai/v1/chat/completions');
  const body=JSON.parse(upstream.options.body);
  assert.equal(body.response_format.type, 'json_schema');
  assert.match(body.messages[0].content, /Risk & CIO Gate are authoritative/);
  assert.equal(result.committee.memo.stance, 'supportive');
  assert.equal(JSON.stringify(result).includes('test-only-placeholder'), false);
});

test('fund API rejects cross-origin requests and invalid risk decisions', async () => {
  const secretName=['KIMI','API','KEY'].join('_');
  const crossOrigin=await handleWorkerRequest(new Request('https://financelab.test/api/ai/fund', {
    method:'POST',
    headers:{ origin:'https://attacker.test', 'content-type':'application/json' },
    body:JSON.stringify(payload),
  }), { [secretName]:'test' });
  assert.equal(crossOrigin.status, 403);
  await assert.rejects(() => requestKimiFundCommittee({ ...payload, riskDecision:'live-buy' }, { apiKey:'test' }), (error) => error.status === 400);
});
