const concept = (id, name, skill, definition, formula = '', mistake = '', connections = [], difficulty = 1) => ({
  id, name, skill, definition, formula, mistake, connections, difficulty,
  example: formula ? `Use ${formula} and keep every value on the same financial basis.` : `Identify the fact, explain the mechanism and state the financial implication.`,
});

export const SKILLS = [
  { id: 'accounting', name: 'Accounting', group: 'Foundation', description: 'Record and interpret financial performance.' },
  { id: 'statements', name: 'Financial Statements', group: 'Foundation', description: 'Connect profit, balance-sheet movements and cash flow.' },
  { id: 'corporate', name: 'Corporate Finance', group: 'Foundation', description: 'Evaluate returns, funding and capital allocation.' },
  { id: 'valuation', name: 'Valuation', group: 'Analyst Core', description: 'Estimate enterprise and shareholder value.' },
  { id: 'ma', name: 'M&A', group: 'Transactions', description: 'Analyse deal price, financing, accretion and transaction risk.' },
  { id: 'markets', name: 'Markets', group: 'Markets', description: 'Reason from macro surprises to cross-asset reactions.' },
  { id: 'reasoning', name: 'Financial Reasoning', group: 'Cross-skill', description: 'Connect facts, mechanisms, implications and decisions.' },
  { id: 'writing', name: 'Analyst Writing', group: 'Cross-skill', description: 'Communicate evidence, uncertainty and recommendations.' },
];

