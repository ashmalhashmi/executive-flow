import { normalizeExpenditureCategory } from '../constants/expenditureCategories';
import { isDateBetween } from './dates';

export function filterExpendituresByRange(expenditures, startISO, endISO) {
  return (expenditures || []).filter((e) => {
    const date = e.date || '';
    return date && isDateBetween(date, startISO, endISO);
  });
}

export function sumExpenditures(items) {
  return (items || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

/** Expenditures on or after opening balance effective date (inclusive). */
export function filterExpendituresFromOpeningDate(expenditures, openingBalanceDate) {
  const from = String(openingBalanceDate ?? '').trim();
  if (!from) return [...(expenditures || [])];
  return (expenditures || []).filter((e) => e.date && e.date >= from);
}

export function countExpendituresBeforeDate(expenditures, cutoffDate) {
  const cut = String(cutoffDate ?? '').trim();
  if (!cut) return 0;
  return (expenditures || []).filter((e) => e.date && e.date < cut).length;
}

export function computeExpenditureBalance({
  openingBalance = 0,
  openingBalanceDate = '',
  expenditures = [],
}) {
  const opening = Math.max(0, Number(openingBalance) || 0);
  const relevant = filterExpendituresFromOpeningDate(expenditures, openingBalanceDate);
  const totalSpent = sumExpenditures(relevant);
  return {
    opening,
    openingBalanceDate: String(openingBalanceDate ?? '').trim(),
    totalSpent,
    closingBalance: opening - totalSpent,
    relevantExpenditures: relevant,
  };
}

/** Last calendar day of year/month (month 1–12) as ISO yyyy-mm-dd */
export function lastDayOfMonthISO(year, month) {
  const d = new Date(year, month, 0);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Category → total amount, sorted descending */
export function groupByCategory(expenditures) {
  const map = new Map();
  for (const e of expenditures || []) {
    const cat = normalizeExpenditureCategory(e.category);
    map.set(cat, (map.get(cat) || 0) + (Number(e.amount) || 0));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Each row: category, amount, percent of total, cumulative percent */
export function buildCategoryBreakdown(expenditures) {
  const total = sumExpenditures(expenditures);
  if (total <= 0) return { total: 0, rows: [], topShareCategories: [], topSharePercent: 0 };

  let cumulative = 0;
  const rows = groupByCategory(expenditures).map((row) => {
    const percent = (row.amount / total) * 100;
    cumulative += percent;
    return {
      ...row,
      percent,
      cumulativePercent: cumulative,
    };
  });

  const topShareCategories = [];
  let shareSum = 0;
  for (const row of rows) {
    topShareCategories.push(row.category);
    shareSum += row.percent;
    if (shareSum >= 80) break;
  }

  return {
    total,
    rows,
    topShareCategories,
    topSharePercent: Math.min(100, Math.round(shareSum)),
  };
}
