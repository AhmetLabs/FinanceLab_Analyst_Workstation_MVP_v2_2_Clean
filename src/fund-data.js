export const FUND_AGENTS = [
  { id:'universe', number:1, name:'Universe Scanner', mandate:'Filter the investable universe for liquidity, price and signal quality.', layer:'signal', engine:'deterministic' },
  { id:'sector', number:2, name:'Sector & Regime', mandate:'Measure sector breadth, leadership and the market regime around the move.', layer:'signal', engine:'deterministic' },
  { id:'momentum', number:3, name:'Momentum', mandate:'Test trend strength across one-day, one-week and one-month horizons.', layer:'signal', engine:'deterministic' },
  { id:'anomaly', number:4, name:'Volume & Anomaly', mandate:'Detect gaps, relative-volume spikes and statistically unusual moves.', layer:'signal', engine:'deterministic' },
  { id:'catalyst', number:5, name:'Catalyst & News', mandate:'Connect the move to time-stamped supplied evidence and flag unexplained price action.', layer:'research', engine:'kimi' },
  { id:'fundamentals', number:6, name:'Fundamentals', mandate:'Check growth, cash generation, balance-sheet risk and valuation support.', layer:'research', engine:'kimi' },
  { id:'setup', number:7, name:'Setup Test', mandate:'Evaluate the historical analogue sample, expectancy and failure rate.', layer:'validation', engine:'deterministic' },
  { id:'bull', number:8, name:'Bull Advocate', mandate:'Build the strongest evidence-based case for taking the trade.', layer:'debate', engine:'kimi' },
  { id:'bear', number:9, name:'Bear Advocate', mandate:'Attack the thesis, surface disconfirming evidence and define failure.', layer:'debate', engine:'kimi' },
  { id:'risk', number:10, name:'Risk & CIO Gate', mandate:'Set exposure, enforce hard limits and veto any trade that breaches policy.', layer:'risk', engine:'deterministic' },
];

export const FUND_SETTINGS = {
  nav:1_000_000,
  riskPerTradePct:0.75,
  maxPositionPct:8,
  maxSectorPct:25,
  maxGrossPct:80,
  maxDrawdownPct:10,
  minimumPrice:5,
  minimumDollarVolume:50,
  maximumSpreadBps:35,
  maximumVolatility:78,
};

export const SECTOR_TAPE = [
  { sector:'Semiconductors', day:2.4, breadth:78, trend:'Leading' },
  { sector:'Software', day:1.1, breadth:66, trend:'Improving' },
  { sector:'Industrials', day:0.6, breadth:61, trend:'Constructive' },
  { sector:'Financials', day:0.2, breadth:54, trend:'Neutral' },
  { sector:'Energy', day:-0.7, breadth:41, trend:'Weakening' },
  { sector:'Consumer', day:-1.2, breadth:36, trend:'Lagging' },
];

const catalyst = (headline, source, ageHours, confidence, mechanism) => ({ headline, source, ageHours, confidence, mechanism });
const setup = (sample, hitRate, averageReturn, downside, holdingDays) => ({ sample, hitRate, averageReturn, downside, holdingDays });