export const CONCEPTS = [
  concept('revenue','Revenue','accounting','Income generated from selling goods or services.','Revenue = Price × Volume','Revenue growth does not automatically mean value creation.',['ebitda','working-capital']),
  concept('ebitda','EBITDA','accounting','Operating profit before interest, tax, depreciation and amortisation.','EBITDA = Revenue − cash operating costs','EBITDA is not cash flow.',['ebit','ev-ebitda']),
  concept('ebit','EBIT','accounting','Operating profit after depreciation and amortisation.','EBIT = EBITDA − D&A','CapEx does not reduce EBIT immediately; depreciation does.',['ebitda','nopat']),
  concept('net-income','Net Income','accounting','Profit attributable after operating, financing and tax effects.','Net Income = Pre-tax Income − Tax','Net Income is not the same as cash generated.',['eps','cash-flow-statement']),
  concept('depreciation','Depreciation','accounting','Non-cash allocation of a tangible asset cost over its useful life.','Ending PP&E = Opening PP&E + CapEx − Depreciation','Depreciation affects profit; CapEx is the investing cash outflow.',['ebit','capex']),
  concept('working-capital','Working Capital','accounting','Operating current assets minus operating current liabilities.','NWC = AR + Inventory − AP','An increase in operating NWC generally uses cash.',['accounts-receivable','inventory','accounts-payable'],2),

  concept('income-statement','Income Statement','statements','Shows revenue, expenses and profit over a period.','Revenue − Expenses = Profit','It does not explain every cash movement.',['balance-sheet','cash-flow-statement']),
  concept('balance-sheet','Balance Sheet','statements','Shows assets, liabilities and equity at a point in time.','Assets = Liabilities + Equity','A balance sheet is a stock, not a period flow.',['income-statement','cash-flow-statement']),
  concept('cash-flow-statement','Cash Flow Statement','statements','Reconciles opening and closing cash through operating, investing and financing activities.','CFO + CFI + CFF = Change in Cash','Positive Net Income does not guarantee positive cash flow.',['net-income','free-cash-flow']),
  concept('accounts-receivable','Accounts Receivable','statements','Customer invoices recognised as revenue but not yet collected.','AR days = Average AR / Revenue × Days','Rising AR may reflect growth or slower collection; it is not proof of either.',['working-capital','revenue']),
  concept('inventory','Inventory','statements','Goods held for production or sale.','Inventory days = Average Inventory / COGS × Days','Inventory growth usually uses cash and may signal demand or obsolescence risk.',['working-capital','cash-flow-statement']),
  concept('accounts-payable','Accounts Payable','statements','Amounts owed to suppliers.','AP days = Average AP / COGS × Days','Higher AP preserves cash temporarily but can signal supplier pressure.',['working-capital','cash-flow-statement']),
  concept('capex','Capital Expenditure','statements','Cash invested in long-lived operating assets.','FCF = Operating Cash Flow − CapEx','CapEx is not an immediate direct Net Income expense.',['depreciation','free-cash-flow']),
  concept('free-cash-flow','Free Cash Flow','statements','Cash available after funding operations and necessary investment.','FCF = NOPAT + D&A − CapEx − ΔNWC','A single strong year may not be sustainable.',['dcf','capex'],2),

  concept('nopat','NOPAT','corporate','After-tax operating profit independent of financing.','NOPAT = EBIT × (1 − Tax Rate)','Do not subtract interest when measuring operating return.',['roic','ebit']),
  concept('roic','ROIC','corporate','After-tax operating return earned on invested operating capital.','ROIC = NOPAT / Invested Capital','High ROIC should be assessed for durability and accounting distortions.',['wacc','roiic'],2),
  concept('wacc','WACC','corporate','Blended required return for debt and equity capital providers.','WACC = E/V × Cost of Equity + D/V × After-tax Cost of Debt','WACC is an estimate, not an observable fact.',['roic','dcf'],2),
  concept('roiic','ROIIC','corporate','Return earned on incremental invested capital.','ROIIC = ΔNOPAT / ΔInvested Capital','Historical ROIC can be strong while new investment destroys value.',['roic','capital-allocation'],2),
  concept('capital-allocation','Capital Allocation','corporate','Management decisions about reinvestment, acquisitions, debt, dividends and buybacks.','','More investment is not automatically better.',['roic','buybacks'],2),
  concept('operating-leverage','Operating Leverage','corporate','Sensitivity of operating profit to revenue changes due to fixed costs.','Degree of Operating Leverage = %Δ EBIT / %Δ Revenue','Operating leverage increases downside as well as upside.',['ebitda','revenue'],2),
  concept('buybacks','Share Buybacks','corporate','Company repurchases of its own shares.','New Shares = Old Shares − Repurchased Shares','Buybacks can destroy value when shares are repurchased above intrinsic value.',['eps','capital-allocation'],2),
  concept('eps','EPS','corporate','Net Income attributable per diluted share.','EPS = Net Income / Diluted Shares','EPS growth can be driven by buybacks or leverage rather than operating improvement.',['net-income','accretion'],2),

  concept('market-cap','Market Capitalisation','valuation','Market value of common equity.','Market Cap = Share Price × Diluted Shares','Market Cap is not Enterprise Value.',['enterprise-value','equity-value']),
  concept('enterprise-value','Enterprise Value','valuation','Value of operating assets available to all capital providers.','EV = Equity Value + Debt − Cash','Do not compare EV directly with an Equity Purchase Price.',['equity-value','ev-equity-bridge']),
  concept('equity-value','Equity Value','valuation','Value attributable to common shareholders.','Equity Value = EV − Debt + Cash','Debt and cash adjustments must use a consistent valuation date.',['enterprise-value','market-cap']),
  concept('ev-equity-bridge','EV → Equity Value Bridge','valuation','Adjusts operating-business value to shareholder value.','Equity Value = EV − Debt + Cash − Other Claims','Ignoring preferred stock, leases or minority interest can overstate equity value.',['enterprise-value','equity-value'],2),
  concept('ev-ebitda','EV/EBITDA','valuation','Enterprise-value multiple relative to pre-D&A operating earnings.','EV/EBITDA = Enterprise Value / EBITDA','Different sectors and accounting profiles are not automatically comparable.',['comps','ebitda']),
  concept('pe','P/E','valuation','Equity-value multiple relative to earnings per share.','P/E = Share Price / EPS','P/E is distorted by capital structure and non-recurring earnings.',['eps','comps']),
  concept('comps','Comparable Companies','valuation','Market-based valuation using trading multiples of similar public companies.','Implied EV = Selected Multiple × Target Metric','The median is not automatically the correct selected multiple.',['ev-ebitda','equity-value'],2),
  concept('dcf','DCF','valuation','Intrinsic valuation based on discounted future free cash flows.','PV = Future Cash Flow / (1 + WACC)^t','A precise output can still rest on weak assumptions.',['free-cash-flow','terminal-value','wacc'],2),
  concept('terminal-value','Terminal Value','valuation','Value of cash flows beyond the explicit forecast period.','TV = FCF(n+1) / (WACC − g)','Terminal Value is measured at the end of the forecast and must be discounted.',['dcf','sensitivity'],2),
  concept('sensitivity','Sensitivity Analysis','valuation','Shows how valuation changes when key assumptions change.','','It is not a substitute for choosing defensible assumptions.',['dcf','wacc'],2),

  concept('purchase-price','Equity Purchase Price','ma','Amount paid for the target company’s common equity.','Purchase Price = Offer Price × Target Shares','Purchase Price is an amount; takeover premium is a percentage.',['takeover-premium','sources-uses']),
  concept('takeover-premium','Takeover Premium','ma','Percentage paid above the unaffected target share price.','Premium = (Offer − Unaffected) / Unaffected','A premium does not prove overpayment or value destruction.',['purchase-price','synergies']),
  concept('sources-uses','Sources & Uses','ma','Schedule showing how a transaction is funded and where funds are applied.','Total Sources = Total Uses','Transaction fees and refinancing needs are often omitted in oversimplified schedules.',['financing-mix','transaction-fees'],2),
  concept('synergies','Synergies','ma','Incremental benefits expected from combining businesses.','Net Synergy Value = PV Benefits − Integration Costs','Announced synergies may not be achievable.',['integration-costs','accretion'],2),
  concept('accretion','Accretion / Dilution','ma','Percentage change in buyer EPS after a transaction.','Accretion % = (Pro Forma EPS − Buyer EPS) / Buyer EPS','Accretion does not automatically mean value creation.',['pro-forma','merger-model'],2),
  concept('pro-forma','Pro Forma','ma','Combined financial results as if the transaction had already occurred.','Pro Forma NI = Buyer NI + Target NI + Synergies − Deal Effects','Financing and purchase-accounting effects must not be ignored.',['merger-model','accretion'],2),
  concept('merger-model','Merger Model','ma','Transaction model combining purchase price, financing and pro forma earnings.','','A simplified model should disclose every omitted deal effect.',['sources-uses','pro-forma','financing-mix'],3),
  concept('financing-mix','Financing Mix','ma','Proportion of cash, debt and stock used to fund a transaction.','Cash % + Debt % + Stock % = 100%','The cheapest-looking source may create leverage or dilution risk.',['cash-consideration','stock-consideration','debt-financing'],2),
  concept('cash-consideration','Cash Consideration','ma','Transaction consideration paid in cash.','','Using cash has an opportunity cost even without new interest expense.',['financing-mix','purchase-price']),
  concept('stock-consideration','Stock Consideration','ma','Transaction consideration paid with buyer shares.','New Shares = Stock Value / Buyer Share Price','New shares dilute existing ownership and alter pro forma EPS.',['financing-mix','eps'],2),
  concept('debt-financing','Debt Financing','ma','New borrowing used to fund a transaction.','After-tax Interest = Debt × Rate × (1 − Tax Rate)','Debt financing affects leverage, covenants, cash flow and EPS.',['refinancing','accretion'],2),
  concept('refinancing','Refinancing','ma','Replacing existing debt with new debt or terms.','Interest Savings = Old Interest − New Interest','A lower coupon may come with fees, maturities or covenant trade-offs.',['debt-financing','transaction-fees'],2),
  concept('transaction-fees','Transaction Fees','ma','Banking, legal, accounting and diligence costs of completing a deal.','Total Uses = Purchase Price + Fees + Other Uses','Fees must be funded even when they do not increase purchase price.',['sources-uses','one-time-costs']),
  concept('integration-costs','Integration Costs','ma','Costs required to combine systems, teams and operations.','Payback = Integration Costs / Annual Synergies','Integration costs and synergies often occur on different timelines.',['synergies','one-time-costs'],2),
  concept('one-time-costs','One-Time Costs','ma','Costs expected not to recur in normal operations.','','Calling a repeated cost “one-time” does not make it non-recurring.',['integration-costs','pro-forma'],2),
  concept('ppa','Purchase Price Allocation','ma','Allocation of purchase consideration to identifiable assets and liabilities at fair value.','Goodwill = Consideration − Fair Value of Identifiable Net Assets','PPA can create future depreciation, amortisation and tax effects.',['goodwill','fair-value-adjustment'],3),
  concept('fair-value-adjustment','Fair Value Adjustment','ma','Adjustment from book value to transaction-date fair value.','Adjustment = Fair Value − Book Value','Step-ups can affect later depreciation or amortisation.',['ppa','dtl'],3),
  concept('dtl','Deferred Tax Liability','ma','Future tax obligation arising from temporary book-tax differences.','DTL = Taxable Temporary Difference × Tax Rate','A DTL can alter identifiable net assets and goodwill.',['fair-value-adjustment','goodwill'],3),
  concept('goodwill','Goodwill','ma','Residual consideration after recognising identifiable net assets.','Goodwill = Consideration − Fair Value of Net Assets','Goodwill is not proof of expected value creation.',['ppa','synergies'],2),
  concept('signing-closing','Signing vs Closing','ma','Signing executes the agreement; closing completes legal and financial transfer.','','A signed deal may still fail closing conditions.',['closing-conditions']),
  concept('closing-conditions','Closing Conditions','ma','Requirements that must be satisfied before a transaction closes.','','Regulatory, financing and shareholder approvals may delay or prevent closing.',['signing-closing']),

  concept('inflation-surprise','Inflation Surprise','markets','Difference between reported inflation and market consensus.','Surprise = Actual − Consensus','Markets react to the surprise and expected policy response, not the headline alone.',['bond-yield','duration'],2),
  concept('bond-yield','Bond Yield','markets','Return implied by a bond’s price and cash flows.','','Bond prices and yields generally move in opposite directions.',['duration','inflation-surprise']),
  concept('duration','Duration','markets','Sensitivity of a bond or long-dated cash flow to interest-rate changes.','','Long-duration assets are generally more rate-sensitive.',['bond-yield','dcf'],2),
  concept('credit-spread','Credit Spread','markets','Additional yield over a risk-free benchmark for credit risk.','','Spreads can widen even if risk-free yields fall.',['recession','bond-yield'],2),
  concept('fx-reaction','FX Reaction','markets','Currency response to relative rates, growth, risk and positioning.','','A hawkish surprise can support a currency initially but context matters.',['inflation-surprise']),
  concept('recession','Recession Shock','markets','Broad deterioration in activity, employment and earnings expectations.','','Safe-haven bonds can rise while credit spreads widen.',['credit-spread','soft-landing']),
  concept('soft-landing','Soft Landing','markets','Inflation moderates while growth stays positive.','','It is a scenario, not a guaranteed outcome.',['inflation-surprise','recession']),

  concept('fact-hypothesis','Fact vs Hypothesis','reasoning','Separates observed information from an explanation that still requires evidence.','','Do not present a plausible mechanism as a proven fact.',['causal-chain','uncertainty']),
  concept('causal-chain','Causal Chain','reasoning','Links fact to mechanism, implication and decision.','Fact → Mechanism → Implication → Conclusion','Correlation alone does not establish the mechanism.',['fact-hypothesis','recommendation']),
  concept('uncertainty','Analytical Uncertainty','reasoning','Explicitly identifies assumptions, missing evidence and alternative explanations.','','Uncertainty is not weakness when it is decision-relevant and specific.',['risk-analysis','fact-hypothesis']),
  concept('risk-analysis','Risk Analysis','reasoning','Explains what can go wrong, why it matters and how to test it.','','Naming “debt” or “synergies” is not a complete risk analysis.',['uncertainty','recommendation']),
  concept('recommendation','Analyst Recommendation','writing','Decision-ready conclusion supported by evidence, interpretation and risk.','Evidence → Interpretation → Risk → Conclusion','A recommendation should not be a summary without a decision.',['causal-chain','risk-analysis'],2),
  concept('thesis','Investment Thesis','writing','Concise explanation of why expectations, value and risk may differ from the current view.','','A thesis needs falsifiable risks and evidence, not only a positive story.',['recommendation','bull-bear'],2),
  concept('bull-bear','Bull / Base / Bear Cases','writing','Structured alternative outcomes based on different assumptions.','','Scenarios should change mechanisms and assumptions, not only target prices.',['thesis','sensitivity'],2),
  concept('analyst-note','Analyst Note','writing','Compact record of facts, sources, assumptions and next questions.','','Do not mix facts and conclusions without labels.',['fact-hypothesis','thesis']),
];

