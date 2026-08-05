import AskAnythingPanel from '../components/ask/AskAnything';

/** Dedicated Ask Anything room — Roman Urdu queries against live app data only. */
export default function AskAnythingPage({ onNavigate }) {
  return (
    <div className="space-y-6">
      <AskAnythingPanel onNavigate={onNavigate} />
    </div>
  );
}