// A bundled, fictional and explicitly labelled training snapshot. It exercises the
// complete fund workflow without pretending to be a live or licensed market feed.
export const FUND_UNIVERSE = [
  {
    ticker:'QNTM', company:'QuantumWorks', sector:'Semiconductors', price:84.20, dayMove:8.7, weekMove:13.4, monthMove:29.1,
    relativeVolume:3.8, volumeZ:3.2, gap:5.4, volatility:52, beta:1.42, dollarVolume:920, spreadBps:8, atr:4.6,
    sectorStrength:88, revenueGrowth:31, epsGrowth:44, fcfMargin:21, netDebtEbitda:0.2, forwardPE:34, fundamentalScore:82,
    catalyst:catalyst('Raised full-year accelerator revenue outlook after a capacity agreement','Company release · training packet',5,91,'Higher contracted capacity raises near-term revenue visibility and supports estimate revisions.'),
    setup:setup(46,65,5.8,-3.1,12), eventRisk:'medium', direction:'long', sourceQuality:'primary',
  },
  {
    ticker:'NOVA', company:'NovaGrid Systems', sector:'Industrials', price:47.60, dayMove:6.1, weekMove:8.9, monthMove:16.7,
    relativeVolume:2.9, volumeZ:2.6, gap:3.2, volatility:39, beta:1.08, dollarVolume:310, spreadBps:12, atr:2.1,
    sectorStrength:70, revenueGrowth:18, epsGrowth:23, fcfMargin:14, netDebtEbitda:1.1, forwardPE:22, fundamentalScore:74,
    catalyst:catalyst('Won a multi-year grid modernisation framework contract','Company release · training packet',11,86,'The award expands backlog and can improve factory utilisation if project milestones convert on schedule.'),
    setup:setup(38,61,4.1,-2.7,15), eventRisk:'low', direction:'long', sourceQuality:'primary',
  },
  {
    ticker:'VRTX', company:'Vertex Cloud', sector:'Software', price:132.40, dayMove:4.8, weekMove:10.3, monthMove:18.6,
    relativeVolume:2.5, volumeZ:2.1, gap:1.9, volatility:46, beta:1.26, dollarVolume:680, spreadBps:9, atr:5.8,
    sectorStrength:77, revenueGrowth:25, epsGrowth:37, fcfMargin:28, netDebtEbitda:-0.6, forwardPE:41, fundamentalScore:79,
    catalyst:catalyst('Quarterly net retention stabilised while operating margin beat the supplied consensus','Earnings release · training packet',16,84,'Better retention reduces the probability of another growth reset while margin delivery improves earnings quality.'),
    setup:setup(52,58,3.9,-3.4,10), eventRisk:'medium', direction:'long', sourceQuality:'primary',
  },
  {
    ticker:'CRST', company:'Crestline Bank', sector:'Financials', price:63.10, dayMove:3.6, weekMove:7.8, monthMove:11.4,
    relativeVolume:2.2, volumeZ:1.9, gap:1.1, volatility:29, beta:0.92, dollarVolume:240, spreadBps:14, atr:1.7,
    sectorStrength:58, revenueGrowth:9, epsGrowth:16, fcfMargin:0, netDebtEbitda:0, forwardPE:12, fundamentalScore:72,
    catalyst:catalyst('Net interest income guidance improved and deposit costs eased','Earnings release · training packet',8,82,'A slower rise in funding costs supports the forward margin and reduces downside to earnings estimates.'),
    setup:setup(41,59,2.8,-2.0,14), eventRisk:'medium', direction:'long', sourceQuality:'primary',
  },
  {
    ticker:'ARCL', company:'ArcLight Energy', sector:'Energy', price:28.90, dayMove:7.4, weekMove:3.2, monthMove:-6.8,
    relativeVolume:4.4, volumeZ:3.7, gap:6.3, volatility:68, beta:1.66, dollarVolume:180, spreadBps:22, atr:2.4,
    sectorStrength:39, revenueGrowth:-7, epsGrowth:-18, fcfMargin:7, netDebtEbitda:2.9, forwardPE:18, fundamentalScore:38,
    catalyst:catalyst('A temporary regional supply disruption lifted spot pricing','Market notice · training packet',3,63,'The price shock may support near-term realisations, but duration and company-specific capture are unproven.'),
    setup:setup(29,45,1.1,-5.7,7), eventRisk:'high', direction:'long', sourceQuality:'secondary',
  },
  {
    ticker:'MESA', company:'Mesa Consumer', sector:'Consumer', price:11.80, dayMove:-12.6, weekMove:-18.3, monthMove:-24.7,
    relativeVolume:5.2, volumeZ:4.1, gap:-9.8, volatility:83, beta:1.83, dollarVolume:74, spreadBps:41, atr:1.5,
    sectorStrength:31, revenueGrowth:-11, epsGrowth:-42, fcfMargin:-3, netDebtEbitda:4.8, forwardPE:0, fundamentalScore:18,
    catalyst:catalyst('Withdrew guidance after a channel inventory correction','Company release · training packet',4,94,'Lower sell-through creates earnings uncertainty and may force promotional activity and working-capital pressure.'),
    setup:setup(33,39,-1.6,-8.4,8), eventRisk:'high', direction:'short', sourceQuality:'primary',
  },
  {
    ticker:'APEX', company:'Apex Automation', sector:'Industrials', price:96.30, dayMove:2.9, weekMove:6.2, monthMove:14.9,
    relativeVolume:1.9, volumeZ:1.5, gap:0.6, volatility:34, beta:1.04, dollarVolume:450, spreadBps:7, atr:3.0,
    sectorStrength:70, revenueGrowth:14, epsGrowth:19, fcfMargin:17, netDebtEbitda:0.8, forwardPE:26, fundamentalScore:76,
    catalyst:catalyst('Announced a larger authorised repurchase alongside stable guidance','Company release · training packet',22,72,'The repurchase can support per-share growth but does not change the underlying demand outlook.'),
    setup:setup(64,56,2.7,-2.5,20), eventRisk:'low', direction:'long', sourceQuality:'primary',
  },
  {
    ticker:'LYRA', company:'Lyra Security', sector:'Software', price:71.50, dayMove:5.5, weekMove:12.1, monthMove:22.8,
    relativeVolume:3.1, volumeZ:2.8, gap:2.4, volatility:57, beta:1.51, dollarVolume:390, spreadBps:11, atr:3.9,
    sectorStrength:77, revenueGrowth:28, epsGrowth:51, fcfMargin:19, netDebtEbitda:-0.2, forwardPE:48, fundamentalScore:73,
    catalyst:catalyst('Large-enterprise contract growth accelerated in the supplied quarterly update','Earnings release · training packet',13,85,'Enterprise wins increase recurring revenue visibility, but the valuation requires continued execution.'),
    setup:setup(35,63,5.0,-4.0,11), eventRisk:'high', direction:'long', sourceQuality:'primary',
  },
  {
    ticker:'ORBT', company:'Orbit Mobility', sector:'Consumer', price:39.20, dayMove:-4.9, weekMove:-7.7, monthMove:5.1,
    relativeVolume:2.6, volumeZ:2.0, gap:-2.7, volatility:61, beta:1.72, dollarVolume:520, spreadBps:13, atr:2.8,
    sectorStrength:31, revenueGrowth:21, epsGrowth:0, fcfMargin:4, netDebtEbitda:1.7, forwardPE:56, fundamentalScore:49,
    catalyst:catalyst('A regulator opened a review of the company’s driver classification model','Regulatory notice · training packet',7,79,'A change in classification could raise unit labour costs and lower long-term margin potential.'),
    setup:setup(27,48,-0.4,-6.0,9), eventRisk:'high', direction:'short', sourceQuality:'primary',
  },
  {
    ticker:'HELI', company:'Helios Devices', sector:'Semiconductors', price:58.70, dayMove:1.7, weekMove:4.3, monthMove:12.6,
    relativeVolume:1.4, volumeZ:0.9, gap:0.2, volatility:43, beta:1.31, dollarVolume:610, spreadBps:6, atr:2.6,
    sectorStrength:88, revenueGrowth:17, epsGrowth:21, fcfMargin:18, netDebtEbitda:0.4, forwardPE:29, fundamentalScore:75,
    catalyst:catalyst('No new company-specific disclosure in the supplied packet','No confirmed catalyst · training packet',36,24,'Sector sympathy may explain part of the move, but company-specific causality is unconfirmed.'),
    setup:setup(71,54,2.1,-2.8,14), eventRisk:'low', direction:'long', sourceQuality:'unconfirmed',
  },
  {
    ticker:'SOLA', company:'Solara Retail', sector:'Consumer', price:7.40, dayMove:9.2, weekMove:16.5, monthMove:-31.2,
    relativeVolume:6.0, volumeZ:4.4, gap:7.1, volatility:96, beta:2.12, dollarVolume:38, spreadBps:66, atr:1.1,
    sectorStrength:31, revenueGrowth:-19, epsGrowth:-67, fcfMargin:-8, netDebtEbitda:6.1, forwardPE:0, fundamentalScore:9,
    catalyst:catalyst('Social-media speculation referenced a possible strategic review','Unverified discussion · training packet',2,18,'No primary-source confirmation is supplied, so the move cannot be tied to a verified catalyst.'),
    setup:setup(18,28,-3.7,-12.1,5), eventRisk:'extreme', direction:'long', sourceQuality:'unconfirmed',
  },
  {
    ticker:'NEXA', company:'Nexa Payments', sector:'Financials', price:118.60, dayMove:2.1, weekMove:5.7, monthMove:9.8,
    relativeVolume:1.7, volumeZ:1.2, gap:0.4, volatility:33, beta:1.12, dollarVolume:760, spreadBps:6, atr:3.2,
    sectorStrength:58, revenueGrowth:13, epsGrowth:20, fcfMargin:24, netDebtEbitda:0.3, forwardPE:25, fundamentalScore:81,
    catalyst:catalyst('Cross-border payment volume accelerated in the monthly operating update','Company release · training packet',19,76,'Higher cross-border mix can lift revenue yield, subject to currency and travel-normalisation effects.'),
    setup:setup(57,57,2.5,-2.2,16), eventRisk:'low', direction:'long', sourceQuality:'primary',
  },
];

export const FUND_DATA_STATUS = {
  mode:'demo',
  label:'Bundled training snapshot',
  universe:'12 fictional U.S.-style securities · 6 sectors',
  asOf:'Static scenario data — not a live market timestamp',
  limitation:'Connect a licensed market-data, fundamentals and news provider on the server to scan a real full universe.',
};
