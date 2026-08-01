import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCaptureExecutive } from '../context/ExecutiveContext';

export default function CaptureInbox() {
  const { captureEntries, addCaptureEntry, completeCaptureEntry, removeCaptureEntry } =
    useCaptureExecutive();

  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const inbox = useMemo(
    () =>
      captureEntries
        .filter((entry) => entry.status === 'active')
        .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)),
    [captureEntries],
  );

  const capture = () => {
    const value = text.trim();
    if (!value) return;
    addCaptureEntry({ text: value, bucket: 'captured' });
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          capture();
        }}
        className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/95 pb-5 pt-1 backdrop-blur-md"
      >
        <div className="flex items-stretch gap-3">
          <input
            ref={inputRef}
            id="capture-input"
            type="text"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="Likho…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/50 px-4 py-4 text-lg text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/30 focus:ring-2 focus:ring-white/10"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Capture"
            className="flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-2xl bg-white text-3xl font-light text-zinc-950 shadow-lg shadow-white/10 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-16 sm:w-16"
          >
            <Plus className="h-8 w-8" strokeWidth={2} />
          </button>
        </div>
      </form>

      <section className="flex-1 pt-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Inbox</h2>
          <span className="text-xs text-zinc-600">{inbox.length}</span>
        </div>

        {inbox.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-600">Khali</p>
        ) : (
          <ul>
            {inbox.map((entry) => (
              <li
                key={entry.id}
                className="group flex items-center gap-3 border-b border-white/5 py-3.5"
              >
                <button
                  type="button"
                  onClick={() => completeCaptureEntry(entry.id)}
                  className="h-5 w-5 shrink-0 rounded-full border border-zinc-600 hover:border-zinc-400"
                  aria-label="Done"
                />
                <p className="min-w-0 flex-1 text-base text-zinc-100">{entry.text}</p>
                <button
                  type="button"
                  onClick={() => removeCaptureEntry(entry.id)}
                  className="shrink-0 p-1 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:text-zinc-400 sm:opacity-40"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
