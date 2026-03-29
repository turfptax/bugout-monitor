import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class PlanErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('PlanTab crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <div className="bg-surface-2 border border-threat-red/30 rounded-lg p-6">
            <h2 className="text-lg font-bold text-threat-red mb-3">
              ⚠️ Plan Tab Error
            </h2>
            <p className="text-text-dim text-sm mb-4">
              The Plan tab encountered an error loading your data. This usually happens when
              saved data has an unexpected format. You can try:
            </p>
            <div className="space-y-2 text-sm mb-4">
              <p className="text-text-primary">
                1. <strong>Reload the page</strong> — this often fixes transient errors
              </p>
              <p className="text-text-primary">
                2. <strong>Clear Plan data</strong> — resets rally points, comms, routes, shelter, and contacts
              </p>
              <p className="text-text-primary">
                3. <strong>Export a backup first</strong> (Settings → Backup) before clearing data
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-accent text-bg rounded text-sm font-semibold cursor-pointer hover:opacity-90"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  // Clear plan-specific localStorage keys that might be corrupted
                  ['bugout-rally', 'bugout-routes', 'bugout-comms', 'bugout-shelter', 'bugout-contacts'].forEach(
                    (key) => localStorage.removeItem(key)
                  );
                  this.setState({ hasError: false, error: null });
                }}
                className="px-4 py-2 bg-surface border border-border text-text-primary rounded text-sm cursor-pointer hover:bg-surface-2"
              >
                Reset Plan Data
              </button>
            </div>
            <details className="mt-4">
              <summary className="text-text-dim text-xs cursor-pointer">Error details</summary>
              <pre className="mt-2 text-xs text-threat-red bg-bg p-3 rounded overflow-x-auto">
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
