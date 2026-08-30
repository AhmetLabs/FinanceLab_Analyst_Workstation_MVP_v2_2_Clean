import { FUND_AGENTS, FUND_SETTINGS, FUND_UNIVERSE, SECTOR_TAPE } from './fund-data.js';

const clamp = (value, minimum = 0, maximum = 100) => Math.min(maximum, Math.max(minimum, Number(value) || 0));
const round = (value, digits = 1) => Number((Number(value) || 0).toFixed(digits));

export function emptyFundState() {
  return {
    selectedTicker:null,
    scan:null,
    committeeRuns:[],
    portfolio:{ cash:FUND_SETTINGS.nav, positions:[], realisedPnl:0, peakNav:FUND_SETTINGS.nav },
  };
}

export function normalizeFundState(input) {
  const base = emptyFundState();
  const value = input && typeof input === 'object' ? input : {};
  const positions = Array.isArray(value.portfolio?.positions)
    ? value.portfolio.positions.filter((item) => item && typeof item === 'object' && FUND_UNIVERSE.some((asset) => asset.ticker === item.ticker)).slice(0, 25)
    : [];
  const committeeRuns = Array.isArray(value.committeeRuns)
    ? value.committeeRuns.filter((item) => item && typeof item === 'object' && FUND_UNIVERSE.some((asset) => asset.ticker === item.ticker)).slice(0, 20)
    : [];
  return {
    selectedTicker:FUND_UNIVERSE.some((asset) => asset.ticker === value.selectedTicker) ? value.selectedTicker : null,
    scan:value.scan && typeof value.scan === 'object' ? value.scan : null,
    committeeRuns,
    portfolio:{
      cash:Number.isFinite(Number(value.portfolio?.cash)) ? Math.max(0, Number(value.portfolio.cash)) : base.portfolio.cash,
      positions,
      realisedPnl:Number(value.portfolio?.realisedPnl) || 0,
      peakNav:Number(value.portfolio?.peakNav) || base.portfolio.peakNav,
    },
  };
}

export function portfolioSnapshot(portfolio = emptyFundState().portfolio) {
  const positions = Array.isArray(portfolio.positions) ? portfolio.positions : [];
  const marketValue = positions.reduce((sum, position) => sum + Number(position.marketValue || position.entryValue || 0), 0);
  const nav = Number(portfolio.cash || 0) + marketValue;
  const grossPct = nav > 0 ? marketValue / nav * 100 : 0;
  const sectorExposure = positions.reduce((result, position) => {
    result[position.sector] = (result[position.sector] || 0) + Number(position.marketValue || position.entryValue || 0);
    return result;
  }, {});
  const drawdownPct = Number(portfolio.peakNav || nav) > 0 ? Math.max(0, (Number(portfolio.peakNav || nav) - nav) / Number(portfolio.peakNav || nav) * 100) : 0;
  return { nav, marketValue, grossPct, drawdownPct, sectorExposure };
}

export function momentumScore(asset) {
  const directional = asset.direction === 'short' ? -1 : 1;
  const day = clamp(50 + directional * asset.dayMove * 5);
  const week = clamp(50 + directional * asset.weekMove * 2.5);
  const month = clamp(50 + directional * asset.monthMove * 1.5);
  const alignment = directional * asset.dayMove > 0 && directional * asset.weekMove > 0 && directional * asset.monthMove > 0 ? 10 : 0;
  return round(clamp(day * 0.25 + week * 0.35 + month * 0.4 + alignment));
}

export function anomalyScore(asset) {
  const relativeVolume = clamp((asset.relativeVolume - 1) / 4 * 100);
  const volumeZ = clamp(asset.volumeZ / 4 * 100);
  const move = clamp(Math.abs(asset.dayMove) / 10 * 100);
  const gap = clamp(Math.abs(asset.gap) / 8 * 100);
  return round(relativeVolume * 0.3 + volumeZ * 0.25 + move * 0.25 + gap * 0.2);
}

