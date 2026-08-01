import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookUser,
  Plus,
  Search,
  Phone,
  Mail,
  MessageCircle,
  Pencil,
  Save,
  Trash2,
  FileDown,
  MapPin,
  Upload,
  Loader2,
  Undo2,
  Globe,
} from 'lucide-react';
import { useContactsExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import CopyButton from '../components/ui/CopyButton';
import { getWhatsAppShareUrl } from '../utils/whatsappShare';
import {
  buildContactCardText,
  countFileImportedContacts,
  findDuplicateContact,
  formatContactNosForForm,
  formatEmailsForForm,
  formatPhonesForForm,
  getContactContactNos,
  getContactEmails,
  getContactPhones,
  normalizePhoneDigits,
  parseEmailsInput,
  standardizeEmails,
  standardizePhoneList,
  withoutFileImportedContacts,
} from '../utils/contactEntries';
import {
  ALL_DEPARTMENTS_ID,
  buildContactSearchIndex,
  getContactIdsForDepartment,
  searchContactsIndex,
} from './contactDatabase/search';
import { buildGoogleSearchUrl } from './contactDatabase/urls';
import {
  CONTACT_IMPORT_FIELDS,
  emptyContactUiColumnMap,
  guessContactColumnMap,
  parseColumnIndex,
  previewMappedContactRows,
  readContactImportFile,
  rowsToContacts,
  uiColumnMapFromIndexMapping,
} from '../utils/contactCsvImport';
import ContactCaptureLoop from '../components/contacts/ContactCaptureLoop';

const COL_OPTIONS = (headers) => [
  { value: '', label: '— Select column —' },
  ...headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` })),
];

const emptyForm = () => ({
  name: '',
  department: '',
  phone: '',
  email: '',
  designation: '',
  contactNo: '',
  website: '',
  address: '',
});

function ContactActions({ contact }) {
  const phones = getContactPhones(contact);
  const contactNos = getContactContactNos(contact);
  const whatsAppDigits = phones[0] ? normalizePhoneDigits(phones[0]) : '';
  const googleSearchUrl = buildGoogleSearchUrl(contact.department);
  const emails = getContactEmails(contact);

  return (
    <div className="flex flex-wrap gap-2">
      {phones.map((phone) => {
        const digits = normalizePhoneDigits(phone);
        if (!digits) return null;
        return (
          <a
            key={`call-mobile-${digits}`}
            href={`tel:+${digits}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
          >
            <Phone className="h-3.5 w-3.5" />
            {phones.length > 1 ? phone : 'Call'}
          </a>
        );
      })}
      {contactNos.map((phone, index) => {
        const digits = normalizePhoneDigits(phone);
        if (!digits) return null;
        return (
          <a
            key={`call-office-${digits}`}
            href={`tel:+${digits}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20"
          >
            <Phone className="h-3.5 w-3.5" />
            {contactNos.length > 1 ? `Office ${index + 1}` : 'Office'}
          </a>
        );
      })}
      {whatsAppDigits && (
        <a
          href={getWhatsAppShareUrl(buildContactCardText(contact), whatsAppDigits)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      )}
      {emails.map((email) => (
        <a
          key={email}
          href={`mailto:${encodeURIComponent(email)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/20"
        >
          <Mail className="h-3.5 w-3.5" />
          {emails.length > 1 ? email.split('@')[0] : 'Email'}
        </a>
      ))}
      {contact.website && (
        <a
          href={contact.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"
        >
          <Globe className="h-3.5 w-3.5" />
          Website
        </a>
      )}
      {googleSearchUrl && (
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20"
        >
          <Search className="h-3.5 w-3.5" />
          Google
        </a>
      )}
      <CopyButton text={buildContactCardText(contact)} label="Copy" />
    </div>
  );
}

export default function ContactDatabase() {
  const { contacts, addContact, updateContact, removeContact, importContacts, clearAllContacts, reconcileContacts } =
    useContactsExecutive();

  const [search, setSearch] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(ALL_DEPARTMENTS_ID);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [jsonContacts, setJsonContacts] = useState([]);
  const [importType, setImportType] = useState('');
  const [columnMap, setColumnMap] = useState(emptyContactUiColumnMap);
  const [importMode, setImportMode] = useState('merge');
  const didReconcile = useRef(false);

  useEffect(() => {
    if (didReconcile.current) return;
    didReconcile.current = true;
    reconcileContacts();
  }, [reconcileContacts]);

  const importedFileCount = useMemo(
    () => countFileImportedContacts(contacts),
    [contacts],
  );

  const previewContacts = useMemo(() => {
    if (importType === 'json') return jsonContacts;
    if (parseColumnIndex(columnMap.name) === null) return [];
    return rowsToContacts(csvRows, columnMap);
  }, [importType, jsonContacts, csvRows, columnMap]);

  const mappedPreviewRows = useMemo(() => {
    if (!csvRows.length || parseColumnIndex(columnMap.name) === null) return [];
    return previewMappedContactRows(csvRows, columnMap, 3);
  }, [csvRows, columnMap]);

  const searchIndex = useMemo(() => buildContactSearchIndex(contacts), [contacts]);
  const departmentOptions = searchIndex.departmentOptions;
  const departmentContactIds = useMemo(
    () => getContactIdsForDepartment(searchIndex, selectedDepartmentId),
    [searchIndex, selectedDepartmentId],
  );

  const filtered = useMemo(
    () => searchContactsIndex(searchIndex, search, { candidateIds: departmentContactIds }),
    [searchIndex, search, departmentContactIds],
  );
  const hasActiveFilters = search.trim() || selectedDepartmentId !== ALL_DEPARTMENTS_ID;

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setEditingId('');
  };

  const startEdit = (contact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name || '',
      department: contact.department || '',
      phone: formatPhonesForForm(contact),
      email: formatEmailsForForm(contact),
      designation: contact.designation || '',
      contactNo: formatContactNosForForm(contact),
      website: contact.website || '',
      address: contact.address || '',
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Naam zaroori hai';
    const emailInput = form.email.trim();
    const parsedEmails = parseEmailsInput(emailInput);
    const validEmails = standardizeEmails(emailInput);
    if (emailInput && validEmails.length !== parsedEmails.length) {
      next.email = 'Har email valid honi chahiye — comma se alag karein';
    }
    const validPhones = standardizePhoneList(form.phone);
    const validContactNos = standardizePhoneList(form.contactNo);
    if (
      !validPhones.length &&
      !validContactNos.length &&
      !validEmails.length
    ) {
      next.phone = 'Kam az kam phone, contact no ya email likhein';
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return null;
    }

    const payload = {
      name: form.name.trim(),
      department: form.department.trim(),
      phones: validPhones,
      phone: validPhones[0] || '',
      emails: validEmails,
      email: validEmails[0] || '',
      designation: form.designation.trim(),
      contactNos: validContactNos,
      contactNo: validContactNos[0] || '',
      website: form.website.trim(),
      address: form.address.trim(),
    };

    const duplicate = findDuplicateContact(contacts, payload, editingId);
    if (duplicate) {
      const hint =
        getContactPhones(duplicate)[0] ||
        getContactContactNos(duplicate)[0] ||
        getContactEmails(duplicate)[0] ||
        duplicate.name;
      setErrors({
        phone: `Yeh contact pehle se mojood hai — ${hint}`,
      });
      return null;
    }

    setErrors({});
    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;

    if (editingId) {
      const saved = updateContact(editingId, payload);
      if (!saved) {
        setErrors({ phone: 'Update failed — duplicate phone, email, ya office number' });
        return;
      }
    } else {
      const created = addContact(payload);
      if (!created) {
        setErrors({ phone: 'Duplicate contact — same phone, email, ya office number' });
        return;
      }
    }
    resetForm();
  };

  const handleDownloadPdf = async () => {
    if (!filtered.length) return;
    setPdfBusy(true);
    try {
      const { downloadContactDatabasePdf } = await import('../utils/contactDatabasePdf');
      downloadContactDatabasePdf(filtered);
    } finally {
      setPdfBusy(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportBusy(true);
    setImportMessage('');
    try {
      const result = await readContactImportFile(file);
      setImportFileName(file.name);
      setImportType(result.type);
      if (result.type === 'json') {
        setJsonContacts(result.contacts);
        setCsvHeaders([]);
        setCsvRows([]);
        setImportMessage(`${result.contacts.length} contacts JSON se load — Import dabayein`);
      } else {
        setJsonContacts([]);
        setCsvHeaders(result.headers);
        setCsvRows(result.rows);
        const guessed = guessContactColumnMap(result.headers);
        setColumnMap(uiColumnMapFromIndexMapping(guessed));
        setImportMessage(`${result.rows.length} rows load ho gayi — neeche columns confirm karein`);
      }
    } catch (err) {
      setImportMessage(err.message || 'File read failed');
      setImportFileName('');
      setCsvHeaders([]);
      setCsvRows([]);
      setJsonContacts([]);
      setImportType('');
    } finally {
      setImportBusy(false);
      e.target.value = '';
    }
  };

  const handleImportToApp = () => {
    if (!previewContacts.length) {
      setImportMessage('Import ke liye valid contacts nahi — Naam column + phone/email zaroori');
      return;
    }
    const label =
      importMode === 'merge'
        ? `${previewContacts.length} contacts purane list ke sath jod dein?`
        : `${previewContacts.length} contacts import karein? Purani contacts replace ho jayengi.`;
    if (!window.confirm(label)) return;

    const { saved, merged } = importContacts(previewContacts, importMode);
    const mergeNote =
      merged > 0 ? ` · ${merged} duplicate${merged === 1 ? '' : 's'} merged` : '';
    setImportMessage(`Done — ${saved} unique contacts${mergeNote}. Neeche list dekhein.`);
    setCsvHeaders([]);
    setCsvRows([]);
    setJsonContacts([]);
    setImportType('');
    setImportFileName('');
  };

  const handleCancelFileImport = () => {
    if (!importedFileCount) {
      setImportMessage('Koi file import mojood nahi');
      return;
    }
    if (
      !window.confirm(
        `Cancel file import?\n\n${importedFileCount} file se import contacts delete ho jayenge.\nManual contacts reh jayenge.`,
      )
    ) {
      return;
    }
    importContacts(withoutFileImportedContacts(contacts), 'replace');
    setImportMessage(`Done — ${importedFileCount} imported contacts hata diye`);
  };

  const handleClearAllContacts = () => {
    const activeCount = contacts.filter((c) => c.status !== 'archived').length;
    if (!activeCount) return;
    if (
      !window.confirm(
        `Sab contacts clear karein?\n\n${activeCount} contact${activeCount === 1 ? '' : 's'} permanently delete ho jayenge.\nYe action undo nahi ho sakta.`,
      )
    ) {
      return;
    }
    clearAllContacts();
    resetForm();
    setSearch('');
    setSelectedDepartmentId(ALL_DEPARTMENTS_ID);
    setImportMessage('');
    setCsvHeaders([]);
    setCsvRows([]);
    setJsonContacts([]);
    setImportType('');
    setImportFileName('');
  };

  const handleCaptureSync = (payload) => {
    const created = addContact(payload);
    return Boolean(created);
  };

  const colOpts = COL_OPTIONS(csvHeaders);

  return (
    <div className="space-y-6">
      {/* Search — instant retrieval */}
      <GlassCard className="sticky top-0 z-10 border-cyan-500/20 bg-zinc-950/90 p-4 backdrop-blur-md sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 shrink-0 text-cyan-300" />
            <TextInput
              id="contact-search"
              type="search"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-base"
            />
          </div>
          <label className="sr-only" htmlFor="contact-department-filter">
            Department
          </label>
          <select
            id="contact-department-filter"
            value={selectedDepartmentId}
            onChange={(e) => setSelectedDepartmentId(e.target.value)}
            className="rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
          >
            <option value={ALL_DEPARTMENTS_ID}>
              All departments ({searchIndex.orderedIds.length})
            </option>
            {departmentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      <ContactCaptureLoop contacts={contacts} onSaveContact={handleCaptureSync} />

      {/* File import */}
      <GlassCard className="border-violet-500/20 bg-violet-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15">
            <Upload className="h-5 w-5 text-violet-300" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
              File se Import
            </p>
            <p className="text-sm text-zinc-500">
              CSV ya JSON upload — import ke baad neeche Contacts list mein dikhenge
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-200 hover:bg-violet-500/20">
            {importBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            CSV / JSON file choose karein
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="sr-only"
              disabled={importBusy}
              onChange={handleImportFile}
            />
          </label>
          {importedFileCount > 0 && (
            <button
              type="button"
              onClick={handleCancelFileImport}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-200 hover:bg-rose-500/20"
            >
              <Undo2 className="h-4 w-4" />
              Cancel file import ({importedFileCount})
            </button>
          )}
        </div>

        {importFileName && (
          <p className="mb-3 text-xs text-zinc-400">
            File: <span className="text-zinc-200">{importFileName}</span>
            {importType === 'csv' && csvRows.length > 0 && ` · ${csvRows.length} rows`}
            {importType === 'json' && jsonContacts.length > 0 && ` · ${jsonContacts.length} contacts`}
          </p>
        )}

        {csvHeaders.length > 0 && (
          <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Robot ko batayein — kaun column kya hai
            </p>
            <p className="text-xs text-zinc-500">
              Har dropdown = aapki CSV file ka column. Import usi index se value lega.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CONTACT_IMPORT_FIELDS.map(({ key, label, required }) => (
                <label key={key} className="text-xs text-zinc-400">
                  {label}
                  {required ? ' *' : ' (optional)'}
                  <select
                    value={columnMap[key]}
                    onChange={(e) =>
                      setColumnMap((p) => ({ ...p, [key]: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  >
                    {colOpts.map((opt) => (
                      <option key={`${key}-${opt.value || 'empty'}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {mappedPreviewRows.length > 0 && (
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                <p className="mb-2 text-xs font-medium text-violet-200">
                  Mapping preview (file se pehli rows)
                </p>
                <ul className="space-y-2 text-xs text-zinc-400">
                  {mappedPreviewRows.map((row, i) => (
                    <li key={i} className="rounded border border-white/5 bg-black/20 px-2 py-1.5">
                      <span className="font-medium text-zinc-200">{row.name}</span>
                      {row.department && ` · ${row.department}`}
                      {row.designation && ` · ${row.designation}`}
                      {row.phone && ` · ${row.phone}`}
                      {row.email && ` · ${row.email}`}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-emerald-300/90">
                  Ready: {previewContacts.length} contacts import ke liye
                </p>
              </div>
            )}
          </div>
        )}

        {(csvHeaders.length > 0 || jsonContacts.length > 0) && (
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-zinc-400">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="contact-import-mode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              Merge (purani + nayi)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="contact-import-mode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              Replace (sirf file wale)
            </label>
          </div>
        )}

        {(csvHeaders.length > 0 || jsonContacts.length > 0) && (
          <button
            type="button"
            onClick={handleImportToApp}
            disabled={!previewContacts.length}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Import to App ({previewContacts.length})
          </button>
        )}

        {importMessage && (
          <p className="mt-3 text-sm text-zinc-400">{importMessage}</p>
        )}

        <p className="mt-4 text-xs text-zinc-600">
          CSV columns: Naam, Phone, Email, Department, Designation, Contact No, Address — ya
          JSON / app backup file jisme <code className="text-zinc-500">contacts</code> array ho.
        </p>
      </GlassCard>

      {/* Add / edit form */}
      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15">
            <BookUser className="h-5 w-5 text-cyan-300" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90">
              {editingId ? 'Edit Contact' : 'New Contact'}
            </p>
            <p className="text-sm text-zinc-500">
              Sab details ek jagah — memory par load kam, communication fast
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Naam *" id="contact-name" error={errors.name}>
              <TextInput
                id="contact-name"
                placeholder="e.g. Ahmed Khan"
                value={form.name}
                onChange={(e) => {
                  setForm((p) => ({ ...p, name: e.target.value }));
                  setErrors((p) => ({ ...p, name: undefined }));
                }}
              />
            </FormField>
            <FormField label="Department" id="contact-department">
              <TextInput
                id="contact-department"
                placeholder="e.g. Finance, Admin, HR"
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Designation" id="contact-designation">
              <TextInput
                id="contact-designation"
                placeholder="e.g. Director, PA to CEO"
                value={form.designation}
                onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
              />
            </FormField>
            <FormField label="Phone (mobile)" id="contact-phone" error={errors.phone}>
              <TextInput
                id="contact-phone"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 0300 1234567, 0312 9876543"
                value={form.phone}
                onChange={(e) => {
                  setForm((p) => ({ ...p, phone: e.target.value }));
                  setErrors((p) => ({ ...p, phone: undefined }));
                }}
              />
            </FormField>
            <FormField label="Contact No (office / alternate)" id="contact-no">
              <TextInput
                id="contact-no"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 051-1234567, 051-7654321"
                value={form.contactNo}
                onChange={(e) => setForm((p) => ({ ...p, contactNo: e.target.value }))}
              />
            </FormField>
          </div>
          <FormField label="Email" id="contact-email" error={errors.email}>
            <TextInput
              id="contact-email"
              type="text"
              inputMode="email"
              placeholder="e.g. name@org.gov.pk, personal@gmail.com"
              value={form.email}
              onChange={(e) => {
                setForm((p) => ({ ...p, email: e.target.value }));
                setErrors((p) => ({ ...p, email: undefined }));
              }}
            />
          </FormField>
          <FormField label="Official website" id="contact-website">
            <TextInput
              id="contact-website"
              type="url"
              inputMode="url"
              placeholder="e.g. https://www.example.gov.pk"
              value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
            />
          </FormField>
          <FormField label="Address" id="contact-address">
            <textarea
              id="contact-address"
              rows={2}
              placeholder="Office / home address"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500"
            >
              {editingId ? (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Contact
                </>
              )}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </GlassCard>

      {/* Contact list */}
      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Contacts
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Call, WhatsApp, email — ek click mein
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfBusy || filtered.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {pdfBusy ? 'PDF…' : `Download PDF (${filtered.length})`}
            </button>
            <button
              type="button"
              onClick={handleClearAllContacts}
              disabled={contacts.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            {hasActiveFilters
              ? 'Koi contact match nahi — search ya department change karein'
              : 'Abhi koi contact nahi — upar form se pehla contact add karein'}
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((contact) => (
              <li
                key={contact.id}
                className={[
                  'rounded-xl border px-4 py-4',
                  editingId === contact.id
                    ? 'border-cyan-400/40 bg-cyan-500/10'
                    : 'border-white/10 bg-white/[0.03]',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-zinc-100">{contact.name}</p>
                    {contact.department && (
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-cyan-300/80">
                        {contact.department}
                      </p>
                    )}
                    {contact.designation && (
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {contact.designation}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(contact)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-cyan-500/10 hover:text-cyan-300"
                      aria-label="Edit contact"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`"${contact.name}" delete karein?`)) {
                          if (editingId === contact.id) resetForm();
                          removeContact(contact.id);
                        }
                      }}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Delete contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-1.5 text-sm text-zinc-400">
                  {getContactPhones(contact).map((phone) => (
                    <p key={`phone-${phone}`} className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span>{phone}</span>
                    </p>
                  ))}
                  {getContactContactNos(contact).map((contactNo, index) => (
                    <p key={`contactNo-${contactNo}`} className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span className="text-zinc-500">
                        {getContactContactNos(contact).length > 1 ? `Alt ${index + 1}:` : 'Alt:'}
                      </span>
                      <span>{contactNo}</span>
                    </p>
                  ))}
                  {getContactEmails(contact).map((email) => (
                    <p key={email} className="flex items-center gap-2 break-all">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <a href={`mailto:${encodeURIComponent(email)}`} className="hover:text-violet-200">
                        {email}
                      </a>
                    </p>
                  ))}
                  {contact.website && (
                    <p className="flex items-center gap-2 break-all">
                      <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-300/90 hover:underline"
                      >
                        {contact.website}
                      </a>
                    </p>
                  )}
                  {contact.address && (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span className="text-zinc-500">{contact.address}</span>
                    </p>
                  )}
                </div>

                <div className="mt-3 border-t border-white/5 pt-3">
                  <ContactActions contact={contact} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
