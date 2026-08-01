import { useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import Modal from '../ui/Modal';
import FormField, { TextInput } from '../ui/FormField';
import {
  extractedContactToForm,
  formFieldsToContactPayload,
  validateContactFormFields,
} from '../../utils/contactAiExtract';
import { findDuplicateContact } from '../../utils/contactEntries';

export default function ContactCaptureVerifyModal({
  isOpen,
  onClose,
  initialContact,
  contacts,
  onConfirm,
  extractVia = 'ai',
}) {
  const [form, setForm] = useState(extractedContactToForm(initialContact));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(extractedContactToForm(initialContact));
      setErrors({});
      setSaving(false);
    }
  }, [isOpen, initialContact]);

  const handleConfirm = async () => {
    const nextErrors = validateContactFormFields(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const payload = formFieldsToContactPayload(form);
    const duplicate = findDuplicateContact(contacts, payload);
    if (duplicate) {
      setErrors({ phone: `Duplicate — ${duplicate.name} pehle se mojood hai` });
      return;
    }

    setSaving(true);
    try {
      const saved = await onConfirm(payload);
      if (!saved) {
        setErrors({ phone: 'Save failed — duplicate ya invalid data' });
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verify — 2 seconds" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          <strong className="text-amber-300">Step 2: Verify</strong> — fields check karein, edit karein,
          phir Save.{' '}
          <strong className="text-emerald-300">Step 3: Sync</strong> background mein local store + Sheet
          par chalega.
          {extractVia === 'local' && (
            <span className="mt-1 block text-amber-300/90">
              Basic local parse — GEMINI_API_KEY set karein for full AI + card photo.
            </span>
          )}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Naam *" id="capture-verify-name" error={errors.name}>
            <TextInput
              id="capture-verify-name"
              value={form.name}
              onChange={(e) => {
                setForm((p) => ({ ...p, name: e.target.value }));
                setErrors((p) => ({ ...p, name: undefined }));
              }}
            />
          </FormField>
          <FormField label="Department" id="capture-verify-dept">
            <TextInput
              id="capture-verify-dept"
              value={form.department}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
            />
          </FormField>
          <FormField label="Designation" id="capture-verify-desig">
            <TextInput
              id="capture-verify-desig"
              value={form.designation}
              onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))}
            />
          </FormField>
          <FormField label="Phone (mobile)" id="capture-verify-phone" error={errors.phone}>
            <TextInput
              id="capture-verify-phone"
              value={form.phone}
              onChange={(e) => {
                setForm((p) => ({ ...p, phone: e.target.value }));
                setErrors((p) => ({ ...p, phone: undefined }));
              }}
            />
          </FormField>
          <FormField label="Contact No (office)" id="capture-verify-contact-no">
            <TextInput
              id="capture-verify-contact-no"
              value={form.contactNo}
              onChange={(e) => setForm((p) => ({ ...p, contactNo: e.target.value }))}
            />
          </FormField>
          <FormField label="Email" id="capture-verify-email" error={errors.email}>
            <TextInput
              id="capture-verify-email"
              value={form.email}
              onChange={(e) => {
                setForm((p) => ({ ...p, email: e.target.value }));
                setErrors((p) => ({ ...p, email: undefined }));
              }}
            />
          </FormField>
          <FormField label="Website" id="capture-verify-website">
            <TextInput
              id="capture-verify-website"
              value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Address" id="capture-verify-address">
          <TextInput
            id="capture-verify-address"
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          />
        </FormField>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 sm:flex-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save &amp; Sync
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