const applied = (id, skill, conceptId, prompt, options, correct, explanation, difficulty = 1, misconception = '') => ({
  id, skill, conceptId, prompt, options, correct, explanation, difficulty, misconception, type: difficulty >= 2 ? 'application' : 'interpretation',
});

export const APPLIED_QUESTIONS = [
  applied('aq-01','accounting','ebit','Revenue is €500M, cash operating costs are €360M and D&A is €25M. EBIT equals:', ['€115M','€140M','€165M','€475M'],'€115M','EBIT = €500M − €360M − €25M = €115M.',1,'ebitda-vs-ebit'),
  applied('aq-02','statements','accounts-receivable','AR rises €18M with everything else unchanged. Near-term CFO:', ['Falls €18M','Rises €18M','Does not change','Falls €36M'],'Falls €18M','An AR increase is an operating use of cash.',1,'profit-equals-cash'),
  applied('aq-03','statements','capex','Which statement is most accurate about €40M CapEx?', ['It is an investing cash outflow and affects profit over time through depreciation','It immediately reduces EBITDA €40M','It increases CFO €40M','It never affects profit'],'It is an investing cash outflow and affects profit over time through depreciation','CapEx is capitalised and depreciated over time.',2,'capex-direct-ni'),
  applied('aq-04','corporate','roic','NOPAT is €90M and invested capital is €600M. ROIC equals:', ['15%','6.7%','9%','54%'],'15%','ROIC = €90M / €600M = 15%.',1),
  applied('aq-05','corporate','roiic','A proposed project earns 7% ROIIC against 9% WACC. Best decision:', ['Reject or redesign unless strategic evidence changes the economics','Accept because 7% is positive','Accept if revenue grows','Ignore WACC'],'Reject or redesign unless strategic evidence changes the economics','Incremental return below the cost of capital destroys value, all else equal.',2,'positive-return-is-enough'),
  applied('aq-06','valuation','ev-equity-bridge','EV is €1.4B, debt €300M and cash €100M. Equity Value equals:', ['€1.2B','€1.6B','€1.0B','€1.8B'],'€1.2B','€1.4B − €0.3B + €0.1B = €1.2B.',1,'ev-equals-equity'),
  applied('aq-07','valuation','terminal-value','Terminal Value is calculated at the end of Year 5. What must happen next?', ['Discount it back five years','Add it without discounting','Subtract it from Enterprise Value','Divide it by revenue'],'Discount it back five years','Terminal Value is a Year-5 amount and must be discounted to present value.',2,'undiscounted-tv'),
  applied('aq-08','valuation','wacc','All else equal, WACC rises from 9% to 10%. DCF value should:', ['Fall','Rise','Remain identical','Become equal to book value'],'Fall','A higher discount rate reduces present value.',1),
  applied('aq-09','ma','purchase-price','A buyer offers €25 for 40M target shares. Equity Purchase Price:', ['€1.0B','€625M','€1.25B','€1.6B'],'€1.0B','€25 × 40M shares = €1.0B.',1),
  applied('aq-10','ma','takeover-premium','Offer €20; unaffected price €16. Premium:', ['25%','20%','4%','80%'],'25%','(€20 − €16) / €16 = 25%.',1),
  applied('aq-11','ma','accretion','A transaction is 8% accretive. Strongest conclusion:', ['EPS rises 8%, but value creation still depends on price, financing and synergies','The deal definitely creates value','The target is undervalued','The buyer has no integration risk'],'EPS rises 8%, but value creation still depends on price, financing and synergies','Accretion is an EPS outcome, not proof of value creation.',2,'accretion-equals-value'),
  applied('aq-12','ma','debt-financing','€600M debt at 5% and 25% tax rate creates after-tax interest of:', ['€22.5M','€30M','€7.5M','€120M'],'€22.5M','€600M × 5% × (1 − 25%) = €22.5M.',2),
  applied('aq-13','ma','stock-consideration','€400M stock consideration at €50 per buyer share creates:', ['8M new shares','20M new shares','€8M interest','50M new shares'],'8M new shares','€400M / €50 = 8M new shares.',2),
  applied('aq-14','ma','sources-uses','Purchase price is €1.0B and fees are €40M. Total Uses:', ['€1.04B','€1.00B','€960M','€1.40B'],'€1.04B','Fees must also be funded.',1),
  applied('aq-15','ma','ppa','Consideration €1.0B; fair value identifiable net assets €700M. Goodwill:', ['€300M','€1.7B','€700M','€0M'],'€300M','Goodwill is the residual €1.0B − €700M.',2),
  applied('aq-16','ma','dtl','Fair-value step-up €40M and tax rate 25%. Simplified DTL:', ['€10M','€40M','€30M','€160M'],'€10M','€40M × 25% = €10M.',2),
  applied('aq-17','markets','inflation-surprise','CPI actual is 3.3% versus 2.7% consensus. Initial base-case reaction:', ['Yields up; long-duration equities pressured; currency may strengthen','Yields down; growth equities rally automatically','Every asset rises','No market reaction is possible'],'Yields up; long-duration equities pressured; currency may strengthen','The upside surprise can shift expected policy rates higher.',2),
  applied('aq-18','markets','credit-spread','PMIs collapse and default risk rises. Credit spreads typically:', ['Widen','Tighten to zero','Become negative','Stay fixed'],'Widen','Investors demand more compensation for credit risk.',1),
  applied('aq-19','reasoning','fact-hypothesis','AR increased 30%. Which is strongest?', ['Collections may have slowed, but sales mix and credit terms must also be investigated','Demand definitely increased','Management manipulated earnings','Cash flow definitely rose'],'Collections may have slowed, but sales mix and credit terms must also be investigated','The fact supports several hypotheses, not one proven cause.',2,'claim-as-fact'),
  applied('aq-20','reasoning','risk-analysis','Which is a complete deal risk?', ['Synergy execution may fail because systems overlap less than expected, reducing forecast savings','Synergies','Debt','The share price may move'],'Synergy execution may fail because systems overlap less than expected, reducing forecast savings','A useful risk connects uncertainty, mechanism and implication.',2,'risk-as-label'),
];