export function setupScore(asset) {
  const sampleConfidence = clamp(asset.setup.sample / 60 * 100);
  const hitRate = clamp((asset.setup.hitRate - 35) / 35 * 100);
  const expectancy = clamp((asset.setup.averageReturn - asset.setup.downside * 0.45 + 1) / 9 * 100);
  return round(sampleConfidence * 0.2 + hitRate * 0.4 + expectancy * 0.4);
}

export function signalScore(asset) {
  const momentum = momentumScore(asset);
  const anomaly = anomalyScore(asset);
  const setup = setupScore(asset);
  return round(
    momentum * 0.25 +
    anomaly * 0.2 +
    clamp(asset.sectorStrength) * 0.1 +
    clamp(asset.catalyst.confidence) * 0.15 +
    clamp(asset.fundamentalScore) * 0.15 +
    setup * 0.15,
  );
}

export function riskGate(asset, portfolio, settings = FUND_SETTINGS) {
  const snapshot = portfolioSnapshot(portfolio);
  const stopDistance = Math.max(asset.atr * 1.5, asset.price * 0.035);
  const stopPct = stopDistance / asset.price * 100;
  const riskBudget = snapshot.nav * settings.riskPerTradePct / 100;
  const sizeByRisk = riskBudget / (stopPct / 100);
  const maxPositionValue = snapshot.nav * settings.maxPositionPct / 100;
  const grossRoom = Math.max(0, snapshot.nav * settings.maxGrossPct / 100 - snapshot.marketValue);
  const currentSectorValue = snapshot.sectorExposure[asset.sector] || 0;
  const sectorRoom = Math.max(0, snapshot.nav * settings.maxSectorPct / 100 - currentSectorValue);
  const recommendedValue = Math.max(0, Math.min(sizeByRisk, maxPositionValue, grossRoom, sectorRoom, Number(portfolio.cash || 0)));
  const positionPct = snapshot.nav > 0 ? recommendedValue / snapshot.nav * 100 : 0;
  const checks = [
    { id:'price', label:'Minimum price', pass:asset.price >= settings.minimumPrice, detail:`$${asset.price.toFixed(2)} vs $${settings.minimumPrice} minimum` },
    { id:'liquidity', label:'Liquidity', pass:asset.dollarVolume >= settings.minimumDollarVolume, detail:`$${asset.dollarVolume}M average dollar volume` },
    { id:'spread', label:'Tradability', pass:asset.spreadBps <= settings.maximumSpreadBps, detail:`${asset.spreadBps} bps spread vs ${settings.maximumSpreadBps} bps limit` },
    { id:'volatility', label:'Volatility ceiling', pass:asset.volatility <= settings.maximumVolatility, detail:`${asset.volatility}% annualised vs ${settings.maximumVolatility}% limit` },
    { id:'drawdown', label:'Fund drawdown', pass:snapshot.drawdownPct < settings.maxDrawdownPct, detail:`${round(snapshot.drawdownPct)}% vs ${settings.maxDrawdownPct}% stop` },
    { id:'capacity', label:'Portfolio capacity', pass:recommendedValue >= snapshot.nav * 0.005, detail:`${round(positionPct,2)}% position fits gross and sector limits` },
    { id:'source', label:'Catalyst evidence', pass:asset.sourceQuality !== 'unconfirmed', detail:asset.sourceQuality === 'unconfirmed' ? 'No confirmed primary or reliable secondary source' : `${asset.sourceQuality} evidence supplied` },
    { id:'setup', label:'Positive setup expectancy', pass:asset.setup.averageReturn > 0 && asset.setup.hitRate >= 45, detail:`${asset.setup.hitRate}% hit rate · ${asset.setup.averageReturn > 0 ? '+' : ''}${asset.setup.averageReturn}% average` },
  ];
  const failures = checks.filter((check) => !check.pass);
  const hardVeto = failures.length > 0;
  return {
    status:hardVeto ? 'veto' : signalScore(asset) >= 72 ? 'approved' : 'watchlist',
    hardVeto,
    checks,
    failures:failures.map((item) => item.label),
    recommendedValue:round(recommendedValue, 0),
    positionPct:round(positionPct, 2),
    shares:Math.floor(recommendedValue / asset.price),
    stopPrice:round(asset.direction === 'short' ? asset.price + stopDistance : asset.price - stopDistance, 2),
    stopPct:round(stopPct, 2),
    riskBudget:round(riskBudget, 0),
    snapshot,
  };
}

