// ── Utility functions ──────────────────────────────────────────
const fmt = (n, dec = 0) => isNaN(n) ? '0' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtCur = (n) => '₹' + fmt(n, 2);
const fmtCurShort = (n) => {
  if (n >= 1e7) return '₹' + fmt(n / 1e7, 2) + ' Cr';
  if (n >= 1e5) return '₹' + fmt(n / 1e5, 2) + ' L';
  return '₹' + fmt(n, 0);
};

function val(id) { return parseFloat(document.getElementById(id)?.value) || 0; }
function getEl(id) { return document.getElementById(id); }
function setText(id, text) { const el = getEl(id); if (el) el.textContent = text; }

function showResult(cardId) {
  const box = document.querySelector(`#${cardId} .result-box`);
  if (box) { box.classList.add('show'); }
}
function animateBar(el, pct) {
  if (!el) return;
  el.style.width = '0%';
  setTimeout(() => { el.style.width = Math.min(100, pct) + '%'; }, 50);
}

// ── EMI Core ──────────────────────────────────────────────────
function calcEMI(P, annualRate, months) {
  if (annualRate === 0) return P / months;
  const r = annualRate / 12 / 100;
  return P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

// ── 1. EMI Calculator ────────────────────────────────────────
function calcEMICalc() {
  const P = val('emi_amount'), r = val('emi_rate'), n = val('emi_tenure');
  const months = n * 12;
  const emi = calcEMI(P, r, months);
  const total = emi * months;
  const interest = total - P;
  setText('emi_result', '₹' + fmt(emi, 0));
  setText('emi_total', fmtCurShort(total));
  setText('emi_interest', fmtCurShort(interest));
  setText('emi_principal', fmtCurShort(P));
  animateBar(getEl('emi_pbar'), (P / total) * 100);
  animateBar(getEl('emi_ibar'), (interest / total) * 100);
  showResult('card_emi');
}

// ── 2-7. Loan Calculators (shared logic, different params) ────
function calcLoan(cardId, pfx) {
  const P = val(pfx+'_amount'), r = val(pfx+'_rate'), n = val(pfx+'_tenure');
  const months = n * 12;
  const emi = calcEMI(P, r, months);
  const total = emi * months;
  const interest = total - P;
  setText(pfx+'_result', '₹' + fmt(emi, 0));
  setText(pfx+'_total', fmtCurShort(total));
  setText(pfx+'_interest', fmtCurShort(interest));
  setText(pfx+'_principal', fmtCurShort(P));
  animateBar(getEl(pfx+'_pbar'), (P / total) * 100);
  animateBar(getEl(pfx+'_ibar'), (interest / total) * 100);
  showResult('card_'+cardId);
}

// ── 8. Simple Interest ───────────────────────────────────────
function calcSI() {
  const P = val('si_principal'), R = val('si_rate'), T = val('si_time');
  const si = (P * R * T) / 100;
  const total = P + si;
  setText('si_result', fmtCurShort(si));
  setText('si_total', fmtCurShort(total));
  setText('si_principal_show', fmtCurShort(P));
  showResult('card_si');
}

// ── 9. Compound Interest ─────────────────────────────────────
function calcCI() {
  const P = val('ci_principal'), R = val('ci_rate'), T = val('ci_time');
  const n = parseInt(getEl('ci_freq')?.value || 1);
  const A = P * Math.pow(1 + R / (100 * n), n * T);
  const ci = A - P;
  setText('ci_result', fmtCurShort(ci));
  setText('ci_total', fmtCurShort(A));
  setText('ci_principal_show', fmtCurShort(P));
  animateBar(getEl('ci_pbar'), (P / A) * 100);
  animateBar(getEl('ci_ibar'), (ci / A) * 100);
  showResult('card_ci');
}

// ── 10. SIP Calculator ───────────────────────────────────────
function calcSIP() {
  const M = val('sip_monthly'), R = val('sip_rate'), T = val('sip_tenure');
  const r = R / 12 / 100;
  const n = T * 12;
  const FV = M * (Math.pow(1 + r, n) - 1) / r * (1 + r);
  const invested = M * n;
  const returns = FV - invested;
  setText('sip_result', fmtCurShort(FV));
  setText('sip_invested', fmtCurShort(invested));
  setText('sip_returns', fmtCurShort(returns));
  animateBar(getEl('sip_ibar'), (invested / FV) * 100);
  animateBar(getEl('sip_rbar'), (returns / FV) * 100);
  showResult('card_sip');
}

// ── 11. FD Calculator ────────────────────────────────────────
function calcFD() {
  const P = val('fd_amount'), R = val('fd_rate'), T = val('fd_tenure');
  const n = parseInt(getEl('fd_freq')?.value || 4);
  const A = P * Math.pow(1 + R / (100 * n), n * T);
  const interest = A - P;
  setText('fd_result', fmtCurShort(A));
  setText('fd_interest', fmtCurShort(interest));
  setText('fd_principal_show', fmtCurShort(P));
  showResult('card_fd');
}

// ── 12. RD Calculator ────────────────────────────────────────
function calcRD() {
  const M = val('rd_monthly'), R = val('rd_rate'), T = val('rd_tenure');
  const n = T * 12;
  const r = R / 4 / 100;
  let A = 0;
  for (let i = 1; i <= n; i++) {
    A += M * Math.pow(1 + r, (n - i + 1) / 3);
  }
  const invested = M * n;
  const interest = A - invested;
  setText('rd_result', fmtCurShort(A));
  setText('rd_interest', fmtCurShort(interest));
  setText('rd_invested', fmtCurShort(invested));
  showResult('card_rd');
}

// ── 13. GST Calculator ───────────────────────────────────────
function calcGST() {
  const amount = val('gst_amount'), rate = val('gst_rate');
  const mode = getEl('gst_mode')?.value || 'add';
  let base, gst, total;
  if (mode === 'add') {
    base = amount; gst = amount * rate / 100; total = base + gst;
  } else {
    total = amount; base = amount * 100 / (100 + rate); gst = total - base;
  }
  const cgst = gst / 2, sgst = gst / 2;
  setText('gst_result', fmtCurShort(gst));
  setText('gst_base', fmtCurShort(base));
  setText('gst_total', fmtCurShort(total));
  setText('gst_cgst', fmtCurShort(cgst));
  setText('gst_sgst', fmtCurShort(sgst));
  showResult('card_gst');
}

// ── 14. Currency Converter ───────────────────────────────────
async function calcCurrency() {
  const amount = val('cur_amount');
  const from = getEl('cur_from')?.value || 'USD';
  const to = getEl('cur_to')?.value || 'INR';
  const btn = getEl('cur_btn');
  btn.textContent = 'Converting...';
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    const data = await res.json();
    const rate = data.rates[to] || 1;
    const result = amount * rate;
    setText('cur_result', fmt(result, 2));
    setText('cur_rate', `1 ${from} = ${fmt(rate, 4)} ${to}`);
    showResult('card_currency');
  } catch(e) {
    // Fallback to static rates
    const staticRates = { USD: { INR: 83.5, EUR: 0.92, GBP: 0.79, JPY: 149.5 }, EUR: { INR: 90.8, USD: 1.08 }, GBP: { INR: 105.5, USD: 1.26 } };
    const rate = staticRates[from]?.[to] || 1;
    const result = amount * rate;
    setText('cur_result', fmt(result, 2));
    setText('cur_rate', `1 ${from} ≈ ${fmt(rate, 4)} ${to} (approx)`);
    showResult('card_currency');
  }
  btn.textContent = 'Convert';
}