const recallQuestions = CONCEPTS.map((item, index, all) => {
  const distractors = all.filter((candidate) => candidate.skill === item.skill && candidate.id !== item.id).slice(0, 3);
  while (distractors.length < 3) distractors.push(all[(index + distractors.length + 7) % all.length]);
  return {
    id: `rq-${item.id}`,
    skill: item.skill,
    conceptId: item.id,
    prompt: `Which description best matches ${item.name}?`,
    options: [item.definition, ...distractors.map((candidate) => candidate.definition)],
    correct: item.definition,
    explanation: `${item.name}: ${item.definition}${item.formula ? ` Formula: ${item.formula}.` : ''}`,
    difficulty: item.difficulty,
    misconception: item.mistake,
    type: 'recall',
  };
});

export const PRACTICE_QUESTIONS = [...recallQuestions, ...APPLIED_QUESTIONS];

export const DIAGNOSTIC_IDS = ['aq-01','aq-02','aq-03','aq-04','aq-05','aq-06','aq-07','aq-08','aq-09','aq-10','aq-11','aq-12','aq-17','aq-18','aq-19','aq-20'];

const field = (id, label, type, expected, conceptId, options = [], tolerance = 0.5, guidance = '') => ({ id, label, type, expected, conceptId, options, tolerance, guidance });