export function scanMarket(universe = FUND_UNIVERSE, portfolio = emptyFundState().portfolio, settings = FUND_SETTINGS) {
  const ranked = universe.map((asset) => {
    const metrics = {
      momentum:momentumScore(asset),
      anomaly:anomalyScore(asset),
      setup:setupScore(asset),
      signal:signalScore(asset),
    };
    const risk = riskGate(asset, portfolio, settings);
    const status = risk.hardVeto ? 'veto' : metrics.signal >= 72 ? 'candidate' : metrics.signal >= 60 ? 'watchlist' : 'monitor';
    return { ticker:asset.ticker, metrics, risk, status };
  }).sort((a, b) => b.metrics.signal - a.metrics.signal);
  return {
    createdAt:Date.now(),
    universeCount:universe.length,
    unusualCount:ranked.filter((item) => item.metrics.anomaly >= 60).length,
    candidateCount:ranked.filter((item) => item.status === 'candidate').length,
    vetoCount:ranked.filter((item) => item.status === 'veto').length,
    ranked,
  };
}

function agentVerdict(agentId, asset, metrics, risk) {
  const direction = asset.direction === 'short' ? 'short' : 'long';
  const verdicts = {
    universe:{ status:asset.dollarVolume >= FUND_SETTINGS.minimumDollarVolume ? 'pass' : 'veto', score:metrics.signal, summary:`${asset.ticker} ranks on the ${direction} side with $${asset.dollarVolume}M average dollar volume and a ${metrics.signal}/100 composite signal.` },
    sector:{ status:asset.sectorStrength >= 60 ? 'pass' : 'review', score:asset.sectorStrength, summary:`${asset.sector} strength is ${asset.sectorStrength}/100; sector context is ${asset.sectorStrength >= 70 ? 'supporting' : 'not a clean tailwind'}.` },
    momentum:{ status:metrics.momentum >= 65 ? 'pass' : 'review', score:metrics.momentum, summary:`Trend score ${metrics.momentum}/100 from ${asset.dayMove > 0 ? '+' : ''}${asset.dayMove}% day, ${asset.weekMove > 0 ? '+' : ''}${asset.weekMove}% week and ${asset.monthMove > 0 ? '+' : ''}${asset.monthMove}% month.` },
    anomaly:{ status:metrics.anomaly >= 60 ? 'pass' : 'review', score:metrics.anomaly, summary:`${asset.relativeVolume.toFixed(1)}× relative volume, ${asset.volumeZ.toFixed(1)}σ volume and a ${asset.gap > 0 ? '+' : ''}${asset.gap}% gap produce a ${metrics.anomaly}/100 anomaly score.` },
    catalyst:{ status:asset.catalyst.confidence >= 70 && asset.sourceQuality !== 'unconfirmed' ? 'pass' : 'review', score:asset.catalyst.confidence, summary:`${asset.catalyst.headline} Source: ${asset.catalyst.source}. ${asset.catalyst.mechanism}` },
    fundamentals:{ status:asset.fundamentalScore >= 65 ? 'pass' : 'review', score:asset.fundamentalScore, summary:`Fundamental score ${asset.fundamentalScore}/100: revenue ${asset.revenueGrowth > 0 ? '+' : ''}${asset.revenueGrowth}%, EPS ${asset.epsGrowth > 0 ? '+' : ''}${asset.epsGrowth}%, FCF margin ${asset.fcfMargin}% and ${asset.netDebtEbitda}× net debt/EBITDA.` },
    setup:{ status:metrics.setup >= 60 && asset.setup.averageReturn > 0 ? 'pass' : 'review', score:metrics.setup, summary:`Training analogue: n=${asset.setup.sample}, ${asset.setup.hitRate}% hit rate, ${asset.setup.averageReturn > 0 ? '+' : ''}${asset.setup.averageReturn}% average return and ${asset.setup.downside}% downside over ${asset.setup.holdingDays} days.` },
    bull:{ status:'debate', score:Math.round((metrics.signal + asset.fundamentalScore) / 2), summary:`The strongest case is that the confirmed catalyst, ${asset.sector} context and ${direction} trend create an earnings-revision or re-rating path.` },
    bear:{ status:'debate', score:Math.round(100 - (asset.catalyst.confidence * 0.35 + asset.fundamentalScore * 0.35 + metrics.setup * 0.3)), summary:`The strongest objection is ${asset.eventRisk} event risk, ${asset.forwardPE ? `${asset.forwardPE}× forward earnings` : 'weak earnings support'} and setup downside of ${asset.setup.downside}%.` },
    risk:{ status:risk.hardVeto ? 'veto' : risk.status === 'approved' ? 'pass' : 'review', score:risk.hardVeto ? 0 : Math.round(100 - Math.min(70, asset.volatility * 0.55 + asset.spreadBps * 0.45)), summary:risk.hardVeto ? `VETO: ${risk.failures.join(', ')}.` : `${risk.positionPct}% paper position, ${risk.shares} shares, $${risk.stopPrice} stop and $${risk.riskBudget.toLocaleString('en-US')} maximum loss budget.` },
  };
  return verdicts[agentId];
}

