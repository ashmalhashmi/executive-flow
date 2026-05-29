import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import Modal from '../ui/Modal';
import FormField, { TextInput } from '../ui/FormField';
import { getTodayISO } from '../../utils/dates';

const EMPTY = {
  itemName: '',
  recipientName: '',
  quantity: '1',
  dateDistributed: '',
  status: 'Pending',
};

const selectClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 transition focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export default function AddSouvenirModal({
  isOpen,
  onClose,
  onAdd,
  itemSuggestions = [],
}) {
  const [form, setForm] = useState({ ...EMPTY, dateDistributed: getTodayISO() });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY, dateDistributed: getTodayISO() });
      setErrors({});
    }
  }, [isOpen]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.itemName.trim()) next.itemName = 'Item name is required';
    if (!form.recipientName.trim()) next.recipientName = 'Recipient is required';
    const qty = Number(form.quantity);
    if (!qty || qty < 1) next.quantity = 'Quantity must be at least 1';
    if (!form.dateDistributed) next.dateDistributed = 'Date is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onAdd({
      itemName: form.itemName,
      recipientName: form.recipientName,
      quantity: Number(form.quantity),
      dateDistributed: form.dateDistributed,
      status: form.status,
    });

    setForm({ ...EMPTY, dateDistributed: getTodayISO() });
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Log Souvenir Distribution">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField label="Item Name" id="souv-item" error={errors.itemName}>
          <TextInput
            id="souv-item"
            list="souv-item-suggestions"
            value={form.itemName}
            onChange={(e) => update('itemName', e.target.value)}
            placeholder="e.g. Executive Crystal Award"
          />
          <datalist id="souv-item-suggestions">
            {itemSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </FormField>

        <FormField label="Recipient Name" id="souv-recipient" error={errors.recipientName}>
          <TextInput
            id="souv-recipient"
            value={form.recipientName}
            onChange={(e) => update('recipientName', e.target.value)}
            placeholder="Individual or organization"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Quantity" id="souv-qty" error={errors.quantity}>
            <TextInput
              id="souv-qty"
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
            />
          </FormField>
          <FormField
            label="Date Distributed"
            id="souv-date"
            error={errors.dateDistributed}
          >
            <TextInput
              id="souv-date"
              type="date"
              value={form.dateDistributed}
              onChange={(e) => update('dateDistributed', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Status" id="souv-status">
          <select
            id="souv-status"
            value={form.status}
            onChange={(e) => update('status', e.target.value)}
            className={selectClass}
          >
            <option value="Pending" className="bg-zinc-900">
              Pending
            </option>
            <option value="Delivered" className="bg-zinc-900">
              Delivered
            </option>
          </select>
        </FormField>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
          >
            <Gift className="h-4 w-4" />
            Save Entry
          </button>
        </div>
      </form>
    </Modal>
  );
}
