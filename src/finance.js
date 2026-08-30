export const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

export function parseFinanceAmount(input = '', outputUnit = 'M') {
  let raw = String(input).trim().toLowerCase().replace(/\u00a0/g, ' ').replace(/€/g, '').trim();
  if (!raw) return Number.NaN;

  let inputUnit = '';
  if (/(?:bn|billion|miljard(?:en)?|\d\s*b)\s*$/.test(raw)) inputUnit = 'B';
  else if (/(?:mm|million|miljoen(?:en)?|mio|\d\s*m)\s*$/.test(raw)) inputUnit = 'M';
  else if (/(?:thousand|duizend|\d\s*k)\s*$/.test(raw)) inputUnit = 'K';

  let numeric = raw
    .replace(/(?:bn|billion|miljard(?:en)?|mm|million|miljoen(?:en)?|mio|thousand|duizend|[bmk])/g, '')
    .replace(/\s+/g, '')
    .replace(/[^0-9,.-]/g, '');
  if (!numeric) return Number.NaN;

  const dots = (numeric.match(/\./g) || []).length;
  const commas = (numeric.match(/,/g) || []).length;
  if (dots > 1 && commas === 0) numeric = numeric.replace(/\./g, '');
  else if (commas > 1 && dots === 0) numeric = numeric.replace(/,/g, '');
  else if (dots && commas) {
    const decimal = numeric.lastIndexOf('.') > numeric.lastIndexOf(',') ? '.' : ',';
    numeric = numeric.split(decimal === '.' ? ',' : '.').join('');
    if (decimal === ',') numeric = numeric.replace(',', '.');
  } else if (commas === 1) {
    const [left, right] = numeric.split(',');
    numeric = inputUnit === 'M' && outputUnit === 'B' && right.length === 3 ? left + right : left + '.' + right;
  } else if (dots === 1 && inputUnit === 'M' && /^-?\d{1,3}\.\d{3}$/.test(numeric)) {
    numeric = numeric.replace('.', '');
  }

  const value = Number(numeric);
  if (!Number.isFinite(value)) return Number.NaN;

  let euros;
  if (inputUnit === 'B') euros = value * 1e9;
  else if (inputUnit === 'M') euros = value * 1e6;
  else if (inputUnit === 'K') euros = value * 1e3;
  else if (Math.abs(value) >= 1e6) euros = value;
  else if (outputUnit === 'B' && Math.abs(value) > 100) euros = value * 1e6;
  else if (outputUnit === 'M' && Math.abs(value) > 100000) euros = value;
  else euros = value * (outputUnit === 'B' ? 1e9 : outputUnit === 'M' ? 1e6 : 1);

  return outputUnit === 'B' ? euros / 1e9 : outputUnit === 'M' ? euros / 1e6 : euros;
}

export function parsePercent(input = '') {
  const value = Number(String(input).toLowerCase().replace(/%|percentage points?|procentpunten?|pp/g, '').replace(',', '.').trim());
  return Number.isFinite(value) ? value : Number.NaN;
}