export function buildCommittee(ticker, portfolio, settings = FUND_SETTINGS, universe = FUND_UNIVERSE) {
  const asset = universe.find((item) => item.ticker === ticker);
  if (!asset) throw new Error('The selected security is not in the fund universe.');
  const metrics = { momentum:momentumScore(asset), anomaly:anomalyScore(asset), setup:setupScore(asset), signal:signalScore(asset) };
  const risk = riskGate(asset, portfolio, settings);
  const agents = FUND_AGENTS.map((agent) => ({ ...agent, ...agentVerdict(agent.id, asset, metrics, risk) }));
  const finalDecision = risk.hardVeto ? 'rejected' : risk.status === 'approved' ? 'paper-approved' : 'watchlist';
  return {
    id:`committee-${ticker}-${Date.now()}`,
    createdAt:Date.now(),
    ticker,
    asset:{ ...asset },
    metrics,
    risk,
    agents,
    finalDecision,
    ai:null,
  };
}

export function mergeAiCommittee(committee, ai) {
  if (!committee || !ai) return committee;
  const byId = {
    catalyst:ai.catalyst,
    fundamentals:ai.fundamentals,
    bull:ai.bull,
    bear:ai.bear,
  };
  const agents = committee.agents.map((agent) => byId[agent.id]?.summary ? { ...agent, summary:byId[agent.id].summary, ai:true } : agent);
  return { ...committee, agents, ai, finalDecision:committee.risk.hardVeto ? 'rejected' : committee.finalDecision };
}

export function addPaperPosition(portfolio, committee) {
  if (!committee || committee.finalDecision !== 'paper-approved' || committee.risk.hardVeto) throw new Error('Only a risk-approved committee decision can enter the paper portfolio.');
  if (portfolio.positions.some((item) => item.ticker === committee.ticker)) throw new Error('This security is already in the paper portfolio.');
  const value = committee.risk.shares * committee.asset.price;
  if (value <= 0 || value > portfolio.cash) throw new Error('The paper portfolio has insufficient capacity.');
  return {
    ...portfolio,
    cash:round(portfolio.cash - value, 2),
    positions:[...portfolio.positions, {
      id:`paper-${committee.ticker}-${Date.now()}`,
      ticker:committee.ticker,
      company:committee.asset.company,
      sector:committee.asset.sector,
      direction:committee.asset.direction,
      shares:committee.risk.shares,
      entryPrice:committee.asset.price,
      stopPrice:committee.risk.stopPrice,
      entryValue:round(value, 2),
      marketValue:round(value, 2),
      openedAt:Date.now(),
      committeeId:committee.id,
    }],
  };
}

export function sectorTape() {
  return SECTOR_TAPE.map((item) => ({ ...item }));
}
