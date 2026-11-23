/** Client-side vault for Important Notes. The passphrase never leaves this device. */

const STORAGE_KEY = 'executive_flow_notes_vault';
const CHECK_TEXT = 'executive-flow-notes-vault-ok';
const DEFAULT_ITERATIONS = 150000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const MIN_VAULT_PASSPHRASE = 8;

function bytesToB64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function b64ToBytes(value) {
  const binary = atob(String(value || ''));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function normalizeNotesVaultMeta(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const salt = String(raw.salt || '').trim();
  const iv = String(raw.iv || '').trim();
  const check = String(raw.check || '').trim();
  const iterations = Number(raw.iterations) || 0;
  if (!salt || !iv || !check || iterations < 10000) return null;
  return {
    v: 1,
    kdf: 'PBKDF2-SHA-256',
    iterations,
    salt,
    iv,
    check,
  };
}

export function normalizeNoteVaultBlob(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const iv = String(raw.iv || '').trim();
  const cipher = String(raw.cipher || '').trim();
  if (!iv || !cipher) return null;
  return { v: 1, iv, cipher };
}

export function loadNotesVaultMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeNotesVaultMeta(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveNotesVaultMeta(meta) {
  const next = normalizeNotesVaultMeta(meta);
  if (!next) return null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota or private mode */
  }
  return next;
}

async function deriveKey(passphrase, saltBytes, iterations) {
  const base = await crypto.subtle.importKey('raw', textEncoder.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptString(key, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(value));
  return { iv: bytesToB64(iv), cipher: bytesToB64(cipher) };
}

async function decryptString(key, ivB64, cipherB64) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(ivB64) },
    key,
    b64ToBytes(cipherB64),
  );
  return textDecoder.decode(plain);
}

/** Create the vault check record. Returns { meta, key }. */
export async function createNotesVault(passphrase) {
  const secret = String(passphrase || '');
  if (secret.length < MIN_VAULT_PASSPHRASE) {
    throw new Error(`Passphrase kam az kam ${MIN_VAULT_PASSPHRASE} characters ka ho`);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(secret, salt, DEFAULT_ITERATIONS);
  const sealed = await encryptString(key, CHECK_TEXT);
  const meta = saveNotesVaultMeta({
    v: 1,
    kdf: 'PBKDF2-SHA-256',
    iterations: DEFAULT_ITERATIONS,
    salt: bytesToB64(salt),
    iv: sealed.iv,
    check: sealed.cipher,
  });
  return { meta, key };
}

/** Confirm a passphrase against the synced vault check. Returns a CryptoKey or null. */
export async function unlockNotesVault(passphrase, meta = loadNotesVaultMeta()) {
  const record = normalizeNotesVaultMeta(meta);
  if (!record) return null;
  const secret = String(passphrase || '');
  if (!secret) return null;
  try {
    const key = await deriveKey(secret, b64ToBytes(record.salt), record.iterations);
    const plain = await decryptString(key, record.iv, record.check);
    return plain === CHECK_TEXT ? key : null;
  } catch {
    return null;
  }
}

export async function encryptNoteSecret(key, { title = '', text = '' } = {}) {
  if (!key) throw new Error('Vault locked hai');
  const sealed = await encryptString(key, JSON.stringify({ title: String(title), text: String(text) }));
  return { v: 1, iv: sealed.iv, cipher: sealed.cipher };
}

export async function decryptNoteSecret(key, blob) {
  const vault = normalizeNoteVaultBlob(blob);
  if (!key || !vault) return null;
  try {
    const plain = await decryptString(key, vault.iv, vault.cipher);
    const parsed = JSON.parse(plain);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      title: String(parsed.title || ''),
      text: String(parsed.text || ''),
    };
  } catch {
    return null;
  }
}