export const ASSIGNMENTS = [
  {
    id:'FS-008', title:'Aster Working Capital Diagnosis', type:'Case', area:'Financial Statements', skill:'statements', difficulty:'Foundation+', duration:18,
    description:'Explain why reported profit improved while operating cash flow weakened.', prerequisites:[['accounting',45]],
    facts:[['Revenue','€420M → €500M'],['Net Income','€31M → €44M'],['Accounts Receivable','€58M → €96M'],['Inventory','€62M → €83M'],['Accounts Payable','€49M → €61M']],
    deliverables:[
      field('cashImpact','Net cash-flow impact of ΔAR + ΔInventory − ΔAP (€M)','number',-47,'working-capital',[],1,'AR and inventory use cash; AP preserves cash.'),
      field('diagnosis','Primary diagnosis','select','working-capital','working-capital',['working-capital','financing','revenue-decline']),
      field('reasoning','Explain two plausible mechanisms and one diligence question','text',['receiv','collection','inventory','cash','credit','demand'],'fact-hypothesis',[],0,'Separate observed facts from hypotheses.'),
    ],
  },
  {
    id:'CF-011', title:'Northstar Capital Allocation', type:'Case', area:'Corporate Finance', skill:'corporate', difficulty:'Foundation+', duration:16,
    description:'Assess existing value creation and a proposed incremental investment.', prerequisites:[['statements',45]],
    facts:[['NOPAT','€90M'],['Invested Capital','€600M'],['WACC','9%'],['Proposed Project ROIIC','7%']],
    deliverables:[
      field('roic','ROIC (%)','number',15,'roic',[],0.5),
      field('spread','ROIC spread (percentage points)','number',6,'roic',[],0.5),
      field('decision','Proposed project decision','select','reject','roiic',['accept','reject','ignore']),
      field('reasoning','Explain why the company and project require different conclusions','text',['roic','wacc','roiic','value','project'],'causal-chain'),
    ],
  },
  {
    id:'VAL-014', title:'Helios Software Valuation', type:'Case', area:'Valuation', skill:'valuation', difficulty:'Analyst I', duration:24,
    description:'Select a defensible peer multiple, value Helios and bridge to shareholder value.', prerequisites:[['corporate',48]],
    facts:[['Helios EBITDA','€200M'],['Debt','€400M'],['Cash','€100M'],['Offer','€1.25B Equity Value'],['Peer EV/EBITDA','6.8× · 7.6× · 8.0× · 8.2× · 14.9×']],
    deliverables:[
      field('multiple','Selected EV/EBITDA multiple','number',8,'comps',[],0.3,'Treat 14.9× as a likely outlier.'),
      field('ev','Implied Enterprise Value (€B)','number',1.6,'enterprise-value',[],0.03),
      field('equity','Implied Equity Value (€B)','number',1.3,'ev-equity-bridge',[],0.03),
      field('offer','Offer versus implied Equity Value','select','below','equity-value',['below','above','equal']),
      field('reasoning','Defend the selected multiple and interpretation','text',['peer','outlier','multiple','equity','offer'],'recommendation'),
    ],
  },
  {
    id:'VAL-019', title:'Veltrix DCF Review', type:'Model', area:'Valuation', skill:'valuation', difficulty:'Analyst I', duration:32,
    description:'Build and audit a five-year intrinsic valuation with sensitivity analysis.', prerequisites:[['valuation',52],['corporate',48]], route:'models', model:'dcf',
    facts:[['Revenue Y0','€520M'],['EBITDA Margin','24%'],['Growth Y1','11%'],['WACC','9.5%'],['Terminal Growth','3.0%']], deliverables:[],
  },
  {
    id:'MM-023', title:'Vertex Technologies Acquisition', type:'Case', area:'M&A', skill:'ma', difficulty:'Analyst I', duration:36,
    description:'Build the complete transaction analysis before recommending further diligence.', prerequisites:[['valuation',55]],
    facts:[['Unaffected Share Price','€16'],['Offer Price','€20'],['Target Shares','50M'],['Target EBITDA','€180M'],['Selected Multiple','7.0×'],['Target Debt / Cash','€300M / €100M'],['Buyer NI / Shares','€600M / 200M'],['Target NI','€120M'],['Synergies','€40M'],['Funding','€400M cash + €600M debt']],
    deliverables:[
      field('price','Equity Purchase Price (€B)','number',1,'purchase-price',[],0.02),
      field('premium','Takeover Premium (%)','number',25,'takeover-premium',[],0.5),
      field('equity','Comps-implied Equity Value (€B)','number',1.06,'ev-equity-bridge',[],0.03),
      field('sources','Total Sources / Uses (€B)','number',1,'sources-uses',[],0.02),
      field('accretion','Simplified Accretion (%)','number',26.67,'accretion',[],0.7),
      field('risks','Explain synergy execution and financing risk','text',['synerg','integration','debt','interest','cash flow'],'risk-analysis'),
      field('recommendation','Recommendation: evidence → interpretation → risk → conclusion','text',['premium','equity','accretion','synerg','debt','diligence'],'recommendation'),
    ],
  },
  {
    id:'MM-028', title:'Crestview Deal Financing', type:'Model', area:'M&A', skill:'ma', difficulty:'Analyst I+', duration:34,
    description:'Compare cash, debt and stock funding and calculate financing-adjusted accretion.', prerequisites:[['ma',48],['corporate',50]], route:'models', model:'merger',
    facts:[['Purchase Price','€1.2B'],['Buyer Share Price','€50'],['Buyer NI / Shares','€500M / 150M'],['Target NI','€95M'],['Synergies','€35M'],['Interest Rate','5.5%']], deliverables:[],
  },
  {
    id:'RES-006', title:'Atlas Payments Research Brief', type:'Research Brief', area:'Equity Research', skill:'writing', difficulty:'Analyst I', duration:30,
    description:'Turn a three-year company packet into an evidence-based bull/base/bear research brief.', prerequisites:[['reasoning',48]], route:'research', packet:'atlas',
    facts:[['Revenue','€410M → €482M → €561M'],['EBITDA Margin','18% → 20% → 22%'],['FCF','€31M → €38M → €34M'],['Customer Retention','94% → 92% → 89%'],['EV/EBITDA','15.2× versus peers 11.8×']], deliverables:[],
  },
  {
    id:'MKT-012', title:'Meridian Macro Surprise', type:'Market Scenario', area:'Markets', skill:'markets', difficulty:'Analyst I', duration:18,
    description:'Interpret an inflation surprise and defend a cross-asset reaction map.', prerequisites:[['reasoning',45]], route:'markets', scenario:'hawkish-cpi',
    facts:[['Previous CPI','2.9%'],['Consensus','2.7%'],['Actual','3.3%']], deliverables:[],
  },
  {
    id:'MM-031', title:'Advanced Transaction Committee', type:'Checkpoint', area:'M&A', skill:'ma', difficulty:'Analyst II', duration:45,
    description:'Combine valuation, financing, fees, integration costs and purchase accounting in one committee recommendation.', prerequisites:[['ma',67],['valuation',67],['reasoning',62],['writing',58]],
    facts:[['Equity Purchase Price','€1.5B'],['Debt Refinance','€250M'],['Fees','€45M'],['Integration Costs','€90M'],['Annual Synergies','€55M'],['Debt Funding','€900M'],['Stock Funding','€500M'],['Cash Funding','€395M']],
    deliverables:[
      field('uses','Total Uses (€B)','number',1.795,'sources-uses',[],0.03),
      field('interest','After-tax interest on €900M at 6%, 25% tax (€M)','number',40.5,'debt-financing',[],0.7),
      field('payback','Integration-cost payback (years)','number',1.64,'integration-costs',[],0.1),
      field('risks','Committee risk analysis','text',['financing','integration','synerg','fee','leverage','accounting'],'risk-analysis'),
      field('recommendation','Final committee recommendation','text',['value','price','financing','risk','diligence','conclusion'],'recommendation'),
    ],
  },
];

