import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Search, ArrowRight, Loader2 } from 'lucide-react';
import {
  useCaptureExecutive,
  useContactsExecutive,
  useDakExecutive,
  useExpenditureExecutive,
  useMeetingsExecutive,
  useOrdersExecutive,
  useSouvenirsExecutive,
  useTasksExecutive,
} from '../../context/ExecutiveContext';
import { askAnything } from '../../utils/askAnything';
import GlassCard from '../ui/GlassCard';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function AskAnything({ onNavigate }) {
  const { meetings } = useMeetingsExecutive();
  const { taskEntries } = useTasksExecutive();
  const { orders } = useOrdersExecutive();
  const { dakEntries } = useDakExecutive();
  const { contacts } = useContactsExecutive();
  const { expenditures, expenditureOpeningBalance, expenditureOpeningBalanceDate } =
    useExpenditureExecutive();
  const { souvenirs } = useSouvenirsExecutive();
  const { captureEntries } = useCaptureExecutive();

  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [submitted, setSubmitted] = useState('');
  const recognitionRef = useRef(null);

  const data = useMemo(
    () => ({
      meetings,
      tasks: taskEntries,
      orders,
      dak: dakEntries,
      contacts,
      expenditures,
      souvenirs,
      captures: captureEntries,
      expenditureOpeningBalance,
      expenditureOpeningBalanceDate,
    }),
    [
      meetings,
      taskEntries,
      orders,
      dakEntries,
      contacts,
      expenditures,
      souvenirs,
      captureEntries,
      expenditureOpeningBalance,
      expenditureOpeningBalanceDate,
    ],
  );

  const result = useMemo(() => {
    if (!submitted.trim()) return null;
    return askAnything(submitted, data);
  }, [submitted, data]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const runSearch = (text) => {
    const next = String(text ?? query).trim();
    setQuery(next);
    setSubmitted(next);
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    setListening(false);
  };

  const startListening = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setVoiceError('Voice search is browser pe available nahi — type karein.');
      return;
    }
    setVoiceError('');
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setListening(true);
      recognition.onerror = () => {
        setListening(false);
        setVoiceError('Voice sun nahi saka — dubara try ya type karein.');
      };
      recognition.onend = () => setListening(false);
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
        const text = transcript.trim();
        if (!text) return;
        setQuery(text);
        if (event.results[event.results.length - 1].isFinal) {
          runSearch(text);
        }
      };
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError('Microphone start nahi hua — permissions check karein.');
    }
  };

  const toggleVoice = () => {
    if (listening) stopListening();
    else startListening();
  };

  return (
    <GlassCard className="mb-6 p-4 sm:p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15">
          <Search className="h-5 w-5 text-indigo-300" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Ask Anything</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Plain language — saari logs search. Type ya bolo. Category select ki zaroorat nahi.
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. “today’s meetings”, “pending tasks”, “contact Ali”'
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-4 pr-12 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            aria-label="Ask a plain language question"
          />
          <button
            type="button"
            onClick={toggleVoice}
            className={[
              'absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition',
              listening
                ? 'bg-rose-500/20 text-rose-300'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white',
            ].join(' ')}
            aria-label={listening ? 'Stop voice search' : 'Start voice search'}
            title={listening ? 'Listening… tap to stop' : 'Voice search'}
          >
            {listening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Ask
        </button>
      </form>

      {listening && (
        <p className="mt-2 flex items-center gap-2 text-xs text-rose-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Listening… bolo
        </p>
      )}
      {voiceError && <p className="mt-2 text-xs text-amber-300">{voiceError}</p>}

      {result && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90">
              Direct answer
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-100">{result.answer}</p>
            {result.best && (
              <button
                type="button"
                onClick={() => onNavigate?.(result.best.tab)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200"
              >
                Open {result.best.domain}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {result.hits.length > 0 && (
            <ul className="space-y-2">
              {result.hits.map((hit) => (
                <li key={`${hit.tab}-${hit.id}`}>
                  <button
                    type="button"
                    onClick={() => onNavigate?.(hit.tab)}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left hover:bg-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {hit.domain}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-zinc-100">{hit.title}</p>
                      {hit.snippet && (
                        <p className="mt-0.5 truncate text-xs text-zinc-500">{hit.snippet}</p>
                      )}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </GlassCard>
  );
}
