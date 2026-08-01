import { Component } from 'react';
import { recoverFromStalePwaCache } from '../../pwa/registerSW';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Executive Flow] render error', error, info);
  }

  handleRecover = () => {
    recoverFromStalePwaCache().catch(() => {
      window.location.reload();
    });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const message = String(this.state.error?.message || this.state.error || 'Unknown error');

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-300">
            App load error
          </p>
          <h1 className="mt-2 text-lg font-semibold text-white">Executive Flow refresh chahiye</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Mobile cache purani build pakad sakti hai. Neeche button se cache clear karke dubara
            try karein.
          </p>
          <p className="mt-3 break-all text-xs text-zinc-500">{message}</p>
          <button
            type="button"
            onClick={this.handleRecover}
            className="mt-6 w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Refresh app (cache clear)
          </button>
        </div>
      </div>
    );
  }
}
