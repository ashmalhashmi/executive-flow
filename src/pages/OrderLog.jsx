import { useMemo, useState } from 'react';
import {
  Package,
  Plus,
  CheckCircle2,
  XCircle,
  FileDown,
  MessageCircle,
  Trash2,
  Pencil,
  Save,
} from 'lucide-react';
import { useOrdersExecutive } from '../context/ExecutiveContext';
import GlassCard from '../components/ui/GlassCard';
import FormField, { TextInput } from '../components/ui/FormField';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDisplayDate, getTodayISO } from '../utils/dates';
import { getOrderWhatsAppUrl } from '../utils/orderWhatsApp';

const emptyForm = () => ({
  item: '',
  quantity: '',
  vendor: '',
  placedDate: getTodayISO(),
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

  const editingOrder = useMemo(
    () => orders.find((o) => o.id === editingId) ?? null,
    [orders, editingId],
  );

  const historyOrders = useMemo(
    () =>
      [...orders].sort((a, b) => `${b.placedDate}`.localeCompare(`${a.placedDate}`)),
    [orders],
  );

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

      <GlassCard className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Order History
            </h3>
            <p className="mt-1 text-xs text-zinc-500">PDF: Item, Qty, Placed Date, Status</p>
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
          <ul className="space-y-2">
            {historyOrders.map((order) => {
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
                          onClick={() => markOrderReceived(order.id)}
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
        )}
      </GlassCard>
    </div>
  );
}