// ── 15. Salary Calculator ────────────────────────────────────
function calcSalary() {
  const ctc = val('sal_ctc');
  const basic = ctc * 0.4;
  const hra = basic * 0.5;
  const special = ctc * 0.2;
  const da = basic * 0.1;
  const pf = basic * 0.12;
  const professional_tax = 2400;
  const gross = basic + hra + special + da;
  const tds = calcIncomeTax(ctc) / 12;
  const inhand = gross - pf - professional_tax / 12 - tds;
  setText('sal_result', '₹' + fmt(inhand, 0));
  setText('sal_gross', fmtCurShort(gross));
  setText('sal_basic', fmtCurShort(basic));
  setText('sal_pf', fmtCurShort(pf));
  setText('sal_tds', fmtCurShort(tds));
  showResult('card_salary');
}

function calcIncomeTax(income) {
  let tax = 0;
  if (income > 1500000) tax += (income - 1500000) * 0.30;
  if (income > 1200000) tax += Math.min(income - 1200000, 300000) * 0.20;
  if (income > 1000000) tax += Math.min(income - 1000000, 200000) * 0.15;
  if (income > 750000) tax += Math.min(income - 750000, 250000) * 0.10;
  if (income > 500000) tax += Math.min(income - 500000, 250000) * 0.05;
  return tax;
}

// ── 16. PF Calculator ────────────────────────────────────────
function calcPF() {
  const basic = val('pf_basic'), years = val('pf_years');
  const empContrib = basic * 0.12;
  const erContrib = basic * 0.12;
  const monthly = empContrib + erContrib;
  const rate = 8.15 / 100;
  let corpus = 0;
  for (let i = 0; i < years * 12; i++) {
    corpus = (corpus + monthly) * (1 + rate / 12);
  }
  const invested = monthly * years * 12;
  const interest = corpus - invested;
  setText('pf_result', fmtCurShort(corpus));
  setText('pf_monthly', fmtCurShort(monthly));
  setText('pf_invested', fmtCurShort(invested));
  setText('pf_interest', fmtCurShort(interest));
  showResult('card_pf');
}

