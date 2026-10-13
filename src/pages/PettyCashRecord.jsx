import { useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Camera,
  FileDown,
  FileType,
  Mail,
  Plus,
  Save,
  Trash2,
  Loader2,
  Image,
} from 'lucide-react';
import {
  useMeetingsExecutive,
  usePettyCashExecutive,
} from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput, TextArea } from '../components/ui/FormField';
import { formatDisplayDate, getTodayISO } from '../utils/dates';
import {
  emptyPurchaseSlip,
  emptySatisfactoryNote,
  emptyRefreshmentNote,
} from '../utils/pettyCashEntries';
import {
  computePurchaseItemsTotal,
  emptyPurchaseItem,
  emptyRequestedByPerson,
  formatPurchaseMoney,
  mergePurchaseSlipFieldsFromScan,
  normalizeRequestedByList,
  syncPurchaseItemTotals,
} from '../utils/pettyCashPurchaseSlip';
import {
  emptySatisfactoryItem,
  SATISFACTORY_ITEM_DESCRIPTION,
  singleSatisfactoryItem,
  satisfactoryItemsFromPurchase,
} from '../utils/pettyCashSatisfactoryNote';
import { extractPettyInvoiceWithAi } from '../utils/pettyCashInvoiceAi';
import {
  downloadPurchaseSlipPdf,
  downloadSatisfactoryNotePdf,
  downloadRefreshmentReceivingPdf,
} from '../utils/pettyCashPdf';
import {
  downloadPurchaseSlipWord,
  downloadSatisfactoryNoteWord,
  downloadRefreshmentReceivingWord,
  sendPettyCashEmail,
} from '../utils/pettyCashEmail';

const EMAIL_KEY = 'executive_flow_petty_cash_email';

function loadEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

function ExportButtons({ busy, onPdf, onWord, onEmail, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={onPdf}
        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
      >
        <FileDown className="h-3.5 w-3.5" />
        PDF
      </button>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={onWord}
        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-40"
      >
        <FileType className="h-3.5 w-3.5" />
        Word
      </button>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={onEmail}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
      >
        <Mail className="h-3.5 w-3.5" />
        Email
      </button>
    </div>
  );
}

