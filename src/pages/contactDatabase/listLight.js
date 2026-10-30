/** Fast first-paint helpers — no token search index. */

import {
  getContactEmails,
  getContactPhones,
  getContactContactNos,
} from '../../utils/contactEntries';
import {
  ALL_CATEGORIES_ID,
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_OTHER,
  getContactCategoryLabel,
} from '../../utils/contactCategories';
import { ALL_DEPARTMENTS_ID, getDepartmentId } from './search';

export function listActiveContactsSorted(contacts) {
  return (contacts || [])
    .filter((c) => c.status !== 'archived')
    .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
}

function contactHaystack(contact) {
  const parts = [
    contact?.name,
    contact?.department,
    contact?.designation,
    contact?.website,
    contact?.address,
    getContactCategoryLabel(contact?.category),
    ...getContactEmails(contact),
    ...getContactPhones(contact),
    ...getContactContactNos(contact),
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function filterContactsLight(
  contacts,
  { search = '', departmentId = ALL_DEPARTMENTS_ID, categoryId = ALL_CATEGORIES_ID } = {},
) {
  const active = listActiveContactsSorted(contacts);
  const q = String(search || '')
    .trim()
    .toLowerCase();
  const dept = departmentId || ALL_DEPARTMENTS_ID;
  const cat = categoryId || ALL_CATEGORIES_ID;

  return active.filter((contact) => {
    if (cat !== ALL_CATEGORIES_ID) {
      const contactCat = contact.category || CONTACT_CATEGORY_OTHER;
      if (contactCat !== cat) return false;
    }
    if (dept !== ALL_DEPARTMENTS_ID) {
      const label =
        String(contact.department || '').trim() ||
        String(contact.designation || '').trim() ||
        'Unassigned';
      if (getDepartmentId(label) !== dept) return false;
    }
    if (!q) return true;
    return contactHaystack(contact).includes(q);
  });
}

/** One-pass department / category option counts for dropdowns (no token maps). */
export function buildContactFilterOptionsLight(contacts) {
  const active = listActiveContactsSorted(contacts);
  const departmentCounts = new Map();
  const categoryCounts = new Map([[ALL_CATEGORIES_ID, 0]]);
  for (const cat of CONTACT_CATEGORIES) categoryCounts.set(cat.id, 0);

  for (const contact of active) {
    const label =
      String(contact.department || '').trim() ||
      String(contact.designation || '').trim() ||
      'Unassigned';
    const deptId = getDepartmentId(label);
    const prev = departmentCounts.get(deptId);
    if (prev) prev.count += 1;
    else departmentCounts.set(deptId, { id: deptId, label, count: 1 });

    categoryCounts.set(ALL_CATEGORIES_ID, (categoryCounts.get(ALL_CATEGORIES_ID) || 0) + 1);
    const categoryId = contact.category || CONTACT_CATEGORY_OTHER;
    categoryCounts.set(categoryId, (categoryCounts.get(categoryId) || 0) + 1);
  }

  const departmentOptions = [...departmentCounts.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  const categoryOptions = CONTACT_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    count: categoryCounts.get(cat.id) || 0,
  })).filter((opt) => opt.count > 0);

  return {
    total: active.length,
    departmentOptions,
    categoryOptions,
  };
}