// ── 17. Gratuity Calculator ──────────────────────────────────
function calcGratuity() {
  const basic = val('grat_basic'), years = val('grat_years');
  const gratuity = (basic * 15 * years) / 26;
  setText('grat_result', fmtCurShort(gratuity));
  setText('grat_years_show', years + ' years');
  setText('grat_basic_show', fmtCurShort(basic));
  showResult('card_gratuity');
}

// ── 18. Tax Calculator ───────────────────────────────────────
function calcTax() {
  const income = val('tax_income');
  const regime = getEl('tax_regime')?.value || 'new';
  let tax = 0;
  if (regime === 'new') {
    if (income > 1500000) tax += (income - 1500000) * 0.30;
    if (income > 1200000) tax += Math.min(income - 1200000, 300000) * 0.20;
    if (income > 1000000) tax += Math.min(income - 1000000, 200000) * 0.15;
    if (income > 750000) tax += Math.min(income - 750000, 250000) * 0.10;
    if (income > 500000) tax += Math.min(income - 500000, 250000) * 0.05;
  } else {
    const deduction = 150000; const std = 50000;
    const taxable = Math.max(0, income - deduction - std);
    if (taxable > 1000000) tax += (taxable - 1000000) * 0.30;
    if (taxable > 500000) tax += Math.min(taxable - 500000, 500000) * 0.20;
    if (taxable > 250000) tax += Math.min(taxable - 250000, 250000) * 0.05;
  }
  const cess = tax * 0.04;
  const totalTax = tax + cess;
  const effectiveRate = income > 0 ? (totalTax / income * 100) : 0;
  setText('tax_result', fmtCurShort(totalTax));
  setText('tax_base', fmtCurShort(tax));
  setText('tax_cess', fmtCurShort(cess));
  setText('tax_effective', effectiveRate.toFixed(2) + '%');
  showResult('card_tax');
}

// ── 19. Insurance Premium Calculator ────────────────────────
function calcInsurance() {
  const type = getEl('ins_type')?.value || 'life';
  const age = val('ins_age'), sum = val('ins_sum'), years = val('ins_years');
  let baseRate = 0;
  if (type === 'life') baseRate = 0.001 + (age - 18) * 0.00008;
  else if (type === 'health') baseRate = 0.02 + (age - 18) * 0.001;
  else if (type === 'car') baseRate = 0.025;
  else baseRate = 0.005 + (age - 18) * 0.00015;
  const annual = sum * baseRate;
  const monthly = annual / 12;
  const total = annual * years;
  setText('ins_result', fmtCurShort(annual));
  setText('ins_monthly', fmtCurShort(monthly));
  setText('ins_total', fmtCurShort(total));
  showResult('card_insurance');
}

// ── 20. Retirement Calculator ────────────────────────────────
function calcRetirement() {
  const current = val('ret_age'), retire = val('ret_retire');
  const monthly = val('ret_monthly'), rate = val('ret_rate');
  const years = retire - current;
  const r = rate / 12 / 100;
  const n = years * 12;
  const FV = monthly * (Math.pow(1 + r, n) - 1) / r * (1 + r);
  const invested = monthly * n;
  const growth = FV - invested;
  setText('ret_result', fmtCurShort(FV));
  setText('ret_invested', fmtCurShort(invested));
  setText('ret_growth', fmtCurShort(growth));
  setText('ret_years', years + ' years');
  showResult('card_retirement');
}

// ── 21. Inflation Calculator ─────────────────────────────────
function calcInflation() {
  const amount = val('inf_amount'), rate = val('inf_rate'), years = val('inf_years');
  const futureValue = amount * Math.pow(1 + rate / 100, years);
  const currentEquivalent = amount / Math.pow(1 + rate / 100, years);
  setText('inf_result', fmtCurShort(futureValue));
  setText('inf_current', fmtCurShort(amount));
  setText('inf_loss', fmtCurShort(futureValue - amount));
  showResult('card_inflation');
}

// ── 22. Savings Calculator ───────────────────────────────────
function calcSavings() {
  const initial = val('sav_initial'), monthly = val('sav_monthly');
  const rate = val('sav_rate'), years = val('sav_years');
  const r = rate / 12 / 100;
  const n = years * 12;
  const FVlump = initial * Math.pow(1 + r, n);
  const FVmonthly = monthly * (Math.pow(1 + r, n) - 1) / r;
  const total = FVlump + FVmonthly;
  const invested = initial + monthly * n;
  const returns = total - invested;
  setText('sav_result', fmtCurShort(total));
  setText('sav_invested', fmtCurShort(invested));
  setText('sav_returns', fmtCurShort(returns));
  showResult('card_savings');
}

