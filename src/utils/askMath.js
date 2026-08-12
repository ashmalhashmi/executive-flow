/**
 * NLP Math Engine — Roman Urdu / English money & count questions on live expenditure data.
 * Analogy: user asks "canteen mein kitne paise?" — system adds from Expenditure notebook, not guess.
 */

import { EXPENDITURE_CATEGORIES } from '../constants/expenditureCategories';
import { formatPKR } from './currency';
import {
  computeExpenditureBalance,
  filterExpendituresFromOpeningDate,
  sumExpenditures,
} from './expenditureAnalytics';
import { addDaysISO, formatDisplayDate, getTodayISO } from './dates';
import { normalizeExpenditureCategory } from '../constants/expenditureCategories';

const CATEGORY_ALIASES = {
  canteen: 'Food',
  khana: 'Food',
  mess: 'Food',
  lunch: 'Food',
  dinner: 'Food',
  food: 'Food',
  nashta: 'Food',
  petrol: 'Transport',
  fuel: 'Transport',
  transport: 'Transport',
  taxi: 'Transport',
  uber: 'Transport',
  rent: 'Rent',
  utility: 'Utilities',
  utilities: 'Utilities',
  bill: 'Utilities',
  bijli: 'Utilities',
  medical: 'Healthcare',
  hospital: 'Healthcare',
  dawa: 'Healthcare',
  shopping: 'Shopping',
  gift: 'Shopping',
  entertainment: 'Entertainment',
  movie: 'Entertainment',
};

export function parseCategoryHint(q) {
  const lower = String(q || '').toLowerCase();
  for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) {
      return { category, keyword: alias };
    }
  }
  for (const cat of EXPENDITURE_CATEGORIES) {
    if (new RegExp(`\\b${cat.toLowerCase()}\\b`, 'i').test(lower)) {
      return { category: cat, keyword: cat.toLowerCase() };
    }
  }
  return null;
}

export function parseMathIntent(q) {
  const lower = String(q || '').toLowerCase();
  const wantsBalance = /\b(balance|bacha|baccha|baki|closing|remaining|reh gaya|reh gaye)\b/.test(
    lower,
  );
  const wantsSpend =
    /\b(kharch|kharcha|kharchay|kharch kiye|spend|spent|paise|paisa|rupee|rupees|rs|pkr)\b/.test(
      lower,
    ) || /\b(how much|total|sum|kitna)\b/.test(lower);
  const wantsCount = /\b(how many|count|kitne|kitni)\b/.test(lower);
  const categoryHint = parseCategoryHint(lower);
  const isMoneyQuestion = wantsBalance || wantsSpend || categoryHint !== null;

  return {
    wantsBalance,
    wantsSpend,
    wantsCount,
    categoryHint,
    isMoneyQuestion,
  };
}

function filterExpensePool({
  expenditures = [],
  openingBalanceDate = '',
  date = '',
  categoryHint = null,
  terms = [],
}) {
  let pool = filterExpendituresFromOpeningDate(expenditures, openingBalanceDate);

  if (date) {
    pool = pool.filter((e) => e.date === date);
  }

  if (categoryHint?.category) {
    pool = pool.filter(
      (e) =>
        normalizeExpenditureCategory(e.category) === categoryHint.category ||
        String(e.description || '')
          .toLowerCase()
          .includes(categoryHint.keyword),
    );
  } else if (terms.length) {
    const matched = pool.filter((e) => {
      const blob = [e.description, e.category, String(e.amount)].join(' ').toLowerCase();
      return terms.some((t) => blob.includes(t));
    });
    if (matched.length) pool = matched;
  }

  return pool;
}

function dateLabel(isoDate) {
  const today = getTodayISO();
  if (isoDate === today) return 'aaj';
  if (isoDate === addDaysISO(today, 1)) return 'kal';
  if (isoDate === addDaysISO(today, -1)) return 'kal (yesterday)';
  return isoDate ? formatDisplayDate(isoDate) : '';
}

/**
 * Run math on live expenditure rows — returns null if not a money/count expense question.
 */
export function tryExpenditureMath(parsed, data, mathIntent) {
  if (!mathIntent.isMoneyQuestion && !mathIntent.wantsCount) return null;

  const expenditures = data.expenditures || [];
  const openingBalance = Number(data.expenditureOpeningBalance) || 0;
  const openingBalanceDate = data.expenditureOpeningBalanceDate || '';

  const hasExpenseContext =
    mathIntent.isMoneyQuestion ||
    mathIntent.wantsCount ||
    parsed.tabs.includes('expenditure') ||
    mathIntent.categoryHint;

  if (!hasExpenseContext) return null;

  const pool = filterExpensePool({
    expenditures,
    openingBalanceDate,
    date: parsed.date,
    categoryHint: mathIntent.categoryHint,
    terms: parsed.terms,
  });

  const balance = computeExpenditureBalance({
    openingBalance,
    openingBalanceDate,
    expenditures,
  });

  const sectionChecked = 'Expenditure Log';
  const best = { tab: 'expenditure', domain: 'Expenditure' };

  // Closing balance (whole log, no filters)
  if (
    mathIntent.wantsBalance &&
    !parsed.date &&
    !mathIntent.categoryHint &&
    !parsed.terms.length
  ) {
    return {
      answer: `Expenditure Log check kia — closing balance ${formatPKR(balance.closingBalance)} (opening ${formatPKR(balance.opening)}, total kharcha ${formatPKR(balance.totalSpent)}).`,
      sectionChecked,
      best,
      hits: [],
      notebooksScanned: ['expenditure'],
    };
  }

  const spendTotal = sumExpenditures(pool);
  const count = pool.length;
  const when = parsed.date ? dateLabel(parsed.date) : '';
  const catPart = mathIntent.categoryHint
    ? mathIntent.categoryHint.keyword
    : parsed.terms[0] || '';

  if (mathIntent.wantsCount && (mathIntent.isMoneyQuestion || parsed.tabs.includes('expenditure'))) {
    if (count === 0) {
      const scope = [when, catPart].filter(Boolean).join(' ') || 'is period';
      return {
        answer: `Expenditure Log check kia — ${scope} koi expense entry nahi.`,
        sectionChecked,
        best: null,
        hits: [],
        notebooksScanned: ['expenditure'],
      };
    }
    return {
      answer: `Expenditure Log check kia — ${count} expense entr${count === 1 ? 'y' : 'ies'}${when ? ` ${when}` : ''}${catPart ? ` (${catPart})` : ''}, total ${formatPKR(spendTotal)}.`,
      sectionChecked,
      best,
      hits: [],
      notebooksScanned: ['expenditure'],
    };
  }

  if (mathIntent.wantsSpend || mathIntent.wantsBalance) {
    if (count === 0) {
      const scope = [when, catPart].filter(Boolean).join(' ') || 'is query';
      return {
        answer: `Expenditure Log check kia — ${scope} koi kharcha nahi (Rs 0).`,
        sectionChecked,
        best: null,
        hits: [],
        notebooksScanned: ['expenditure'],
      };
    }

    const label = catPart ? `${catPart} par` : when ? `${when} ka` : 'total';
    return {
      answer: `Expenditure Log check kia — ${label} kharcha ${formatPKR(spendTotal)} (${count} entr${count === 1 ? 'y' : 'ies'}).`,
      sectionChecked,
      best,
      hits: [],
      notebooksScanned: ['expenditure'],
    };
  }

  return null;
}
