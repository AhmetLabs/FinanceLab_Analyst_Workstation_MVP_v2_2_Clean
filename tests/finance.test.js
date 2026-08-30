import test from 'node:test';
import assert from 'node:assert/strict';
import { afterTaxInterest, dcfModel, equityValueFromEV, mergerModel, parseFinanceAmount, purchasePrice, takeoverPremium } from '../src/finance.js';

test('finance input parser accepts common European and English notation', () => {
  assert.equal(parseFinanceAmount('€1.6B', 'B'), 1.6);
  assert.equal(parseFinanceAmount('1,6B', 'B'), 1.6);
  assert.equal(parseFinanceAmount('1600M', 'B'), 1.6);
  assert.equal(parseFinanceAmount('€1600M', 'B'), 1.6);
  assert.equal(parseFinanceAmount('€1.300M', 'B'), 1.3);
  assert.equal(parseFinanceAmount('1,600M', 'B'), 1.6);
  assert.equal(parseFinanceAmount('1,600,000,000', 'B'), 1.6);
  assert.ok(Number.isNaN(parseFinanceAmount('not a value', 'B')));
});

test('core transaction calculations remain internally consistent', () => {
  assert.equal(purchasePrice({ offerPrice:25, shares:40 }), 1000);
  assert.equal(takeoverPremium({ offerPrice:20, unaffectedPrice:16 }), 25);
  assert.equal(equityValueFromEV({ enterpriseValue:1400, debt:300, cash:100 }), 1200);
  assert.equal(afterTaxInterest({ debt:600, rate:5, taxRate:25 }), 22.5);
});

test('DCF discounts terminal value and falls when WACC rises', () => {
  const input={revenue:520,ebitdaMargin:24,growth:11,taxRate:25,daPercent:3,capexPercent:5,nwcPercent:1.5,wacc:9.5,terminalGrowth:3,debt:260,cash:80,shares:120};
  const base=dcfModel(input);
  const higher=dcfModel(input,10.5,3);
  assert.ok(base.pvTerminal < base.terminalValue);
  assert.ok(base.enterpriseValue > base.pvForecast);
  assert.ok(higher.perShare < base.perShare);
  assert.ok(base.equityValue === base.enterpriseValue - 260 + 80);
});

test('merger model includes stock dilution and after-tax interest', () => {
  const result=mergerModel({purchasePrice:1200,cashPercent:25,debtPercent:45,stockPercent:30,buyerSharePrice:50,buyerNetIncome:500,buyerShares:150,targetNetIncome:95,synergies:35,interestRate:5.5,taxRate:25,integrationCosts:18});
  assert.equal(result.debtValue,540);
  assert.equal(result.newShares,7.2);
  assert.ok(Math.abs(result.interest-22.275)<0.001);
  assert.ok(Number.isFinite(result.accretion));
});