export function parseNumber(input = '') {
  const value = Number(String(input).replace(/€|%|\s/g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : Number.NaN;
}

export function nearlyEqual(actual, expected, tolerance = 0.02) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

export function equityValueFromEV({ enterpriseValue, debt, cash, preferred = 0, minority = 0 }) {
  return enterpriseValue - debt + cash - preferred - minority;
}

export function purchasePrice({ offerPrice, shares }) {
  return offerPrice * shares;
}

export function takeoverPremium({ offerPrice, unaffectedPrice }) {
  return ((offerPrice - unaffectedPrice) / unaffectedPrice) * 100;
}

export function afterTaxInterest({ debt, rate, taxRate }) {
  return debt * (rate / 100) * (1 - taxRate / 100);
}

export function mergerModel(input) {
  const stockValue = input.purchasePrice * (input.stockPercent / 100);
  const debtValue = input.purchasePrice * (input.debtPercent / 100);
  const newShares = stockValue / input.buyerSharePrice;
  const interest = afterTaxInterest({ debt: debtValue, rate: input.interestRate, taxRate: input.taxRate });
  const proFormaNetIncome = input.buyerNetIncome + input.targetNetIncome + input.synergies - interest - input.integrationCosts;
  const proFormaShares = input.buyerShares + newShares;
  const preDealEPS = input.buyerNetIncome / input.buyerShares;
  const proFormaEPS = proFormaNetIncome / proFormaShares;
  const accretion = ((proFormaEPS - preDealEPS) / preDealEPS) * 100;
  return { stockValue, debtValue, newShares, interest, proFormaNetIncome, proFormaShares, preDealEPS, proFormaEPS, accretion };
}

export function roic({ nopat, investedCapital }) {
  return (nopat / investedCapital) * 100;
}

export function dcfModel(input, waccOverride = input.wacc, terminalOverride = input.terminalGrowth) {
  const wacc = waccOverride / 100;
  const terminalGrowth = terminalOverride / 100;
  if (!Number.isFinite(wacc) || !Number.isFinite(terminalGrowth) || wacc <= terminalGrowth) {
    throw new Error('WACC must be higher than terminal growth.');
  }
  let revenue = input.revenue;
  let pvForecast = 0;
  const forecast = [];
  for (let year = 1; year <= 5; year += 1) {
    const fade = (input.growth - (input.terminalGrowth + 1)) * ((year - 1) / 4);
    const growth = input.growth - fade;
    revenue *= 1 + growth / 100;
    const ebitda = revenue * (input.ebitdaMargin / 100);
    const depreciation = revenue * (input.daPercent / 100);
    const ebit = ebitda - depreciation;
    const nopat = ebit * (1 - input.taxRate / 100);
    const capex = revenue * (input.capexPercent / 100);
    const changeNwc = revenue * (input.nwcPercent / 100);
    const ufcf = nopat + depreciation - capex - changeNwc;
    const discountFactor = 1 / Math.pow(1 + wacc, year);
    const presentValue = ufcf * discountFactor;
    pvForecast += presentValue;
    forecast.push({ year, growth, revenue, ebitda, depreciation, ebit, nopat, capex, changeNwc, ufcf, discountFactor, presentValue });
  }
  const terminalFCF = forecast.at(-1).ufcf * (1 + terminalGrowth);
  const terminalValue = terminalFCF / (wacc - terminalGrowth);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, 5);
  const enterpriseValue = pvForecast + pvTerminal;
  const equityValue = equityValueFromEV({ enterpriseValue, debt: input.debt, cash: input.cash });
  const perShare = equityValue / input.shares;
  return {
    forecast,
    pvForecast,
    terminalFCF,
    terminalValue,
    pvTerminal,
    enterpriseValue,
    equityValue,
    perShare,
    terminalShare: (pvTerminal / enterpriseValue) * 100,
    wacc: waccOverride,
    terminalGrowth: terminalOverride,
  };
}

export function validateDcf(input) {
  const missing = Object.entries(input).filter(([, value]) => !Number.isFinite(Number(value))).map(([key]) => key);
  if (missing.length) return `Complete every assumption. Missing: ${missing.join(', ')}.`;
  if (input.revenue <= 0 || input.shares <= 0) return 'Revenue and shares must be positive.';
  if (input.wacc <= input.terminalGrowth + 1) return 'WACC must exceed terminal growth by at least 1 percentage point.';
  if (input.ebitdaMargin <= 0 || input.ebitdaMargin >= 80) return 'Use a realistic EBITDA margin.';
  if (input.taxRate < 0 || input.taxRate > 60) return 'Use a realistic tax rate.';
  return '';
}

export function formatMoney(value, digits = 0) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: digits }).format(value) + 'M';
}
