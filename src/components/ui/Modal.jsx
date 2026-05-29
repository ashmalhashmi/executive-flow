import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Glassmorphism modal overlay — backdrop blur + centered panel.
 */
export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    md: 'max-w-lg',
    lg: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-[calc(1rem+var(--safe-bottom))] sm:items-center sm:pb-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={[
          'relative w-full rounded-2xl border border-white/10 bg-zinc-900/95 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-6',
          sizes[size] ?? sizes.md,
        ].join(' ')}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
