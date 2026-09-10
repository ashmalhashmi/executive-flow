import { useMemo, useState } from 'react';
import {
  Package,
  Plus,
  CheckCircle2,
  XCircle,
  FileDown,
  FileType,
  Mail,
  MessageCircle,
  Trash2,
  Pencil,
  Save,
  ClipboardCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useOrdersExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput, TextArea } from '../components/ui/FormField';
import StatusBadge from '../components/ui/StatusBadge';
import ListPager from '../components/ui/ListPager';
import { usePagedList } from '../hooks/usePagedList';
import { formatDisplayDate, getTodayISO } from '../utils/dates';
import { getOrderWhatsAppUrl } from '../utils/orderWhatsApp';
import { RECEIVING_NOTE_SIGNATURE } from '../utils/orderReceivingNotePdf';
import { generateReceivingNoteStatement } from '../utils/orderReceivingNoteAi';
import { sendReceivingNoteEmail } from '../utils/orderReceivingNoteEmail';
import {
  buildReceivingNoteShareLabel,
  sanitizeReceivingNoteFilename,
} from '../utils/orderReceivingNoteShare';

const EMAIL_STORAGE_KEY = 'executive_flow_receiving_note_email';

function loadReceivingEmail() {
  try {
    return String(localStorage.getItem(EMAIL_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
}

function saveReceivingEmail(email) {
  try {
    localStorage.setItem(EMAIL_STORAGE_KEY, String(email || '').trim());
  } catch {
    /* ignore */
  }
}

const emptyForm = () => ({
  item: '',
  quantity: '',
  vendor: '',
  placedDate: getTodayISO(),
});

const emptyReceiving = () => ({
  orderNo: '',
  date: getTodayISO(),
  vendor: '',
  itemsReceived: '',
  statement: '',
});

export default function OrderLog() {
  const {
    orders,
    addOrder,
    updateOrder,
    markOrderReceived,
    cancelOrder,
    removeOrder,
  } = useOrdersExecutive();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [receiving, setReceiving] = useState(emptyReceiving);
  const [receivingErrors, setReceivingErrors] = useState({});
  const [receivingBusy, setReceivingBusy] = useState(false);
  const [receivingAiBusy, setReceivingAiBusy] = useState(false);
  const [receivingEmailBusy, setReceivingEmailBusy] = useState(false);
  const [receivingEmailTo, setReceivingEmailTo] = useState(() => loadReceivingEmail());
  const [receivingMessage, setReceivingMessage] = useState('');
  const [lastRecNoteLabel, setLastRecNoteLabel] = useState('');
  const [receivingSessionActive, setReceivingSessionActive] = useState(false);

  const editingOrder = useMemo(
    () => orders.find((o) => o.id === editingId) ?? null,
    [orders, editingId],
  );

  const historyOrders = useMemo(
    () =>
      [...orders].sort((a, b) => `${b.placedDate}`.localeCompare(`${a.placedDate}`)),
    [orders],
  );

  const {
    page: orderPage,
    setPage: setOrderPage,
    totalPages: orderTotalPages,
    pageItems: orderPageItems,
    total: orderTotal,
    showingLabel: orderShowingLabel,
  } = usePagedList(historyOrders, { pageSize: 50 });

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setEditingId('');
  };

  const startEdit = (order) => {
    setEditingId(order.id);
    setForm({
      item: order.item,
      quantity: String(order.quantity),
      vendor: order.vendor,
      placedDate: order.placedDate,
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = () => {
    const next = {};
    if (!form.item.trim()) next.item = 'Item / cheez ka naam likhein';
    const qty = Number(form.quantity);
    if (!Number.isFinite(qty) || qty <= 0) next.quantity = 'Valid quantity likhein';
    if (!form.vendor.trim()) next.vendor = 'Vendor ka naam likhein';
    if (!form.placedDate) next.placedDate = 'Date select karein';
    if (Object.keys(next).length) {
      setErrors(next);
      return null;
    }
    setErrors({});
    return {
      item: form.item.trim(),
      quantity: qty,
      vendor: form.vendor.trim(),
      placedDate: form.placedDate,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;

    if (editingId) {
      updateOrder(editingId, payload);
      resetForm();
      return;
    }

    const order = addOrder(payload);
    setLastPlacedOrder(order);
    resetForm();
  };

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { downloadOrderHistoryPdf } = await import('../utils/orderHistoryPdf');
      downloadOrderHistoryPdf(orders);
    } finally {
      setPdfBusy(false);
    }
  };

  const prepareReceivingExport = async () => {
    const next = {};
    if (!receiving.orderNo.trim()) next.orderNo = 'Order No. likhein';
    if (!receiving.date.trim()) next.date = 'Date likhein';
    if (!receiving.vendor.trim()) next.vendor = 'Vendor naam likhein';
    if (!receiving.itemsReceived.trim() && !receiving.statement.trim()) {
      next.itemsReceived = 'Cheezein / statement likhein';
    }
    if (Object.keys(next).length) {
      setReceivingErrors(next);
      setReceivingMessage('');
      return null;
    }
    setReceivingErrors({});
    let statement = receiving.statement.trim();
    if (!statement) {
      setReceivingMessage('AI statement ban rahi hai…');
      const gen = await generateReceivingNoteStatement({
        orderNo: receiving.orderNo.trim(),
        vendor: receiving.vendor.trim(),
        itemsReceived: receiving.itemsReceived.trim(),
        date: receiving.date.trim(),
      });
      statement = gen.statement;
      setReceiving((p) => ({ ...p, statement }));
    }
    const label =
      lastRecNoteLabel ||
      `Rec Note_${receiving.orderNo.trim() || 'Order'}_${(receiving.itemsReceived.trim() || 'Item').replace(/\s+/g, ' ')}`;
    return {
      orderNo: receiving.orderNo.trim(),
      dateISO: receiving.date.trim(),
      vendor: receiving.vendor.trim(),
      statement,
      itemsReceived: receiving.itemsReceived.trim(),
      fileBaseName: sanitizeReceivingNoteFilename(label),
    };
  };

  const handleReceivingExport = async (format) => {
    setReceivingBusy(true);
    setReceivingMessage('');
    try {
      const payload = await prepareReceivingExport();
      if (!payload) return;
      if (format === 'word') {
        const { downloadOrderReceivingNoteWord } = await import(
          '../utils/orderReceivingNoteDoc'
        );
        await downloadOrderReceivingNoteWord(payload);
        setReceivingMessage('Receiving Note Word (.doc) ready.');
      } else {
        const { downloadOrderReceivingNotePdf } = await import(
          '../utils/orderReceivingNotePdf'
        );
        await downloadOrderReceivingNotePdf(payload);
        setReceivingMessage('Receiving Note PDF ready.');
      }
    } catch (err) {
      setReceivingMessage(err.message || 'Export fail');
    } finally {
      setReceivingBusy(false);
    }
  };

  const handleReceivingEmail = async () => {
    const to = receivingEmailTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setReceivingMessage('Pehle valid email address likhein.');
      return;
    }
    setReceivingEmailBusy(true);
    setReceivingMessage('');
    try {
      const payload = await prepareReceivingExport();
      if (!payload) return;
      const result = await sendReceivingNoteEmail({
        email: to,
        ...payload,
      });
      saveReceivingEmail(to);
      setReceivingMessage(
        `Word Receiving Note email ho gayi → ${to}${result.filename ? ` (${result.filename})` : ''}.`,
      );
    } catch (err) {
      setReceivingMessage(err.message || 'Email fail — RESEND_API_KEY check karein.');
    } finally {
      setReceivingEmailBusy(false);
    }
  };

  const handleReceivingAiStatement = async () => {
    if (!receiving.itemsReceived.trim()) {
      setReceivingErrors((p) => ({
        ...p,
        itemsReceived: 'Pehle kitni / kaunsi cheezein likhein — AI statement banaye',
      }));
      return;
    }
    setReceivingAiBusy(true);
    setReceivingMessage('');
    try {
      const gen = await generateReceivingNoteStatement({
        orderNo: receiving.orderNo.trim(),
        vendor: receiving.vendor.trim(),
        itemsReceived: receiving.itemsReceived.trim(),
        date: receiving.date.trim(),
      });
      setReceiving((p) => ({ ...p, statement: gen.statement }));
      setReceivingMessage(
        gen.via === 'ai'
          ? 'AI statement ready — edit OK, phir PDF / Word.'
          : gen.warning || 'Local statement ready — edit OK, phir PDF / Word.',
      );
    } catch (err) {
      setReceivingMessage(err.message || 'AI statement fail');
    } finally {
      setReceivingAiBusy(false);
    }
  };

  /** Enable Receiving Note sub-section for an order (label + PDF/Word/Email). */
  const activateReceivingNoteSession = (order) => {
    if (!order) return;
    const dateISO =
      String(order.receivedAt || '').trim().slice(0, 10) || getTodayISO();
    const forLabel = {
      ...order,
      status: 'received',
      receivedAt: order.receivedAt || new Date().toISOString(),
    };
    const label = buildReceivingNoteShareLabel(forLabel);
    setLastRecNoteLabel(label);
    setReceivingSessionActive(true);
    setReceiving({
      orderNo: order.orderNumber || '',
      date: dateISO,
      vendor: order.vendor || '',
      itemsReceived: `${order.item} — Qty ${order.quantity}`,
      statement: '',
    });
    setReceivingErrors({});
    setReceivingMessage(
      `${label} active — optional AI preview, ya seedha PDF / Word / Email.`,
    );
    document.getElementById('receiving-note-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  /** Received → mark + enable Receiving Note sub-section (no auto download / WhatsApp). */
  const handleMarkReceived = (order) => {
    if (!order?.id) return;
    markOrderReceived(order.id);
    activateReceivingNoteSession({
      ...order,
      status: 'received',
      receivedAt: new Date().toISOString(),
    });
  };

  const clearReceivingSession = () => {
    setReceiving(emptyReceiving());
    setReceivingErrors({});
    setReceivingMessage('');
    setLastRecNoteLabel('');
    setReceivingSessionActive(false);
  };

  const lastPlacedLive = useMemo(() => {
    if (!lastPlacedOrder) return null;
    return orders.find((o) => o.id === lastPlacedOrder.id) ?? lastPlacedOrder;
  }, [lastPlacedOrder, orders]);

  const canShareLastOnWhatsApp =
    lastPlacedLive && lastPlacedLive.status !== 'cancelled';
  const whatsAppUrl = canShareLastOnWhatsApp
    ? getOrderWhatsAppUrl(lastPlacedLive)
    : '';

  const handleDeleteOrder = (order) => {
    const label = order.orderNumber ? `${order.orderNumber} — ${order.item}` : order.item;
    if (window.confirm(`"${label}" order history se delete karein?`)) {
      removeOrder(order.id);
      if (lastPlacedOrder?.id === order.id) {
        setLastPlacedOrder(null);
      }
      if (editingId === order.id) {
        resetForm();
      }
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="border-sky-500/20 bg-sky-500/5 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15">
            <Package className="h-5 w-5 text-sky-300" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/90">
              {editingId ? 'Edit Order' : 'New Order'}
            </p>
            <p className="text-sm text-zinc-500">
              {editingOrder?.orderNumber
                ? `${editingOrder.orderNumber} — item, qty, vendor aur date`
                : 'Item, qty, vendor aur place ki date'}
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Item / Cheez" id="ord-item" error={errors.item}>
            <TextInput
              id="ord-item"
              value={form.item}
              onChange={(e) => {
                setForm((p) => ({ ...p, item: e.target.value }));
                setErrors((p) => ({ ...p, item: undefined }));
              }}
              placeholder="e.g. Branded pens, Crystal award"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Quantity" id="ord-qty" error={errors.quantity}>
              <TextInput
                id="ord-qty"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => {
                  setForm((p) => ({ ...p, quantity: e.target.value }));
                  setErrors((p) => ({ ...p, quantity: undefined }));
                }}
                placeholder="e.g. 50"
              />
            </FormField>
            <FormField label="Vendor" id="ord-vendor" error={errors.vendor}>
              <TextInput
                id="ord-vendor"
                value={form.vendor}
                onChange={(e) => {
                  setForm((p) => ({ ...p, vendor: e.target.value }));
                  setErrors((p) => ({ ...p, vendor: undefined }));
                }}
                placeholder="e.g. ABC Gifts Lahore"
              />
            </FormField>
          </div>
          <FormField label="Order place ki date" id="ord-date" error={errors.placedDate}>
            <TextInput
              id="ord-date"
              type="date"
              value={form.placedDate}
              onChange={(e) => {
                setForm((p) => ({ ...p, placedDate: e.target.value }));
                setErrors((p) => ({ ...p, placedDate: undefined }));
              }}
            />
          </FormField>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
            >
              {editingId ? (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Place Order
                </>
              )}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Cancel edit
              </button>
            )}
            {!editingId && lastPlacedLive && (
              <a
                href={whatsAppUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!canShareLastOnWhatsApp}
                onClick={(e) => {
                  if (!canShareLastOnWhatsApp) e.preventDefault();
                }}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white',
                  canShareLastOnWhatsApp
                    ? 'bg-[#25D366] hover:bg-[#20bd5a]'
                    : 'cursor-not-allowed bg-zinc-700 text-zinc-400',
                ].join(' ')}
              >
                <MessageCircle className="h-4 w-4" />
                Share on WhatsApp
              </a>
            )}
          </div>
        </form>
      </GlassCard>

      <GlassCard
        id="receiving-note-section"
        className="border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15">
            <ClipboardCheck className="h-5 w-5 text-emerald-300" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
              Receiving Note
            </p>
            <p className="text-sm text-zinc-500">
              Order History → Received → yahan enable · PDF / Word / Email
            </p>
          </div>
        </div>

        {!receivingSessionActive ? (
          <p className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center text-sm text-zinc-500">
            Abhi band hai. History mein{" "}
            <span className="text-emerald-300">Received</span> dabao — Rec Note label +
            PDF / Word / Email yahan active ho jayenge.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-emerald-400/80">
                Active note
              </p>
              <p className="mt-1 break-all font-mono text-sm font-medium text-emerald-100">
                {lastRecNoteLabel || "Rec Note_…"}
              </p>
            </div>

            {receivingMessage ? (
              <p className="text-sm text-zinc-400">{receivingMessage}</p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Order No." id="recv-order-no" error={receivingErrors.orderNo}>
                <TextInput
                  id="recv-order-no"
                  value={receiving.orderNo}
                  onChange={(e) => {
                    setReceiving((p) => ({ ...p, orderNo: e.target.value }));
                    setReceivingErrors((p) => ({ ...p, orderNo: undefined }));
                  }}
                  placeholder="e.g. ORD-2026-014"
                />
              </FormField>
              <FormField
                label="Received date"
                id="recv-date"
                error={receivingErrors.date}
                hint="Jis din items receive hue"
              >
                <TextInput
                  id="recv-date"
                  type="date"
                  value={/^\d{4}-\d{2}-\d{2}$/.test(receiving.date) ? receiving.date : ''}
                  onChange={(e) => {
                    setReceiving((p) => ({ ...p, date: e.target.value }));
                    setReceivingErrors((p) => ({ ...p, date: undefined }));
                  }}
                />
              </FormField>
            </div>

            <FormField label="Vendor" id="recv-vendor" error={receivingErrors.vendor}>
              <TextInput
                id="recv-vendor"
                value={receiving.vendor}
                onChange={(e) => {
                  setReceiving((p) => ({ ...p, vendor: e.target.value }));
                  setReceivingErrors((p) => ({ ...p, vendor: undefined }));
                }}
                placeholder="e.g. ABC Gifts Lahore"
              />
            </FormField>

            <FormField
              label="Items received (notes)"
              id="recv-items"
              error={receivingErrors.itemsReceived}
              hint="Export pe AI statement banegi agar neeche khali ho"
            >
              <TextArea
                id="recv-items"
                rows={3}
                value={receiving.itemsReceived}
                onChange={(e) => {
                  setReceiving((p) => ({ ...p, itemsReceived: e.target.value }));
                  setReceivingErrors((p) => ({ ...p, itemsReceived: undefined }));
                }}
                placeholder="e.g. 50 branded pens, full qty, good condition"
              />
            </FormField>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleReceivingAiStatement}
                disabled={receivingAiBusy || receivingBusy || receivingEmailBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {receivingAiBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {receivingAiBusy ? "AI statement…" : "Generate statement (AI)"}
              </button>
            </div>

            <FormField
              label="Receiving statement (optional preview)"
              id="recv-statement"
              hint="Generate se pehle dekh/edit · ya seedha PDF — AI export pe chalegi"
            >
              <TextArea
                id="recv-statement"
                rows={4}
                value={receiving.statement}
                onChange={(e) => setReceiving((p) => ({ ...p, statement: e.target.value }))}
                placeholder="Optional — Generate (AI) ya export pe auto"
              />
            </FormField>

            <p className="text-xs text-zinc-500">
              Signature (right): handwritten image +{" "}
              <span className="text-zinc-300">{RECEIVING_NOTE_SIGNATURE}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleReceivingExport("pdf")}
                disabled={receivingBusy || receivingAiBusy || receivingEmailBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
              >
                <FileDown className="h-4 w-4" />
                {receivingBusy ? "Preparing…" : "PDF"}
              </button>
              <button
                type="button"
                onClick={() => handleReceivingExport("word")}
                disabled={receivingBusy || receivingAiBusy || receivingEmailBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
              >
                <FileType className="h-4 w-4" />
                Word
              </button>
              <button
                type="button"
                onClick={handleReceivingEmail}
                disabled={receivingBusy || receivingAiBusy || receivingEmailBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/15 px-4 py-2.5 text-sm font-medium text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
              >
                {receivingEmailBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {receivingEmailBusy ? "Sending…" : "Email"}
              </button>
              <button
                type="button"
                onClick={clearReceivingSession}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
              >
                Clear
              </button>
            </div>

            <FormField
              label="Email to (Word attach)"
              id="recv-email-to"
              hint="Email button se Resend Word attachment"
            >
              <TextInput
                id="recv-email-to"
                type="email"
                value={receivingEmailTo}
                onChange={(e) => setReceivingEmailTo(e.target.value)}
                placeholder="you@example.com"
              />
            </FormField>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Order History
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              PDF: Item, Qty, Placed Date, Status · {orderShowingLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfBusy || historyOrders.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {pdfBusy ? 'PDF ban rahi hai…' : 'Order History PDF'}
          </button>
        </div>

        {historyOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">Abhi koi order nahi</p>
        ) : (
          <>
            <ListPager
              page={orderPage}
              totalPages={orderTotalPages}
              total={orderTotal}
              showingLabel={orderShowingLabel}
              onPageChange={setOrderPage}
              className="mb-3"
            />
            <ul className="space-y-2">
              {orderPageItems.map((order) => {
              const canWhatsApp = order.status !== 'cancelled';
              const canEdit = order.status !== 'cancelled';
              return (
                <li
                  key={order.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-100">
                      {order.orderNumber && (
                        <span className="mr-2 font-mono text-xs text-sky-300/90">
                          {order.orderNumber}
                        </span>
                      )}
                      {order.item}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Qty {order.quantity} · {order.vendor} · Placed{' '}
                      {formatDisplayDate(order.placedDate)}
                    </p>
                    {order.status === 'received' && order.receivedAt && (
                      <p className="mt-0.5 text-[11px] text-emerald-400/80">
                        Received on {formatDisplayDate(order.receivedAt)}
                      </p>
                    )}
                    {order.status === 'received' && (
                      <p className="mt-0.5 break-all font-mono text-[11px] text-sky-300/90">
                        {buildReceivingNoteShareLabel(order)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={
                        order.status === 'received'
                          ? 'Received'
                          : order.status === 'cancelled'
                            ? 'Cancelled'
                            : 'Pending'
                      }
                    />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => startEdit(order)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-white/5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                    {canWhatsApp ? (
                      <a
                        href={getOrderWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2.5 py-1 text-xs font-medium text-[#25D366]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    ) : (
                      <span
                        className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-500"
                        title="Cancelled order par WhatsApp share nahi"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </span>
                    )}
                    {order.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMarkReceived(order)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Received
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`"${order.item}" order cancel karein?`)) {
                              cancelOrder(order.id);
                              if (editingId === order.id) resetForm();
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel Order
                        </button>
                      </>
                    )}
                    {order.status === 'received' && (
                      <button
                        type="button"
                        onClick={() => activateReceivingNoteSession(order)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Rec Note
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
            </ul>
            <ListPager
              page={orderPage}
              totalPages={orderTotalPages}
              total={orderTotal}
              showingLabel={orderShowingLabel}
              onPageChange={setOrderPage}
              className="mt-3"
            />
          </>
        )}
      </GlassCard>
    </div>
  );
}
