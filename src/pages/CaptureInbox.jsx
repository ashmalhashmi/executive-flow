import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Copy,
  Lock,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  StickyNote,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useCaptureExecutive } from '../context/ExecutiveContext';
import { useCloudSyncContext } from '../context/CloudSyncContext';
import GlassCard from '../components/ui/GlassCard';
import Modal from '../components/ui/Modal';
import FormField, { TextInput, TextArea } from '../components/ui/FormField';
import ListPager from '../components/ui/ListPager';
import { usePagedList } from '../hooks/usePagedList';
import { formatDisplayDate } from '../utils/dates';
import {
  captureDisplayTitle,
  captureSearchText,
  captureStatus,
  sortCaptureEntries,
} from '../utils/captureEntries';
import {
  MIN_VAULT_PASSPHRASE,
  createNotesVault,
  decryptNoteSecret,
  encryptNoteSecret,
  loadNotesVaultMeta,
  unlockNotesVault,
} from '../utils/notesVault';

const emptyForm = () => ({
  title: '',
  text: '',
  vault: false,
});

function formatNoteWhen(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${formatDisplayDate(d.toISOString().slice(0, 10))} · ${d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return '—';
  }
}

function noteTimes(entry) {
  const created = formatNoteWhen(entry.createdAt);
  const createdMs = Date.parse(entry.createdAt) || 0;
  const updatedMs = Date.parse(entry.updatedAt) || 0;
  if (updatedMs - createdMs > 60_000) {
    return `Saved ${created} · Updated ${formatNoteWhen(entry.updatedAt)}`;
  }
  return `Saved ${created}`;
}

async function writeClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

const actionClass =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium';