// ── 23. Mortgage Calculator ──────────────────────────────────
function calcMortgage() {
  const price = val('mort_price'), down = val('mort_down');
  const rate = val('mort_rate'), tenure = val('mort_tenure');
  const P = price - (price * down / 100);
  const months = tenure * 12;
  const emi = calcEMI(P, rate, months);
  const total = emi * months;
  const interest = total - P;
  const downAmt = price * down / 100;
  setText('mort_result', '₹' + fmt(emi, 0));
  setText('mort_loan', fmtCurShort(P));
  setText('mort_down_show', fmtCurShort(downAmt));
  setText('mort_total', fmtCurShort(total));
  setText('mort_interest', fmtCurShort(interest));
  showResult('card_mortgage');
}

// ── 24. Budget Planner ───────────────────────────────────────
function calcBudget() {
  const income = val('bud_income');
  const housing = val('bud_housing'), food = val('bud_food');
  const transport = val('bud_transport'), utilities = val('bud_utilities');
  const entertainment = val('bud_entertainment'), others = val('bud_others');
  const totalExpense = housing + food + transport + utilities + entertainment + others;
  const savings = income - totalExpense;
  const savingsPct = income > 0 ? (savings / income * 100) : 0;
  setText('bud_result', fmtCurShort(savings));
  setText('bud_total_exp', fmtCurShort(totalExpense));
  setText('bud_savings_pct', savingsPct.toFixed(1) + '%');
  const items = [
    ['Housing', housing], ['Food', food], ['Transport', transport],
    ['Utilities', utilities], ['Entertainment', entertainment], ['Others', others]
  ];
  const colors = ['var(--gold)', 'var(--teal)', 'var(--blue)', 'var(--purple)', 'var(--rose)', 'var(--text2)'];
  const container = getEl('bud_bars');
  if (container && totalExpense > 0) {
    container.innerHTML = items.map(([name, amt], i) =>
      amt > 0 ? `<div class="bar-row">
        <div class="bar-name">${name}</div>
        <div class="bar-track"><div class="bar-fill" style="background:${colors[i]};width:0%" data-pct="${(amt/totalExpense*100).toFixed(0)}"></div></div>
        <div class="bar-val">${fmtCurShort(amt)}</div>
      </div>` : ''
    ).join('');
    setTimeout(() => {
      container.querySelectorAll('.bar-fill').forEach(b => {
        b.style.width = b.dataset.pct + '%';
      });
    }, 50);
  }
  showResult('card_budget');
}

// ── 25. Expense Tracker ──────────────────────────────────────
const expenses = [];
function addExpense() {
  const name = getEl('exp_name')?.value?.trim() || '';
  const amount = val('exp_amount');
  const category = getEl('exp_cat')?.value || 'Other';
  if (!name || !amount) return;
  expenses.push({ name, amount, category, date: new Date().toLocaleDateString('en-IN') });
  renderExpenses();
  if (getEl('exp_name')) getEl('exp_name').value = '';
  if (getEl('exp_amount')) getEl('exp_amount').value = '';
}
function removeExpense(i) {
  expenses.splice(i, 1);
  renderExpenses();
}
function renderExpenses() {
  const list = getEl('exp_list');
  const totalEl = getEl('exp_total');
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  if (totalEl) totalEl.textContent = fmtCurShort(total);
  if (!list) return;
  if (expenses.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px;font-size:13px;">No expenses added yet</div>';
    return;
  }
  const cats = { Food: 'var(--teal)', Transport: 'var(--blue)', Shopping: 'var(--gold)', Entertainment: 'var(--purple)', Health: 'var(--rose)', Other: 'var(--text2)' };
  list.innerHTML = expenses.map((e, i) => `
    <div class="bar-row" style="margin-bottom:8px;background:var(--bg3);border-radius:8px;padding:8px 10px;">
      <div style="flex:1">
        <div style="font-size:13px;color:var(--text);font-weight:500">${e.name}</div>
        <div style="font-size:11px;color:${cats[e.category]||'var(--text3)'}">● ${e.category} · ${e.date}</div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text2);margin-right:8px">${fmtCurShort(e.amount)}</div>
      <button onclick="removeExpense(${i})" style="background:rgba(255,107,138,0.15);border:none;color:var(--rose);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px">✕</button>
    </div>
  `).join('');
  showResult('card_expense');
}

// ── Card Toggle ──────────────────────────────────────────────
function toggleCard(id) {
  const card = getEl('card_' + id);
  if (!card) return;
  const isOpen = card.classList.contains('open');
  // Close all
  document.querySelectorAll('.calc-card.open').forEach(c => c.classList.remove('open'));
  if (!isOpen) {
    card.classList.add('open');
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }
}

