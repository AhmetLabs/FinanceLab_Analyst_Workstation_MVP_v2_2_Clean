const FEEDBACK_ENDPOINT = '/api/ai/feedback';
const FUND_ENDPOINT = '/api/ai/fund';

export class AiFeedbackError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'AiFeedbackError';
    this.status = status;
  }
}

export async function requestAiFeedback(payload, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 32000);
  let response;
  try {
    response = await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new AiFeedbackError('Kimi took too long to respond. Please try again.');
    throw new AiFeedbackError('FinanceLab could not reach the local feedback service.');
  } finally {
    clearTimeout(timeout);
  }
  let body = {};
  try { body = await response.json(); } catch { /* use the safe fallback below */ }
  if (!response.ok || !body.ok) throw new AiFeedbackError(body.error || 'FinanceLab could not retrieve Kimi feedback.', response.status);
  if (!body.feedback || typeof body.feedback !== 'object') throw new AiFeedbackError('FinanceLab received incomplete feedback.');
  return body;
}

export async function getAiAvailability() {
  try {
    const response = await fetch('/api/health', { credentials: 'same-origin', cache: 'no-store' });
    const body = await response.json();
    return Boolean(response.ok && body.ok && body.aiFeedback);
  } catch {
    return false;
  }
}

export async function requestFundCommittee(payload, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 42000);
  let response;
  try {
    response = await fetch(FUND_ENDPOINT, {
      method:'POST',
      credentials:'same-origin',
      headers:{ 'content-type':'application/json' },
      body:JSON.stringify(payload),
      signal:controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new AiFeedbackError('The Kimi investment committee took too long to respond.');
    throw new AiFeedbackError('FinanceLab could not reach the local investment committee service.');
  } finally {
    clearTimeout(timeout);
  }
  let body = {};
  try { body = await response.json(); } catch { /* use safe fallback */ }
  if (!response.ok || !body.ok) throw new AiFeedbackError(body.error || 'FinanceLab could not complete the Kimi committee review.', response.status);
  if (!body.committee || typeof body.committee !== 'object') throw new AiFeedbackError('FinanceLab received an incomplete committee review.');
  return body;
}