export default function PettyCashRecord() {
  const { meetings } = useMeetingsExecutive();
  const {
    pettyCashCases,
    refreshmentNotes,
    pettyCashSignatures,
    addPettyCashCase,
    removePettyCashCase,
    addRefreshmentNote,
    removeRefreshmentNote,
  } = usePettyCashExecutive();

  const [email, setEmail] = useState(loadEmail);
  const [message, setMessage] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMode, setScanMode] = useState('replace');
  const invoiceRef = useRef(null);
  const invoiceScanModeRef = useRef('replace');

  const [meetingId, setMeetingId] = useState('');
  const [invoicePhotoUrls, setInvoicePhotoUrls] = useState([]);
  const [purchaseSlip, setPurchaseSlip] = useState(emptyPurchaseSlip);
  const [satisfactoryNote, setSatisfactoryNote] = useState(emptySatisfactoryNote);
  const [refreshForm, setRefreshForm] = useState(() => {
    const f = emptyRefreshmentNote();
    const issuer = pettyCashSignatures.refreshmentIssuer;
    f.issuedByName = issuer?.name || '';
    f.issuedByDesignation = issuer?.designation || '';
    return f;
  });

  const meetingOptions = useMemo(
    () =>
      [...(meetings || [])]
        .filter((m) => m.status !== 'Completed' && m.status !== 'Cancelled')
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)),
    [meetings],
  );

  const selectedMeeting = meetingOptions.find((m) => m.id === meetingId);

  const applyMeeting = (id) => {
    setMeetingId(id);
    const m = meetingOptions.find((x) => x.id === id);
    if (m) {
      setRefreshForm((p) => ({
        ...p,
        meetingId: m.id,
        meetingTitle: m.title,
        meetingDate: m.date,
        purpose: m.title,
      }));
    }
  };

  const handleInvoiceScan = async (file, mode = 'replace') => {
    if (!file) return;
    setScanBusy(true);
    setMessage('');
    try {
      const { fields, invoicePhotoUrl: url, storageWarning } = await extractPettyInvoiceWithAi({
        imageFile: file,
      });
      const pageUrl = String(url || '').trim();
      setInvoicePhotoUrls((prev) => {
        if (mode === 'append') {
          if (!pageUrl) return prev;
          if (prev.includes(pageUrl)) return prev;
          return [...prev, pageUrl];
        }
        return pageUrl ? [pageUrl] : [];
      });

      let mergedItems = [];
      setPurchaseSlip((p) => {
        const merged = mergePurchaseSlipFieldsFromScan(p, fields, mode);
        mergedItems = merged.items;
        return merged;
      });
      setSatisfactoryNote((p) => ({
        ...p,
        items: satisfactoryItemsFromPurchase({ items: mergedItems }),
      }));

      const pageCountHint =
        mode === 'append'
          ? `Page add ho gayi — ab ${mergedItems.filter((r) => String(r.description || '').trim()).length} items. Zarurat ho to phir Scan next page.`
          : 'Invoice scan complete — lambi bill ho to Scan next page dabayein; warna verify karke Save case.';
      setMessage(storageWarning || pageCountHint);
    } catch (err) {
      setMessage(err.message || 'Scan fail');
    } finally {
      setScanBusy(false);
      invoiceScanModeRef.current = 'replace';
      setScanMode('replace');
      if (invoiceRef.current) invoiceRef.current.value = '';
    }
  };

  const triggerInvoiceScan = (mode) => {
    invoiceScanModeRef.current = mode;
    setScanMode(mode);
    invoiceRef.current?.click();
  };

  const purchaseTotal = useMemo(
    () => computePurchaseItemsTotal(purchaseSlip.items),
    [purchaseSlip.items],
  );

  const updatePurchaseItem = (index, patch) => {
    setPurchaseSlip((p) => {
      const items = [...(p.items || [])];
      items[index] = syncPurchaseItemTotals({ ...items[index], ...patch });
      return { ...p, items };
    });
  };

  const addPurchaseItem = () => {
    setPurchaseSlip((p) => ({
      ...p,
      items: [...(p.items || []), emptyPurchaseItem()],
    }));
  };

  const removePurchaseItem = (index) => {
    setPurchaseSlip((p) => {
      const items = [...(p.items || [])];
      if (items.length <= 1) return p;
      items.splice(index, 1);
      return { ...p, items };
    });
  };

  const updateSatisfactoryItem = (_index, patch) => {
    setSatisfactoryNote((p) => ({
      ...p,
      items: [singleSatisfactoryItem({ ...(p.items?.[0] || {}), ...patch })],
    }));
  };

  const satisfactoryRow = satisfactoryNote.items?.[0] || emptySatisfactoryItem();

  const handleSaveCase = () => {
    const hasItem = (purchaseSlip.items || []).some((row) =>
      String(row.description || '').trim(),
    );
    if (!hasItem && !purchaseSlip.justification?.trim()) {
      setMessage('At least one item description ya justification chahiye');
      return;
    }
    addPettyCashCase({
      meetingId: selectedMeeting?.id || '',
      meetingTitle: selectedMeeting?.title || '',
      meetingDate: selectedMeeting?.date || '',
      invoicePhotoUrl: invoicePhotoUrls[0] || '',
      invoicePhotoUrls,
      purchaseSlip: {
        ...purchaseSlip,
        requestedBy: normalizeRequestedByList(purchaseSlip.requestedBy),
        approvedBy: {
          name: String(purchaseSlip.approvedBy?.name ?? '').trim(),
          designation: String(purchaseSlip.approvedBy?.designation ?? '').trim(),
          date: String(purchaseSlip.approvedBy?.date ?? '').trim(),
        },
      },
      satisfactoryNote: {
        ...satisfactoryNote,
        items: [singleSatisfactoryItem(satisfactoryNote.items?.[0])],
        receivedBy: {
          name: String(satisfactoryNote.receivedBy?.name ?? '').trim(),
          designation: String(satisfactoryNote.receivedBy?.designation ?? '').trim(),
          date: String(satisfactoryNote.receivedBy?.date ?? '').trim(),
        },
        verifiedBy: {
          name: String(satisfactoryNote.verifiedBy?.name ?? '').trim(),
          designation: String(satisfactoryNote.verifiedBy?.designation ?? '').trim(),
          date: String(satisfactoryNote.verifiedBy?.date ?? '').trim(),
        },
      },
    });
    setPurchaseSlip(emptyPurchaseSlip());
    setSatisfactoryNote(emptySatisfactoryNote());
    setInvoicePhotoUrls([]);
    setMeetingId('');
    setMessage('Purchase case save ho gaya — neeche list mein export karein');
  };

  const handleSaveRefreshment = () => {
    if (!refreshForm.itemsIssued.trim()) {
      setMessage('Items issued likhein');
      return;
    }
    addRefreshmentNote(refreshForm);
    const issuer = pettyCashSignatures.refreshmentIssuer;
    setRefreshForm({
      ...emptyRefreshmentNote(),
      issuedByName: issuer?.name || '',
      issuedByDesignation: issuer?.designation || '',
    });
    setMessage('Refreshment receiving note save ho gaya');
  };

  const runExport = async (fn) => {
    setExportBusy(true);
    try {
      await fn();
    } catch (err) {
      setMessage(err.message || 'Export fail');
    } finally {
      setExportBusy(false);
    }
  };

  const exportCasePdf = (c, type) =>
    runExport(async () => {
      if (type === 'purchase') {
        await downloadPurchaseSlipPdf({
          purchaseSlip: c.purchaseSlip,
        });
      } else {
        await downloadSatisfactoryNotePdf({
          satisfactoryNote: c.satisfactoryNote,
        });
      }
    });

  const exportCaseWord = (c, type) =>
    runExport(async () => {
      if (type === 'purchase') {
        await downloadPurchaseSlipWord(c);
      } else {
        await downloadSatisfactoryNoteWord(c);
      }
    });

  const exportCaseEmail = (c, type) =>
    runExport(async () => {
      const to = email.trim();
      if (!to) {
        setMessage('Email address likhein');
        return;
      }
      localStorage.setItem(EMAIL_KEY, to);
      await sendPettyCashEmail({
        email: to,
        docType: type === 'purchase' ? 'purchase_slip' : 'satisfactory_note',
        payload: {
          caseNo: c.caseNo,
          meetingTitle: c.meetingTitle,
          meetingDate: c.meetingDate,
          purchaseSlip: c.purchaseSlip,
          satisfactoryNote: c.satisfactoryNote,
        },
      });
      setMessage(`Email bhej di → ${to}`);
    });

  const exportRefreshPdf = (n) =>
    runExport(() =>
      downloadRefreshmentReceivingPdf({
        noteNo: n.noteNo,
        meetingTitle: n.meetingTitle,
        meetingDate: n.meetingDate,
        note: n,
        issuerSignatory: pettyCashSignatures.refreshmentIssuer,
      }),
    );

  const exportRefreshWord = (n) =>
    runExport(() => downloadRefreshmentReceivingWord(n, pettyCashSignatures.refreshmentIssuer));

  const exportRefreshEmail = (n) =>
    runExport(async () => {
      const to = email.trim();
      if (!to) {
        setMessage('Email address likhein');
        return;
      }
      localStorage.setItem(EMAIL_KEY, to);
      await sendPettyCashEmail({
        email: to,
        docType: 'refreshment_receiving',
        payload: {
          noteNo: n.noteNo,
          meetingTitle: n.meetingTitle,
          meetingDate: n.meetingDate,
          note: n,
          issuerSignatory: pettyCashSignatures.refreshmentIssuer,
        },
      });
      setMessage(`Email bhej di → ${to}`);
    });

  return (
    <div className="space-y-6">
      <GlassCard className="border-emerald-500/25 bg-emerald-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15">
            <Banknote className="h-5 w-5 text-emerald-300" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
              Petty Cash Record
            </p>
            <p className="text-sm text-zinc-500">
              Purchase Slip · Satisfactory Note · Refreshment Receiving — PDF / Word / Email
            </p>
          </div>
        </div>

        <FormField label="Export email (Word attachment)" id="pc-email">
          <TextInput
            id="pc-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </FormField>

        {message && (
          <p className="mt-3 text-sm text-emerald-200/90">{message}</p>
        )}
      </GlassCard>

      <GlassCard className="border-violet-500/20 p-5 sm:p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-violet-300/90">
          New — Purchase Slip + Satisfactory Note
        </p>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Meeting (optional)" id="pc-meeting">
            <select
              id="pc-meeting"
              value={meetingId}
              onChange={(e) => applyMeeting(e.target.value)}
              className="block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100"
            >
              <option value="">— Meeting select —</option>
              {meetingOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatDisplayDate(m.date)} · {m.title}
                </option>
              ))}
            </select>
          </FormField>
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={scanBusy}
                onClick={() => triggerInvoiceScan('replace')}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scanBusy && scanMode === 'replace' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {scanBusy && scanMode === 'replace'
                  ? 'Scanning…'
                  : invoicePhotoUrls.length
                    ? 'Rescan (replace)'
                    : 'Scan invoice'}
              </button>
              {invoicePhotoUrls.length > 0 ? (
                <button
                  type="button"
                  disabled={scanBusy}
                  onClick={() => triggerInvoiceScan('append')}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm text-emerald-100 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {scanBusy && scanMode === 'append' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {scanBusy && scanMode === 'append' ? 'Adding page…' : 'Scan next page'}
                </button>
              ) : null}
              <input
                ref={invoiceRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={scanBusy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleInvoiceScan(file, invoiceScanModeRef.current || 'replace');
                }}
              />
            </div>
            {invoicePhotoUrls.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {invoicePhotoUrls.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-sky-400 underline"
                  >
                    <Image className="h-3.5 w-3.5" />
                    Page {index + 1}
                  </a>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-[11px] text-zinc-500">
              Lambi invoice: pehli photo Scan, doosri/teesri ke liye Scan next page — ek hi Save case.
            </p>
          </div>
        </div>

        <p className="mb-2 text-xs font-medium text-zinc-400">Purchase Slip</p>

        <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-3 py-2 w-12">Sr.</th>
                <th className="px-3 py-2">Item Description</th>
                <th className="px-3 py-2 w-20">Qty</th>
                <th className="px-3 py-2 w-28">Unit Cost (Rs.)</th>
                <th className="px-3 py-2 w-28">Total (Rs.)</th>
                <th className="px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {(purchaseSlip.items || []).map((row, index) => (
                <tr key={index} className="border-t border-white/5">
                  <td className="px-3 py-2 text-center text-zinc-400">{index + 1}</td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={row.description}
                      onChange={(e) => updatePurchaseItem(index, { description: e.target.value })}
                      placeholder="Item description"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={row.quantity}
                      onChange={(e) => updatePurchaseItem(index, { quantity: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={row.unitCost}
                      onChange={(e) => updatePurchaseItem(index, { unitCost: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={row.totalCost}
                      onChange={(e) => updatePurchaseItem(index, { totalCost: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removePurchaseItem(index)}
                      className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 bg-white/5">
                <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold text-zinc-300">
                  Total Estimated Cost (Rs.)
                </td>
                <td className="px-3 py-2 font-semibold text-emerald-200">
                  {formatPurchaseMoney(purchaseTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <button
          type="button"
          onClick={addPurchaseItem}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item row
        </button>

        <FormField label="Justification" id="ps-justification" className="mt-4">
          <TextArea
            id="ps-justification"
            rows={3}
            value={purchaseSlip.justification}
            onChange={(e) => setPurchaseSlip((p) => ({ ...p, justification: e.target.value }))}
            placeholder="Why this purchase is required…"
          />
        </FormField>

        <div className="mb-2 mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-400">Requested By</p>
          <button
            type="button"
            onClick={() =>
              setPurchaseSlip((p) => ({
                ...p,
                requestedBy: [
                  ...normalizeRequestedByList(p.requestedBy),
                  emptyRequestedByPerson(),
                ],
              }))
            }
            className="inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Add requester
          </button>
        </div>
        <div className="space-y-3">
          {normalizeRequestedByList(purchaseSlip.requestedBy).map((person, index, list) => (
            <div key={`req-${index}`} className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
                <FormField label="Name" id={`ps-req-name-${index}`}>
                  <TextInput
                    id={`ps-req-name-${index}`}
                    value={person.name || ''}
                    onChange={(e) =>
                      setPurchaseSlip((p) => {
                        const next = normalizeRequestedByList(p.requestedBy);
                        next[index] = { ...next[index], name: e.target.value };
                        return { ...p, requestedBy: next };
                      })
                    }
                    placeholder="Requester name"
                  />
                </FormField>
                <FormField label="Designation" id={`ps-req-des-${index}`}>
                  <TextInput
                    id={`ps-req-des-${index}`}
                    value={person.designation || ''}
                    onChange={(e) =>
                      setPurchaseSlip((p) => {
                        const next = normalizeRequestedByList(p.requestedBy);
                        next[index] = { ...next[index], designation: e.target.value };
                        return { ...p, requestedBy: next };
                      })
                    }
                    placeholder="Designation"
                  />
                </FormField>
                <FormField label="Date" id={`ps-req-date-${index}`}>
                  <TextInput
                    id={`ps-req-date-${index}`}
                    type="date"
                    value={person.date || ''}
                    onChange={(e) =>
                      setPurchaseSlip((p) => {
                        const next = normalizeRequestedByList(p.requestedBy);
                        next[index] = { ...next[index], date: e.target.value };
                        return { ...p, requestedBy: next };
                      })
                    }
                  />
                </FormField>
              </div>
              {list.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setPurchaseSlip((p) => {
                      const next = normalizeRequestedByList(p.requestedBy).filter(
                        (_row, i) => i !== index,
                      );
                      return {
                        ...p,
                        requestedBy: next.length ? next : [emptyRequestedByPerson()],
                      };
                    })
                  }
                  className="mb-0.5 rounded p-2 text-red-400 hover:bg-red-500/10"
                  title="Remove requester"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">
          Approved by (Section Head):
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Name" id="ps-app-name">
            <TextInput
              id="ps-app-name"
              value={purchaseSlip.approvedBy?.name || ''}
              onChange={(e) =>
                setPurchaseSlip((p) => ({
                  ...p,
                  approvedBy: { ...p.approvedBy, name: e.target.value },
                }))
              }
            />
          </FormField>
          <FormField label="Designation" id="ps-app-des">
            <TextInput
              id="ps-app-des"
              value={purchaseSlip.approvedBy?.designation || ''}
              onChange={(e) =>
                setPurchaseSlip((p) => ({
                  ...p,
                  approvedBy: { ...p.approvedBy, designation: e.target.value },
                }))
              }
            />
          </FormField>
          <FormField label="Date" id="ps-app-date">
            <TextInput
              id="ps-app-date"
              type="date"
              value={purchaseSlip.approvedBy?.date || ''}
              onChange={(e) =>
                setPurchaseSlip((p) => ({
                  ...p,
                  approvedBy: { ...p.approvedBy, date: e.target.value },
                }))
              }
            />
          </FormField>
        </div>

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">Satisfactory Note</p>
        <p className="mb-3 text-[11px] text-zinc-500">
          Sirf ek row: Item Description fixed, Qty Received khali.
        </p>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-3 py-2">Item Description</th>
                <th className="px-3 py-2 w-24">Qty Received</th>
                <th className="px-3 py-2 w-28">Condition</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/5">
                <td className="px-2 py-2">
                  <TextInput value={SATISFACTORY_ITEM_DESCRIPTION} readOnly />
                </td>
                <td className="px-2 py-2">
                  <TextInput value="" readOnly />
                </td>
                <td className="px-2 py-2">
                  <TextInput
                    value={satisfactoryRow.condition}
                    onChange={(e) =>
                      updateSatisfactoryItem(0, { condition: e.target.value })
                    }
                    placeholder="Satisfactory"
                  />
                </td>
                <td className="px-2 py-2">
                  <TextInput
                    value={satisfactoryRow.remarks}
                    onChange={(e) =>
                      updateSatisfactoryItem(0, { remarks: e.target.value })
                    }
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">
          Received &amp; Verified By (End User / Requestor)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Name" id="sn-recv-name">
            <TextInput
              id="sn-recv-name"
              value={satisfactoryNote.receivedBy?.name || ''}
              onChange={(e) =>
                setSatisfactoryNote((p) => ({
                  ...p,
                  receivedBy: { ...p.receivedBy, name: e.target.value },
                }))
              }
              placeholder="Name"
            />
          </FormField>
          <FormField label="Designation" id="sn-recv-des">
            <TextInput
              id="sn-recv-des"
              value={satisfactoryNote.receivedBy?.designation || ''}
              onChange={(e) =>
                setSatisfactoryNote((p) => ({
                  ...p,
                  receivedBy: { ...p.receivedBy, designation: e.target.value },
                }))
              }
              placeholder="Designation"
            />
          </FormField>
          <FormField label="Date" id="sn-recv-date">
            <TextInput
              id="sn-recv-date"
              type="date"
              value={satisfactoryNote.receivedBy?.date || ''}
              onChange={(e) =>
                setSatisfactoryNote((p) => ({
                  ...p,
                  receivedBy: { ...p.receivedBy, date: e.target.value },
                }))
              }
            />
          </FormField>
        </div>

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">
          Verified By (Section Head)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Name" id="sn-ver-name">
            <TextInput
              id="sn-ver-name"
              value={satisfactoryNote.verifiedBy?.name || ''}
              onChange={(e) =>
                setSatisfactoryNote((p) => ({
                  ...p,
                  verifiedBy: { ...p.verifiedBy, name: e.target.value },
                }))
              }
            />
          </FormField>
          <FormField label="Designation" id="sn-ver-des">
            <TextInput
              id="sn-ver-des"
              value={satisfactoryNote.verifiedBy?.designation || ''}
              onChange={(e) =>
                setSatisfactoryNote((p) => ({
                  ...p,
                  verifiedBy: { ...p.verifiedBy, designation: e.target.value },
                }))
              }
            />
          </FormField>
          <FormField label="Date" id="sn-ver-date">
            <TextInput
              id="sn-ver-date"
              type="date"
              value={satisfactoryNote.verifiedBy?.date || ''}
              onChange={(e) =>
                setSatisfactoryNote((p) => ({
                  ...p,
                  verifiedBy: { ...p.verifiedBy, date: e.target.value },
                }))
              }
            />
          </FormField>
        </div>

        <button
          type="button"
          onClick={handleSaveCase}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          Save case
        </button>
      </GlassCard>

      {pettyCashCases.length > 0 && (
        <GlassCard className="border-white/10 p-5 sm:p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Saved cases ({pettyCashCases.length})
          </p>
          <div className="space-y-4">
            {pettyCashCases.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-100">{c.caseNo}</p>
                    <p className="text-sm text-zinc-400">
                      {c.meetingTitle || '—'} ·{' '}
                      {formatPurchaseMoney(
                        c.purchaseSlip?.totalEstimatedCost ||
                          computePurchaseItemsTotal(c.purchaseSlip?.items),
                      )}
                    </p>
                    {(c.invoicePhotoUrls?.length
                      ? c.invoicePhotoUrls
                      : c.invoicePhotoUrl
                        ? [c.invoicePhotoUrl]
                        : []
                    ).map((url, index, all) => (
                      <a
                        key={`${c.id}-inv-${index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 mr-2 inline-flex items-center gap-1 text-xs text-sky-400"
                      >
                        <Image className="h-3 w-3" />
                        {all.length > 1 ? `Invoice p.${index + 1}` : 'Invoice'}
                      </a>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePettyCashCase(c.id)}
                    className="rounded p-2 text-red-400 hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-[10px] uppercase tracking-wider text-zinc-500">
                  Purchase Slip
                </p>
                <ExportButtons
                  busy={exportBusy}
                  disabled={false}
                  onPdf={() => exportCasePdf(c, 'purchase')}
                  onWord={() => exportCaseWord(c, 'purchase')}
                  onEmail={() => exportCaseEmail(c, 'purchase')}
                />
                <p className="mt-3 text-[10px] uppercase tracking-wider text-zinc-500">
                  Satisfactory Note
                </p>
                <ExportButtons
                  busy={exportBusy}
                  disabled={false}
                  onPdf={() => exportCasePdf(c, 'satisfactory')}
                  onWord={() => exportCaseWord(c, 'satisfactory')}
                  onEmail={() => exportCaseEmail(c, 'satisfactory')}
                />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="border-cyan-500/20 bg-cyan-500/5 p-5 sm:p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
          Refreshment Receiving Note (office se issue)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Date" id="rf-date">
            <TextInput
              id="rf-date"
              type="date"
              value={refreshForm.date}
              onChange={(e) => setRefreshForm((p) => ({ ...p, date: e.target.value }))}
            />
          </FormField>
          <FormField label="Meeting" id="rf-meeting">
            <select
              id="rf-meeting"
              value={refreshForm.meetingId}
              onChange={(e) => {
                const m = meetingOptions.find((x) => x.id === e.target.value);
                setRefreshForm((p) => ({
                  ...p,
                  meetingId: e.target.value,
                  meetingTitle: m?.title || '',
                  meetingDate: m?.date || '',
                  purpose: m?.title || p.purpose,
                }));
              }}
              className="block w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-zinc-100"
            >
              <option value="">— Optional —</option>
              {meetingOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {formatDisplayDate(m.date)} · {m.title}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Items issued" id="rf-items">
            <TextInput
              id="rf-items"
              value={refreshForm.itemsIssued}
              onChange={(e) => setRefreshForm((p) => ({ ...p, itemsIssued: e.target.value }))}
            />
          </FormField>
          <FormField label="Quantity" id="rf-qty">
            <TextInput
              id="rf-qty"
              value={refreshForm.quantity}
              onChange={(e) => setRefreshForm((p) => ({ ...p, quantity: e.target.value }))}
            />
          </FormField>
          <FormField label="Receiver name" id="rf-recv">
            <TextInput
              id="rf-recv"
              value={refreshForm.receiverName}
              onChange={(e) => setRefreshForm((p) => ({ ...p, receiverName: e.target.value }))}
            />
          </FormField>
          <FormField label="Receiver designation" id="rf-recv-des">
            <TextInput
              id="rf-recv-des"
              value={refreshForm.receiverDesignation}
              onChange={(e) =>
                setRefreshForm((p) => ({ ...p, receiverDesignation: e.target.value }))
              }
            />
          </FormField>
        </div>
        <button
          type="button"
          onClick={handleSaveRefreshment}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500"
        >
          <Save className="h-4 w-4" />
          Save receiving note
        </button>

        {refreshmentNotes.length > 0 && (
          <div className="mt-6 space-y-3">
            {refreshmentNotes.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-100">{n.noteNo}</p>
                    <p className="text-sm text-zinc-400">
                      {n.itemsIssued} · {n.receiverName || '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRefreshmentNote(n.id)}
                    className="rounded p-2 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3">
                  <ExportButtons
                    busy={exportBusy}
                    disabled={false}
                    onPdf={() => exportRefreshPdf(n)}
                    onWord={() => exportRefreshWord(n)}
                    onEmail={() => exportRefreshEmail(n)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