export const CURRICULUM = [
  { id:'foundation-accounting', title:'Accounting Fundamentals', track:'Foundation', skill:'accounting', target:58, prerequisites:[], nodes:['learn','practice','checkpoint'] },
  { id:'statement-linkage', title:'Financial Statement Linkage', track:'Foundation', skill:'statements', target:60, prerequisites:[['accounting',50]], nodes:['learn','formula','practice','case','checkpoint'] },
  { id:'capital-allocation', title:'Capital Allocation', track:'Foundation', skill:'corporate', target:62, prerequisites:[['statements',50]], nodes:['learn','practice','case','review'] },
  { id:'valuation-core', title:'Valuation Fundamentals', track:'Analyst Core', skill:'valuation', target:65, prerequisites:[['statements',55],['corporate',52]], nodes:['learn','formula','practice','case','checkpoint'] },
  { id:'dcf-modeling', title:'DCF Modeling', track:'Analyst Core', skill:'valuation', target:72, prerequisites:[['valuation',60]], nodes:['learn','model','review','checkpoint'] },
  { id:'ma-fundamentals', title:'M&A Fundamentals', track:'Transactions', skill:'ma', target:65, prerequisites:[['valuation',58]], nodes:['learn','formula','practice','case','review'] },
  { id:'deal-modeling', title:'Deal Financing & Merger Modeling', track:'Transactions', skill:'ma', target:74, prerequisites:[['ma',62],['corporate',58]], nodes:['model','case','checkpoint'] },
  { id:'market-reasoning', title:'Macro Market Reasoning', track:'Markets', skill:'markets', target:65, prerequisites:[['reasoning',48]], nodes:['learn','scenario','review'] },
  { id:'analyst-communication', title:'Analyst Research & Writing', track:'Cross-skill', skill:'writing', target:68, prerequisites:[['reasoning',52]], nodes:['learn','research','review','checkpoint'] },
];

