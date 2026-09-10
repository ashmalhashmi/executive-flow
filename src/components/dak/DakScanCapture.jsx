import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { extractDakWithAi } from '../../utils/dakAiExtract.js';

/**
 * Mobile: capture="environment" opens camera — photo stays in memory, gallery save not required.
 */
export default function DakScanCapture({ onExtracted, disabled = false }) {
  const cameraRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleFile = async (file) => {
    if (!file || busy) return;
    setBusy(true);
    setMessage('Photo cloud par save + AI scan…');
    try {
      const { rows, via, scanPhotoUrl, storageWarning } = await extractDakWithAi({ imageFile: file });
      onExtracted?.({ rows, via, scanPhotoUrl, storageWarning });
      setMessage(storageWarning || '');
    } catch (err) {
      setMessage(err.message || 'Scan fail — dobara try karein');
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2.5 text-sm font-medium text-violet-100 hover:bg-violet-500/25 ${
            disabled || busy ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {busy ? 'Scanning…' : 'Scan / Photo'}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={disabled || busy}
            onChange={handleChange}
          />
        </label>
        <p className="text-xs text-zinc-500">
          Camera seedha khulega — photo cloud par save hogi, sirf link register mein
        </p>
      </div>
      {message && <p className="text-sm text-amber-200/90">{message}</p>}
    </div>
  );
}
