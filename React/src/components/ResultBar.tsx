import type { PerfAction, PerfResult } from '../hooks/usePerfTimer';

const PENDING_TEXT: Record<PerfAction, string> = {
  load: 'Opening document…',
  download: 'Preparing download…',
  print: 'Preparing to print…',
  search: 'Searching…',
  navigation: 'Moving to page…',
};

interface ResultBarProps {
  result: PerfResult | null;
  pending: PerfAction | null;
}

/** The single message bar that shows how long the last viewer action took. */
export function ResultBar({ result, pending }: ResultBarProps) {
  const isPending = pending !== null;
  const text = isPending
    ? PENDING_TEXT[pending]
    : (result?.message ?? 'Use the toolbar to open, search, navigate, print, or download. Each action is timed.');

  return (
    <div className={`result-bar ${isPending ? 'is-pending' : result ? 'is-done' : ''}`} role="status" aria-live="polite">
      <span className="result-icon" aria-hidden="true">
        {isPending ? <span className="spinner" /> : '⚡'}
      </span>
      <span className="result-text">{text}</span>
    </div>
  );
}