// ── Search & Filter ─────────────────────────────────────────
function filterCalcs() {
  const query = getEl('searchInput')?.value?.toLowerCase() || '';
  const activeTab = document.querySelector('.cat-tab.active')?.dataset?.cat || 'all';
  const cards = document.querySelectorAll('.calc-card');
  let visible = 0;
  cards.forEach(card => {
    const title = card.querySelector('.card-title')?.textContent?.toLowerCase() || '';
    const desc = card.querySelector('.card-desc')?.textContent?.toLowerCase() || '';
    const cats = card.dataset.categories || '';
    const matchSearch = !query || title.includes(query) || desc.includes(query);
    const matchCat = activeTab === 'all' || cats.includes(activeTab);
    const show = matchSearch && matchCat;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  const noRes = getEl('noResults');
  if (noRes) noRes.style.display = visible === 0 ? '' : 'none';
  const countEl = getEl('visibleCount');
  if (countEl) countEl.textContent = visible + ' calculators';
}

function setTab(tab) {
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  const btn = document.querySelector(`.cat-tab[data-cat="${tab}"]`);
  if (btn) btn.classList.add('active');
  filterCalcs();
}

// ── Range slider sync ─────────────────────────────────────────
function syncRange(inputId, displayId) {
  const el = getEl(inputId);
  const disp = getEl(displayId);
  if (el && disp) {
    disp.textContent = el.value;
    el.addEventListener('input', () => disp.textContent = el.value);
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Animate cards in on load
  const cards = document.querySelectorAll('.calc-card');
  cards.forEach((card, i) => {
    card.style.animationDelay = (i * 0.04) + 's';
    card.classList.add('animate-in');
  });

  // Search
  const searchInput = getEl('searchInput');
  if (searchInput) searchInput.addEventListener('input', filterCalcs);

  // Counter animation
  const countEls = document.querySelectorAll('[data-count]');
  countEls.forEach(el => {
    const target = parseInt(el.dataset.count);
    let current = 0;
    const increment = target / 40;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      el.textContent = Math.floor(current) + (el.dataset.suffix || '');
      if (current >= target) clearInterval(timer);
    }, 30);
  });
});

// ══════════════════════════════════════════════════
//  PDF GENERATION SYSTEM — FinCalc Pro
// ══════════════════════════════════════════════════