export const MARKET_SCENARIOS = [
  { id:'hawkish-cpi', title:'Meridian Inflation Re-acceleration', tag:'Inflation', previous:'2.9%', consensus:'2.7%', actual:'3.3%', surprise:'Upside inflation surprise', correct:'hawkish', prompt:'Map the initial reaction across government bonds, long-duration equities, credit and EUR.', keywords:['yield','duration','discount','eur','inflation','spread'], explanation:'Higher expected policy rates lift yields, pressure long-duration cash flows and can support EUR initially.' },
  { id:'dovish-rate', title:'Aurelia Dovish Rate Cut', tag:'Central Bank', previous:'4.00%', consensus:'3.75%', actual:'3.50%', surprise:'Larger-than-expected cut', correct:'dovish', prompt:'Distinguish supportive discount-rate effects from a possible negative growth signal.', keywords:['yield','equity','growth','currency','signal','credit'], explanation:'A surprise cut lowers discount rates, but the interpretation depends on whether policy is easing proactively or responding to deterioration.' },
  { id:'recession-pmi', title:'Orion Growth Break', tag:'Growth', previous:'50.4', consensus:'49.8', actual:'44.6', surprise:'Sharp downside growth surprise', correct:'recession', prompt:'Explain the likely reaction in sovereign bonds, cyclicals and credit spreads.', keywords:['safe','earnings','spread','default','cyclical','growth'], explanation:'A negative growth shock supports safer duration, hurts earnings-sensitive equities and widens credit spreads.' },
  { id:'soft-landing', title:'Atlas Soft Landing', tag:'Balanced Recovery', previous:'3.0%', consensus:'2.8%', actual:'2.6%', surprise:'Inflation down while activity remains positive', correct:'soft', prompt:'Explain why equities, bonds and credit can all perform without assuming a risk-free outcome.', keywords:['earnings','inflation','yield','spread','risk','growth'], explanation:'Lower inflation with resilient growth can support risk assets and modest bond gains.' },
  { id:'oil-shock', title:'Helios Energy Supply Shock', tag:'Commodity', previous:'$81', consensus:'$82', actual:'$103', surprise:'Large oil-price shock', correct:'oil', prompt:'Map the tension between inflation, consumer demand, energy equities and credit.', keywords:['inflation','consumer','margin','energy','yield','growth'], explanation:'Higher oil can support producers while pressuring consumers, margins and inflation expectations.' },
  { id:'credit-event', title:'Crestview Credit Warning', tag:'Credit', previous:'2.8× leverage', consensus:'3.0×', actual:'4.6×', surprise:'Leverage and guidance deterioration', correct:'credit', prompt:'Explain the reaction in bonds, equity and peer credit spreads.', keywords:['spread','default','leverage','equity','peer','refinancing'], explanation:'Unexpected leverage and weaker guidance raise refinancing and default risk, widening spreads and pressuring equity.' },
];

export const RESEARCH_PACKETS = {
  atlas:{
    id:'atlas', company:'Atlas Payments', ticker:'ATP', sector:'Payments Infrastructure',
    metrics:[['2024 Revenue','€410M'],['2025 Revenue','€482M'],['2026 Revenue','€561M'],['EBITDA Margin','18% → 20% → 22%'],['FCF','€31M → €38M → €34M'],['Retention','94% → 92% → 89%'],['EV/EBITDA','15.2×'],['Peer Median','11.8×']],
    sources:['Income statement extract','Cash-flow bridge','Customer KPI schedule','Peer valuation table'],
  },
  aerion:{
    id:'aerion', company:'Aerion Components', ticker:'AER', sector:'Industrial Technology',
    metrics:[['2024 Revenue','€690M'],['2025 Revenue','€721M'],['2026 Revenue','€748M'],['EBITDA Margin','16% → 15% → 13%'],['FCF','€52M → €43M → €28M'],['Backlog','€410M → €456M → €502M'],['Net Debt/EBITDA','1.6×'],['Peer EV/EBITDA','8.4× versus 9.1×']],
    sources:['Three-year financials','Backlog quality note','Working-capital schedule','Peer table'],
  },
};