function NoteMenu({ open, onClose, onToggle, items }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) onClose();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        className={`${actionClass} border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10`}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">More</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 py-1 shadow-xl shadow-black/40"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                item.danger
                  ? 'text-red-300 hover:bg-red-500/10'
                  : 'text-zinc-200 hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CaptureInbox() {
  const {
    captureEntries,
    addCaptureEntry,
    updateCaptureEntry,
    setCapturePinned,
    completeCaptureEntry,
    trashCaptureEntry,
    restoreCaptureEntry,
    removeCaptureEntry,
  } = useCaptureExecutive();
  const cloud = useCloudSyncContext();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [passphrase2, setPassphrase2] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [menuId, setMenuId] = useState('');
  const [notice, setNotice] = useState('');
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [vaultMeta, setVaultMeta] = useState(() => loadNotesVaultMeta());
  const [vaultKey, setVaultKey] = useState(null);
  const [secrets, setSecrets] = useState({});
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPass, setUnlockPass] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const noticeTimer = useRef(null);

  const closeMenu = useCallback(() => setMenuId(''), []);

  const showNotice = useCallback((message) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2800);
  }, []);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!vaultKey) {
      setSecrets({});
      return undefined;
    }
    let cancel = false;
    (async () => {
      const next = {};
      for (const entry of captureEntries) {
        if (!entry.vault) continue;
        next[entry.id] = await decryptNoteSecret(vaultKey, entry.vault);
      }
      if (!cancel) setSecrets(next);
    })();
    return () => {
      cancel = true;
    };
  }, [vaultKey, captureEntries]);

  const sorted = useMemo(() => sortCaptureEntries(captureEntries), [captureEntries]);

  const counts = useMemo(() => {
    const tally = { active: 0, archived: 0, trash: 0 };
    for (const entry of captureEntries) tally[captureStatus(entry.status)] += 1;
    return tally;
  }, [captureEntries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((entry) => {
      if (captureStatus(entry.status) !== filter) return false;
      if (!q) return true;
      return captureSearchText(entry, secrets[entry.id]).includes(q);
    });
  }, [sorted, query, filter, secrets]);

  const lockedInFilter = useMemo(
    () =>
      sorted.filter(
        (entry) =>
          captureStatus(entry.status) === filter && entry.vault && !secrets[entry.id],
      ).length,
    [sorted, filter, secrets],
  );

  const {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    showingLabel,
  } = usePagedList(filtered, { pageSize: 30 });

  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setEditingId('');
    setPassphrase('');
    setPassphrase2('');
    setBusy(false);
  };

  const closeForm = () => {
    setFormOpen(false);
    resetForm();
  };

  const openNew = () => {
    resetForm();
    setFormOpen(true);
    closeMenu();
  };

  const startEdit = (entry) => {
    const secret = secrets[entry.id];
    if (entry.vault && !secret) {
      showNotice('Pehle vault unlock karein, phir edit karein.');
      setUnlockOpen(true);
      return;
    }
    setEditingId(entry.id);
    setForm({
      title: secret?.title || entry.title || '',
      text: secret?.text || entry.text || '',
      vault: Boolean(entry.vault),
    });
    setErrors({});
    setPassphrase('');
    setPassphrase2('');
    setFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const text = form.text.trim();
    if (!text) {
      setErrors({ text: 'Note likhna zaroori hai' });
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      let key = vaultKey;
      if (form.vault) {
        if (!key) {
          if (!vaultMeta) {
            if (passphrase.length < MIN_VAULT_PASSPHRASE) {
              setErrors({
                passphrase: `Passphrase kam az kam ${MIN_VAULT_PASSPHRASE} characters ka ho`,
              });
              return;
            }
            if (passphrase !== passphrase2) {
              setErrors({ passphrase2: 'Passphrase match nahi kar raha' });
              return;
            }
            const created = await createNotesVault(passphrase);
            key = created.key;
            setVaultMeta(created.meta);
            setVaultKey(key);
          } else {
            key = await unlockNotesVault(passphrase, vaultMeta);
            if (!key) {
              setErrors({ passphrase: 'Passphrase galat hai' });
              return;
            }
            setVaultKey(key);
          }
        }
        const vault = await encryptNoteSecret(key, { title, text });
        if (editingId) updateCaptureEntry(editingId, { vault });
        else addCaptureEntry({ vault });
      } else if (editingId) {
        updateCaptureEntry(editingId, { title, text, vault: null });
      } else {
        addCaptureEntry({ title, text });
      }
      closeForm();
      setFilter('active');
      setPage(1);
    } catch (err) {
      setErrors({ form: err?.message || 'Note save nahi ho saka' });
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async (event) => {
    event.preventDefault();
    setUnlockError('');
    const key = await unlockNotesVault(unlockPass, vaultMeta);
    if (!key) {
      setUnlockError('Passphrase galat hai');
      return;
    }
    setVaultKey(key);
    setUnlockPass('');
    setUnlockOpen(false);
    showNotice('Vault unlocked');
  };

  const handleCopy = async (entry) => {
    const secret = secrets[entry.id];
    if (entry.vault && !secret) {
      showNotice('Vault unlock karein, phir copy karein.');
      setUnlockOpen(true);
      return;
    }
    const title = String(secret?.title || entry.title || '').trim();
    const text = String(secret?.text || entry.text || '').trim();
    const value = [title, text].filter(Boolean).join('\n\n');
    const ok = await writeClipboard(value);
    showNotice(ok ? 'Note copied' : 'Copy nahi ho saka');
  };

  const handleDelete = (entry) => {
    const label = captureDisplayTitle(entry, secrets[entry.id]);
    if (
      !window.confirm(
        `"${label}" trash mein move karein?\n\nActive list se hat jayega. Trash se restore kar sakte hain.`,
      )
    ) {
      return;
    }
    trashCaptureEntry(entry.id);
    if (editingId === entry.id) closeForm();
  };

  const handlePurge = (entry) => {
    const label = captureDisplayTitle(entry, secrets[entry.id]);
    if (
      !window.confirm(
        `"${label}" hamesha delete karein?\n\nYe Trash se bhi wapas nahi aayega.`,
      )
    ) {
      return;
    }
    removeCaptureEntry(entry.id);
    if (editingId === entry.id) closeForm();
  };

  const syncLine = !online
    ? 'Offline. Notes is device par save hain aur connection aate hi account ke sath sync ho jayengi.'
    : cloud?.user
      ? 'Is device par save, aur aap ke account ke sath sync hoti hain.'
      : 'Is device par save. Laptop aur mobile par sync ke liye Sync & Backup se sign in karein.';

  const needsPassphrase = form.vault && !vaultKey;

  return (
    <div className="space-y-6">
      <GlassCard className="border-violet-500/20 bg-violet-500/5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/15">
              <StickyNote className="h-5 w-5 text-violet-300" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white">Important Notes</h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                Meeting points, reminders, references, aur personal notes — Task Log, Dak, aur
                Contacts se alag.
              </p>
            </div>
          </div>
          {vaultMeta ? (
            <button
              type="button"
              onClick={() => {
                if (vaultKey) {
                  setVaultKey(null);
                  showNotice('Vault locked');
                  return;
                }
                setUnlockError('');
                setUnlockPass('');
                setUnlockOpen(true);
              }}
              className={`${actionClass} self-start border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`}
            >
              {vaultKey ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {vaultKey ? 'Lock vault' : 'Unlock vault'}
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={openNew}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            New Note
          </button>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <TextInput
              id="note-search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search title or note…"
              aria-label="Search notes"
              className="pl-9"
            />
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">{syncLine}</p>
        {notice ? (
          <p className="mt-2 text-xs text-violet-200" role="status">
            {notice}
          </p>
        ) : null}
      </GlassCard>

      <GlassCard className="p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'active', label: `Active Notes (${counts.active})` },
            { id: 'archived', label: `Archived Notes (${counts.archived})` },
            { id: 'trash', label: `Trash (${counts.trash})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilter(tab.id);
                setPage(1);
                closeMenu();
              }}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                filter === tab.id
                  ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">{showingLabel}</p>
        {query.trim() && lockedInFilter ? (
          <p className="mt-2 text-xs text-amber-200/90">
            {lockedInFilter} locked vault {lockedInFilter === 1 ? 'note' : 'notes'} search mein
            shamil nahi. Pehle vault unlock karein.
          </p>
        ) : null}

        {total === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center px-4 py-12 text-center">
            <StickyNote className="mb-3 h-10 w-10 text-zinc-600" strokeWidth={1.25} />
            <p className="text-sm font-medium text-zinc-400">
              {query.trim()
                ? 'Koi note match nahi hua'
                : filter === 'archived'
                  ? 'Koi archived note nahi'
                  : filter === 'trash'
                    ? 'Trash khali hai'
                    : 'Abhi koi note save nahi'}
            </p>
            {!query.trim() && filter === 'active' ? (
              <p className="mt-1 max-w-sm text-xs text-zinc-600">
                New Note se pehli zaroori baat save karein.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {pageItems.map((entry) => {
                const secret = secrets[entry.id];
                const locked = Boolean(entry.vault && !secret);
                const title = locked ? '' : secret?.title || entry.title || '';
                const body = locked ? '' : secret?.text || entry.text || '';
                const status = captureStatus(entry.status);
                const menuItems = [];
                if (!locked) {
                  menuItems.push({
                    id: 'copy',
                    label: 'Copy',
                    icon: <Copy className="h-3.5 w-3.5" />,
                    onSelect: () => handleCopy(entry),
                  });
                }
                if (status === 'active') {
                  menuItems.push({
                    id: 'archive',
                    label: 'Archive',
                    icon: <Archive className="h-3.5 w-3.5" />,
                    onSelect: () => completeCaptureEntry(entry.id),
                  });
                }
                if (status === 'archived') {
                  menuItems.push({
                    id: 'pin',
                    label: entry.pinned ? 'Unpin' : 'Pin',
                    icon: entry.pinned ? (
                      <PinOff className="h-3.5 w-3.5" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    ),
                    onSelect: () => setCapturePinned(entry.id, !entry.pinned),
                  });
                }
                if (status === 'trash') {
                  menuItems.push({
                    id: 'purge',
                    label: 'Delete forever',
                    danger: true,
                    icon: <Trash2 className="h-3.5 w-3.5" />,
                    onSelect: () => handlePurge(entry),
                  });
                } else {
                  menuItems.push({
                    id: 'delete',
                    label: 'Delete',
                    danger: true,
                    icon: <Trash2 className="h-3.5 w-3.5" />,
                    onSelect: () => handleDelete(entry),
                  });
                }

                return (
                  <li
                    key={entry.id}
                    className={`rounded-xl border p-4 ${
                      entry.pinned
                        ? 'border-violet-400/35 bg-violet-500/[0.07]'
                        : status === 'trash'
                          ? 'border-white/5 bg-white/[0.02] opacity-80'
                          : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {title.trim() ? (
                          <p className="font-medium text-zinc-100">{title.trim()}</p>
                        ) : locked ? (
                          <p className="font-medium text-zinc-100">Encrypted vault note</p>
                        ) : null}
                        {entry.pinned ? (
                          <span className="rounded-md border border-violet-400/30 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-200">
                            Pinned
                          </span>
                        ) : null}
                        {entry.vault ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                            <ShieldCheck className="h-3 w-3" />
                            Vault
                          </span>
                        ) : null}
                      </div>
                      {locked ? (
                        <p className="mt-2 text-sm text-zinc-400">
                          Locked. Unlock the vault to read this note.
                        </p>
                      ) : (
                        <p
                          className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                            title.trim() ? 'mt-2 text-zinc-300' : 'font-medium text-zinc-100'
                          }`}
                        >
                          {body}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-zinc-500">{noteTimes(entry)}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {status !== 'trash' ? (
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className={`${actionClass} border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      ) : null}
                      {status === 'active' ? (
                        <button
                          type="button"
                          onClick={() => setCapturePinned(entry.id, !entry.pinned)}
                          className={`${actionClass} border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10`}
                        >
                          {entry.pinned ? (
                            <PinOff className="h-3.5 w-3.5" />
                          ) : (
                            <Pin className="h-3.5 w-3.5" />
                          )}
                          {entry.pinned ? 'Unpin' : 'Pin'}
                        </button>
                      ) : null}
                      {status !== 'active' ? (
                        <button
                          type="button"
                          onClick={() => restoreCaptureEntry(entry.id)}
                          className={`${actionClass} border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                      ) : null}
                      <NoteMenu
                        open={menuId === entry.id}
                        onClose={closeMenu}
                        onToggle={() => setMenuId((id) => (id === entry.id ? '' : entry.id))}
                        items={menuItems}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <ListPager
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              showingLabel={showingLabel}
              className="mt-4"
            />
          </>
        )}
      </GlassCard>

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingId ? 'Edit note' : 'New Note'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormField label="Title (optional)" id="note-title" hint="List mein pehle dikhega">
            <TextInput
              id="note-title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. DG meeting points"
              autoComplete="off"
            />
          </FormField>
          <FormField label="Note / Description *" id="note-text" error={errors.text}>
            <TextArea
              id="note-text"
              rows={5}
              value={form.text}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, text: e.target.value }));
                setErrors((prev) => ({ ...prev, text: undefined }));
              }}
              placeholder="Apni zaroori baat yahan likhein…"
            />
          </FormField>
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-violet-500"
              checked={form.vault}
              onChange={(e) => setForm((prev) => ({ ...prev, vault: e.target.checked }))}
            />
            <span>
              <span className="font-medium text-zinc-100">Encrypted vault</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                Passwords aur sensitive credentials ke liye. Note is device par passphrase se
                encrypt hota hai. Passphrase khud save nahi hoti, aur bhool jane par note wapas
                nahi khulega.
              </span>
            </span>
          </label>
          {needsPassphrase && !vaultMeta ? (
            <>
              <FormField
                label="New vault passphrase"
                id="vault-pass"
                error={errors.passphrase}
                hint={`Kam az kam ${MIN_VAULT_PASSPHRASE} characters. Sirf aap ko yaad rakhna hai.`}
              >
                <TextInput
                  id="vault-pass"
                  type="password"
                  value={passphrase}
                  autoComplete="new-password"
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </FormField>
              <FormField label="Confirm passphrase" id="vault-pass-2" error={errors.passphrase2}>
                <TextInput
                  id="vault-pass-2"
                  type="password"
                  value={passphrase2}
                  autoComplete="new-password"
                  onChange={(e) => setPassphrase2(e.target.value)}
                />
              </FormField>
            </>
          ) : null}
          {needsPassphrase && vaultMeta ? (
            <FormField
              label="Vault passphrase"
              id="vault-pass"
              error={errors.passphrase}
              hint="Vault unlock karke yeh note encrypt hoga."
            >
              <TextInput
                id="vault-pass"
                type="password"
                value={passphrase}
                autoComplete="current-password"
                onChange={(e) => setPassphrase(e.target.value)}
              />
            </FormField>
          ) : null}
          {form.vault && vaultKey ? (
            <p className="text-xs text-emerald-300/90">Vault unlocked — yeh note encrypt hokar save hoga.</p>
          ) : null}
          {errors.form ? <p className="text-xs text-rose-400">{errors.form}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {editingId ? 'Save changes' : 'Save Note'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={unlockOpen} onClose={() => setUnlockOpen(false)} title="Unlock vault">
        <form onSubmit={handleUnlock} className="space-y-4">
          <p className="text-xs leading-relaxed text-zinc-500">
            Passphrase is device ki memory mein rehti hai jab tak aap lock na karein ya page reload
            na ho. Cloud par sirf encrypted note jata hai.
          </p>
          <FormField label="Vault passphrase" id="unlock-pass" error={unlockError}>
            <TextInput
              id="unlock-pass"
              type="password"
              value={unlockPass}
              autoComplete="current-password"
              onChange={(e) => setUnlockPass(e.target.value)}
            />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
            >
              Unlock
            </button>
            <button
              type="button"
              onClick={() => setUnlockOpen(false)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
