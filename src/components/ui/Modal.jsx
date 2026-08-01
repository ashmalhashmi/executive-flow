import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Glassmorphism modal overlay — scrollable on mobile, safe-area aware.
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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto overscroll-contain p-3 pb-[calc(0.75rem+var(--safe-bottom))] pt-[calc(0.75rem+var(--safe-top))] sm:items-center sm:p-4 sm:pb-4 sm:pt-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={[
          'relative z-10 w-full max-w-[calc(100vw-1.5rem-var(--safe-left)-var(--safe-right))]',
          'max-h-[min(92dvh,calc(100dvh-var(--safe-top)-var(--safe-bottom)-1.5rem))]',
          'overflow-y-auto overscroll-contain',
          'rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl sm:max-h-[90dvh] sm:p-6',
          sizes[size] ?? sizes.md,
        ].join(' ')}
      >
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
          <h2 id="modal-title" className="text-lg font-semibold leading-snug text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
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
