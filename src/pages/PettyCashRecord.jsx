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
import { formatPKR } from '../utils/currency';
import {
  emptyPurchaseSlip,
  emptySatisfactoryNote,
  emptyRefreshmentNote,
} from '../utils/pettyCashEntries';
import {
  computePurchaseItemsTotal,
  emptyPurchaseItem,
  syncPurchaseItemTotals,
} from '../utils/pettyCashPurchaseSlip';
import {
  emptySatisfactoryItem,
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
  const invoiceRef = useRef(null);

  const [meetingId, setMeetingId] = useState('');
  const [invoicePhotoUrl, setInvoicePhotoUrl] = useState('');
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

  const handleInvoiceScan = async (file) => {
    if (!file) return;
    setScanBusy(true);
    setMessage('');
    try {
      const { fields, invoicePhotoUrl: url, storageWarning } = await extractPettyInvoiceWithAi({
        imageFile: file,
      });
      setInvoicePhotoUrl(url || '');
      setPurchaseSlip((p) => {
        const items = [...(p.items || [emptyPurchaseItem()])];
        const first = syncPurchaseItemTotals({
          ...items[0],
          description: fields.description || items[0].description,
          quantity: fields.quantity || items[0].quantity,
          totalCost: fields.amountPkr || items[0].totalCost,
        });
        items[0] = first;
        return {
          ...p,
          vendor: fields.vendor || p.vendor,
          invoiceNo: fields.invoiceNo || p.invoiceNo,
          date: fields.date || p.date,
          paymentMode: fields.paymentMode || p.paymentMode,
          items,
          description: fields.description || p.description,
          quantity: fields.quantity || p.quantity,
          amountPkr: fields.amountPkr || p.amountPkr,
        };
      });
      setMessage(storageWarning || 'Invoice scan complete — fields verify karein');
    } catch (err) {
      setMessage(err.message || 'Scan fail');
    } finally {
      setScanBusy(false);
      if (invoiceRef.current) invoiceRef.current.value = '';
    }
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

  const updateSatisfactoryItem = (index, patch) => {
    setSatisfactoryNote((p) => {
      const items = [...(p.items || [])];
      items[index] = { ...items[index], ...patch };
      return { ...p, items };
    });
  };

  const addSatisfactoryItem = () => {
    setSatisfactoryNote((p) => ({
      ...p,
      items: [...(p.items || []), emptySatisfactoryItem()],
    }));
  };

  const removeSatisfactoryItem = (index) => {
    setSatisfactoryNote((p) => {
      const items = [...(p.items || [])];
      if (items.length <= 1) return p;
      items.splice(index, 1);
      return { ...p, items };
    });
  };

  const copySatisfactoryFromPurchase = () => {
    setSatisfactoryNote((p) => ({
      ...p,
      items: satisfactoryItemsFromPurchase(purchaseSlip),
    }));
    setMessage('Satisfactory Note items purchase slip se copy ho gaye');
  };

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
      invoicePhotoUrl,
      purchaseSlip: {
        ...purchaseSlip,
        requestedBy: {
          ...purchaseSlip.requestedBy,
          name:
            String(purchaseSlip.requestedBy?.name ?? '').trim() ||
            pettyCashSignatures.purchaseSlip[0]?.name ||
            '',
        },
      },
      satisfactoryNote: {
        ...satisfactoryNote,
        receivedBy: {
          ...satisfactoryNote.receivedBy,
          name:
            String(satisfactoryNote.receivedBy?.name ?? '').trim() ||
            pettyCashSignatures.satisfactoryNote[0]?.name ||
            '',
        },
        verifiedBy: {
          ...satisfactoryNote.verifiedBy,
          name:
            String(satisfactoryNote.verifiedBy?.name ?? '').trim() ||
            pettyCashSignatures.purchaseSlipApprover?.name ||
            '',
        },
      },
    });
    setPurchaseSlip(emptyPurchaseSlip());
    setSatisfactoryNote(emptySatisfactoryNote());
    setInvoicePhotoUrl('');
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
          signatories: pettyCashSignatures.purchaseSlip,
          approverSignatory: pettyCashSignatures.purchaseSlipApprover,
        });
      } else {
        await downloadSatisfactoryNotePdf({
          satisfactoryNote: c.satisfactoryNote,
          signatories: pettyCashSignatures.satisfactoryNote,
          sectionHeadSignatory: pettyCashSignatures.purchaseSlipApprover,
        });
      }
    });

  const exportCaseWord = (c, type) =>
    runExport(async () => {
      if (type === 'purchase') {
        await downloadPurchaseSlipWord(
          c,
          pettyCashSignatures.purchaseSlip,
          pettyCashSignatures.purchaseSlipApprover,
        );
      } else {
        await downloadSatisfactoryNoteWord(
          c,
          pettyCashSignatures.satisfactoryNote,
          pettyCashSignatures.purchaseSlipApprover,
        );
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
          signatories:
            type === 'purchase'
              ? pettyCashSignatures.purchaseSlip
              : pettyCashSignatures.satisfactoryNote,
          approverSignatory: pettyCashSignatures.purchaseSlipApprover,
          sectionHeadSignatory:
            type === 'satisfactory' ? pettyCashSignatures.purchaseSlipApprover : undefined,
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
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/25">
              {scanBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {scanBusy ? 'Scanning…' : 'Scan invoice'}
              <input
                ref={invoiceRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={scanBusy}
                onChange={(e) => handleInvoiceScan(e.target.files?.[0])}
              />
            </label>
            {invoicePhotoUrl && (
              <a
                href={invoicePhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-sky-400 underline"
              >
                <Image className="h-3.5 w-3.5" />
                Invoice preview
              </a>
            )}
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
                  {formatPKR(purchaseTotal)}
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

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">Requested By</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" id="ps-req-name">
            <TextInput
              id="ps-req-name"
              value={
                purchaseSlip.requestedBy?.name ||
                pettyCashSignatures.purchaseSlip[0]?.name ||
                ''
              }
              onChange={(e) =>
                setPurchaseSlip((p) => ({
                  ...p,
                  requestedBy: { ...p.requestedBy, name: e.target.value },
                }))
              }
              placeholder="Optional — initiator name se auto"
            />
          </FormField>
          <FormField label="Date" id="ps-req-date">
            <TextInput
              id="ps-req-date"
              type="date"
              value={purchaseSlip.requestedBy?.date || ''}
              onChange={(e) =>
                setPurchaseSlip((p) => ({
                  ...p,
                  requestedBy: { ...p.requestedBy, date: e.target.value },
                }))
              }
            />
          </FormField>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Signature line print par manual — digital image nahi
        </p>

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">
          Approved by (Section Head):
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
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
        <p className="mt-1 text-xs text-zinc-500">
          Signature line print par manual — digital image nahi
        </p>

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">Satisfactory Note</p>
        <button
          type="button"
          onClick={copySatisfactoryFromPurchase}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200"
        >
          Copy items from purchase slip
        </button>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-3 py-2">Item Description</th>
                <th className="px-3 py-2 w-24">Qty Received</th>
                <th className="px-3 py-2 w-28">Condition</th>
                <th className="px-3 py-2">Remarks</th>
                <th className="px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {(satisfactoryNote.items || []).map((row, index) => (
                <tr key={index} className="border-t border-white/5">
                  <td className="px-2 py-2">
                    <TextInput
                      value={row.description}
                      onChange={(e) =>
                        updateSatisfactoryItem(index, { description: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={row.qtyReceived}
                      onChange={(e) =>
                        updateSatisfactoryItem(index, { qtyReceived: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={row.condition}
                      onChange={(e) =>
                        updateSatisfactoryItem(index, { condition: e.target.value })
                      }
                      placeholder="Satisfactory"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <TextInput
                      value={row.remarks}
                      onChange={(e) =>
                        updateSatisfactoryItem(index, { remarks: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeSatisfactoryItem(index)}
                      className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addSatisfactoryItem}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Add satisfactory row
        </button>

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">
          Received &amp; Verified By (End User / Requestor)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Name" id="sn-recv-name">
            <TextInput
              id="sn-recv-name"
              value={
                satisfactoryNote.receivedBy?.name ||
                pettyCashSignatures.satisfactoryNote[0]?.name ||
                ''
              }
              onChange={(e) =>
                setSatisfactoryNote((p) => ({
                  ...p,
                  receivedBy: { ...p.receivedBy, name: e.target.value },
                }))
              }
              placeholder="Optional — requestor name se auto"
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
        <p className="mt-1 text-xs text-zinc-500">
          Signature line print par manual — digital image nahi
        </p>

        <p className="mb-2 mt-5 text-xs font-medium text-zinc-400">
          Verified By (Section Head)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
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
        <p className="mt-1 text-xs text-zinc-500">
          Signature line print par manual — digital image nahi
        </p>

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
                      {formatPKR(
                        c.purchaseSlip?.totalEstimatedCost ||
                          computePurchaseItemsTotal(c.purchaseSlip?.items),
                      )}
                    </p>
                    {c.invoicePhotoUrl && (
                      <a
                        href={c.invoicePhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-sky-400"
                      >
                        <Image className="h-3 w-3" />
                        Invoice
                      </a>
                    )}
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