// Show toast notification
function showToast(msg, duration = 2800) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span style="font-size:18px">✓</span> ${msg}`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.classList.add('hide');
    setTimeout(() => t.remove(), 400);
  }, duration);
}

// Collect result data from a card
function collectResultData(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return null;
  const title = card.querySelector('.card-title')?.textContent || '';
  const desc = card.querySelector('.card-desc')?.textContent || '';
  const resultBox = card.querySelector('.result-box');
  if (!resultBox || !resultBox.classList.contains('show')) return null;

  const resultLabel = resultBox.querySelector('.result-label')?.textContent || '';
  const resultValue = resultBox.querySelector('.result-value')?.textContent || '—';

  // Collect all breakdown items
  const breakdowns = [];
  resultBox.querySelectorAll('.breakdown-item').forEach(item => {
    const label = item.querySelector('.breakdown-label')?.textContent || '';
    const value = item.querySelector('.breakdown-value')?.textContent || '';
    if (label && value && value !== '—') breakdowns.push({ label, value });
  });

  // Collect bar chart data
  const bars = [];
  resultBox.querySelectorAll('.bar-row').forEach(row => {
    const name = row.querySelector('.bar-name')?.textContent || '';
    const fill = row.querySelector('.bar-fill');
    const pct = fill ? parseFloat(fill.style.width) || 0 : 0;
    const valEl = row.querySelector('.bar-val');
    const barVal = valEl ? valEl.textContent : '';
    if (name) bars.push({ name, pct, value: barVal });
  });

  // Collect input values
  const inputs = [];
  card.querySelectorAll('.form-row').forEach(row => {
    const label = row.querySelector('label')?.textContent || '';
    const input = row.querySelector('input');
    const select = row.querySelector('select');
    let value = '';
    if (input) value = input.value;
    else if (select) value = select.options[select.selectedIndex]?.text || '';
    if (label && value) inputs.push({ label, value });
  });

  return { cardId, title, desc, resultLabel, resultValue, breakdowns, bars, inputs };
}

// ══════════════════════════════════════════════════
//  NUMBER → ENGLISH WORDS (Indian system)
//  e.g. 500000 → "Five Lakh"
//       1234567.89 → "Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven and 89/100"
// ══════════════════════════════════════════════════

const _ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
               'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
               'Seventeen', 'Eighteen', 'Nineteen'];
const _tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function _belowHundred(n) {
  if (n < 20) return _ones[n];
  const t = Math.floor(n / 10), o = n % 10;
  return _tens[t] + (o ? '-' + _ones[o] : '');
}

function _belowThousand(n) {
  if (n < 100) return _belowHundred(n);
  const h = Math.floor(n / 100);
  const rem = n % 100;
  return _ones[h] + ' Hundred' + (rem ? ' ' + _belowHundred(rem) : '');
}

// Indian system: Crore, Lakh, Thousand, Hundred
function numberToWords(amount) {
  if (isNaN(amount) || amount === null) return '';
  const isNeg = amount < 0;
  amount = Math.abs(amount);

  // Split integer and decimal
  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100); // paise

  if (intPart === 0 && decPart === 0) return 'Zero';

  let words = '';

  if (intPart > 0) {
    let n = intPart;

    const crore = Math.floor(n / 10000000); n %= 10000000;
    const lakh  = Math.floor(n / 100000);   n %= 100000;
    const thou  = Math.floor(n / 1000);     n %= 1000;
    const rem   = n;

    const parts = [];
    if (crore) parts.push(_belowThousand(crore) + ' Crore');
    if (lakh)  parts.push(_belowThousand(lakh)  + ' Lakh');
    if (thou)  parts.push(_belowThousand(thou)  + ' Thousand');
    if (rem)   parts.push(_belowThousand(rem));

    words = parts.join(' ');
  }

  if (decPart > 0) {
    words += (words ? ' and ' : '') + _belowHundred(decPart) + ' Paise';
  }

  return (isNeg ? 'Minus ' : '') + words;
}

// Detect if a string looks like a currency/number value and parse its raw number
function parseDisplayedAmount(str) {
  if (!str || str === '—') return null;
  // Remove ₹, commas, spaces
  let clean = str.replace(/[₹,\s]/g, '');
  // Handle shorthand: "5.23 L" or "1.20 Cr"
  if (/Cr$/i.test(clean)) return parseFloat(clean) * 1e7;
  if (/L$/i.test(clean))  return parseFloat(clean) * 1e5;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// Format a raw number as: "₹5,00,000  (Integer: 5,00,000 | Words: Five Lakh)"
// Returns object { numericLine, wordsLine } for PDF layout
function dualFormat(rawNum) {
  if (rawNum === null || isNaN(rawNum)) return null;
  const intVal = Math.floor(rawNum);
  const decVal = rawNum - intVal;
  const intStr = intVal.toLocaleString('en-IN');
  const fullStr = decVal > 0.0009
    ? rawNum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : intStr;
  const words = numberToWords(rawNum);
  // Use "Rs." instead of ₹ — jsPDF's helvetica font cannot render the ₹ glyph
  return { numeric: 'Rs. ' + fullStr, words };
}

// Color palette for PDF
const PDF_COLORS = {
  bg: [10, 10, 15],
  card: [18, 18, 30],
  card2: [26, 26, 46],
  gold: [240, 192, 96],
  teal: [0, 212, 170],
  rose: [255, 107, 138],
  purple: [155, 109, 255],
  blue: [77, 121, 255],
  text: [240, 240, 248],
  text2: [160, 160, 192],
  text3: [96, 96, 128],
  border: [255, 255, 255, 0.07],
  white: [255, 255, 255],
};

// Generate a beautiful PDF using canvas → data URL technique (no external lib needed)
async function generatePDF(data) {
  // We'll build an HTML page and print it as PDF via a hidden iframe
  // But for best result, use canvas + jsPDF from CDN

  // Load jsPDF dynamically
  if (!window.jspdf) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, H = 297;
  const pad = 18;
  const FOOTER_H = 22;       // reserved at bottom for footer
  const SAFE_BOTTOM = H - FOOTER_H - 8;

  // Helper: start a new page if y would overflow, redrawing bg + returning new y
  function checkPage(currentY, neededH = 10) {
    if (currentY + neededH > SAFE_BOTTOM) {
      doc.addPage();
      // Re-fill background on new page
      doc.setFillColor(10, 10, 15);
      doc.rect(0, 0, W, H, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
      drawFooter(); // footer on every page
      return pad;   // reset y to top margin
    }
    return currentY;
  }

  // Draw page footer (called on every page)
  function drawFooter() {
    const fy = H - FOOTER_H;
    doc.setFillColor(18, 18, 30);
    doc.rect(0, fy, W, FOOTER_H + 2, 'F');
    doc.setDrawColor(60, 60, 90);
    doc.setLineWidth(0.3);
    doc.line(pad, fy, W - pad, fy);
    doc.setTextColor(96, 96, 128);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text('Generated by FinCalc Pro', pad, fy + 9);
    doc.text('For informational purposes only. Not financial advice.', W - pad, fy + 9, { align: 'right' });
  }

  // ── Background ──
  doc.setFillColor(10, 10, 15);
  doc.rect(0, 0, W, H, 'F');

  // ── Decorative gradient circles (simulate) ──
  doc.setFillColor(77, 121, 255);
  doc.setGState(new doc.GState({ opacity: 0.05 }));
  doc.circle(40, 40, 60, 'F');

  doc.setFillColor(0, 212, 170);
  doc.setGState(new doc.GState({ opacity: 0.04 }));
  doc.circle(180, 260, 50, 'F');

  doc.setGState(new doc.GState({ opacity: 1 }));

  // ── Header bar ──
  doc.setFillColor(18, 18, 30);
  doc.roundedRect(pad, 12, W - pad*2, 22, 4, 4, 'F');

  // Logo circle
  doc.setFillColor(240, 192, 96);
  doc.circle(pad + 10, 23, 6, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('Rs', pad + 7, 25.5);

  // Brand name
  doc.setTextColor(240, 240, 248);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('FinCalc Pro', pad + 19, 25);

  // Date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setTextColor(96, 96, 128);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(dateStr, W - pad - 2, 25, { align: 'right' });

  // Draw footer on page 1
  drawFooter();

  // ── Title section ──
  let y = 46;

  // Card icon background
  doc.setFillColor(26, 26, 46);
  doc.roundedRect(pad, y - 2, W - pad*2, 30, 4, 4, 'F');

  // Accent left bar
  doc.setFillColor(...PDF_COLORS.gold);
  doc.rect(pad, y - 2, 3, 30, 'F');

  doc.setTextColor(...PDF_COLORS.gold);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(data.title, pad + 8, y + 8);

  doc.setTextColor(...PDF_COLORS.text2);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(data.desc, pad + 8, y + 17);

  // ── Inputs section ──
  if (data.inputs.length > 0) {
    y += 38;
    y = checkPage(y, 20);
    doc.setTextColor(...PDF_COLORS.text3);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('INPUT PARAMETERS', pad, y);

    y += 5;
    const colW = (W - pad*2 - 8) / 2;
    let col = 0, rowY = y;

    data.inputs.forEach((inp, idx) => {
      rowY = checkPage(rowY, 16);
      const cx = pad + col * (colW + 8);
      doc.setFillColor(20, 20, 37);
      doc.roundedRect(cx, rowY, colW, 13, 2, 2, 'F');

      doc.setTextColor(...PDF_COLORS.text3);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(inp.label.toUpperCase(), cx + 5, rowY + 5.5);

      doc.setTextColor(...PDF_COLORS.text);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      const valText = inp.value.length > 22 ? inp.value.substring(0, 22) + '...' : inp.value;
      doc.text(valText, cx + 5, rowY + 11);

      col++;
      if (col === 2) { col = 0; rowY += 16; }
    });
    if (col === 1) rowY += 16;
    y = rowY + 4;
  }

  // ── Main Result ──
  y += 2;
  const mainRawNum = parseDisplayedAmount(data.resultValue);
  const mainDual = mainRawNum !== null ? dualFormat(mainRawNum) : null;
  const resultBoxH = mainDual ? 52 : 38;

  y = checkPage(y, resultBoxH + 4);

  // Background
  doc.setFillColor(0, 42, 34);
  doc.roundedRect(pad, y, W - pad*2, resultBoxH, 5, 5, 'F');
  doc.setFillColor(0, 212, 170);
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.roundedRect(pad, y, (W - pad*2) * 0.5, resultBoxH, 5, 5, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Border
  doc.setDrawColor(0, 212, 170);
  doc.setLineWidth(0.4);
  doc.roundedRect(pad, y, W - pad*2, resultBoxH, 5, 5, 'S');

  // Decorative circle
  doc.setFillColor(...PDF_COLORS.teal);
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.circle(W - pad - 15, y + resultBoxH/2, 20, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Label
  doc.setTextColor(...PDF_COLORS.text3);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.text(data.resultLabel.toUpperCase(), pad + 8, y + 10);

  if (mainDual) {
    // Line 1: numeric (Rs. 5,00,000)
    doc.setTextColor(...PDF_COLORS.teal);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text(mainDual.numeric, pad + 8, y + 27);

    // Divider line
    doc.setDrawColor(0, 212, 170);
    doc.setGState(new doc.GState({ opacity: 0.2 }));
    doc.setLineWidth(0.3);
    doc.line(pad + 8, y + 31, W - pad - 8, y + 31);
    doc.setGState(new doc.GState({ opacity: 1 }));

    // Line 2: English words (Five Lakh)
    doc.setTextColor(200, 230, 220);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'italic');
    const wordsDisplay = mainDual.words.length > 60
      ? mainDual.words.substring(0, 60) + '...'
      : mainDual.words;
    doc.text(wordsDisplay, pad + 8, y + 43);
  } else {
    doc.setTextColor(...PDF_COLORS.teal);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text(data.resultValue, pad + 8, y + 27);
  }

  y += resultBoxH + 10;

  // ── Breakdown grid (with dual numeric + words) ──
  if (data.breakdowns.length > 0) {
    y = checkPage(y, 20);
    doc.setTextColor(...PDF_COLORS.text3);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('DETAILED BREAKDOWN', pad, y);
    y += 5;

    const bColW = (W - pad*2 - 6) / 2;
    const cols = 2;
    const rowH = 26;

    data.breakdowns.forEach((bd, i) => {
      if (i % cols === 0) { y = checkPage(y, rowH); }
      const col = i % cols;
      const bx = pad + col * (bColW + 6);
      const by = y;

      doc.setFillColor(20, 20, 37);
      doc.roundedRect(bx, by, bColW, rowH - 2, 3, 3, 'F');

      doc.setTextColor(...PDF_COLORS.text3);
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
      doc.text(bd.label.toUpperCase(), bx + 5, by + 6);

      const rawN = parseDisplayedAmount(bd.value);
      const dual = rawN !== null ? dualFormat(rawN) : null;

      if (dual) {
        doc.setTextColor(...PDF_COLORS.text2);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        const numStr = dual.numeric.length > 22 ? dual.numeric.substring(0, 22) + '...' : dual.numeric;
        doc.text(numStr, bx + 5, by + 13);

        doc.setTextColor(...PDF_COLORS.text3);
        doc.setFontSize(6.5); doc.setFont('helvetica', 'italic');
        const wStr = dual.words.length > 30 ? dual.words.substring(0, 30) + '...' : dual.words;
        doc.text(wStr, bx + 5, by + 20);
      } else {
        doc.setTextColor(...PDF_COLORS.text2);
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        const bVal = bd.value.length > 22 ? bd.value.substring(0, 22) + '...' : bd.value;
        doc.text(bVal, bx + 5, by + 15);
      }

      // Advance y only after completing a full row (right column) or last item
      if (col === 1 || i === data.breakdowns.length - 1) {
        y += rowH;
      }
    });
    y += 8;
  }

  // ── Bar chart ──
  if (data.bars.length > 0) {
    y = checkPage(y, data.bars.length * 14 + 16);
    doc.setTextColor(...PDF_COLORS.text3);
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUTION CHART', pad, y);
    y += 6;

    const barColors = [[240,192,96],[0,212,170],[77,121,255],[255,107,138],[155,109,255]];
    const maxBarW = W - pad*2 - 55 - 20;

    data.bars.forEach((bar, i) => {
      const c = barColors[i % barColors.length];
      const bw = (bar.pct / 100) * maxBarW;
      const by2 = y + i * 14;

      doc.setTextColor(...PDF_COLORS.text2);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(bar.name, pad, by2 + 5);

      doc.setFillColor(30, 30, 50);
      doc.roundedRect(pad + 55, by2, maxBarW, 7, 1, 1, 'F');

      if (bw > 0) {
        doc.setFillColor(...c);
        doc.roundedRect(pad + 55, by2, Math.max(bw, 2), 7, 1, 1, 'F');
      }

      doc.setTextColor(...PDF_COLORS.text3);
      doc.setFontSize(7.5);
      doc.text(bar.pct.toFixed(0) + '%', pad + 55 + maxBarW + 4, by2 + 5.5);
    });
    y += data.bars.length * 14 + 6;
  }

  // ── Watermark (on current/last page) ──
  doc.setTextColor(...PDF_COLORS.gold);
  doc.setGState(new doc.GState({ opacity: 0.03 }));
  doc.setFontSize(55); doc.setFont('helvetica', 'bold');
  doc.text('FINCALC PRO', W/2, H/2, { align: 'center', angle: 45 });
  doc.setGState(new doc.GState({ opacity: 1 }));

  return doc;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Main: download PDF for a given card
async function downloadPDF(cardId, btnEl) {
  const data = collectResultData(cardId);
  if (!data) {
    showToast('⚠️ Please calculate first, then download PDF', 2500);
    return;
  }

  if (btnEl) { btnEl.classList.add('loading'); btnEl.querySelector('.btn-text').textContent = 'Generating PDF…'; }

  try {
    const doc = await generatePDF(data);
    const filename = data.title.replace(/[^a-zA-Z0-9]/g, '_') + '_' + new Date().getFullYear() + '.pdf';
    doc.save(filename);
    showToast(`📄 ${data.title} report downloaded!`);
  } catch (e) {
    console.error(e);
    showToast('⚠️ PDF generation failed. Try again.', 3000);
  } finally {
    if (btnEl) { btnEl.classList.remove('loading'); btnEl.querySelector('.btn-text').textContent = 'Download PDF Report'; }
  }
}
