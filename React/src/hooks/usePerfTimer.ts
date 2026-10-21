import { useCallback, useRef, useState } from 'react';

/** The viewer actions this sample measures. */
export type PerfAction = 'load' | 'download' | 'print' | 'search' | 'navigation';

export interface PerfResult {
  action: PerfAction;
  /** Measured duration in milliseconds. */
  ms: number;
  /** Text shown in the result bar. */
  message: string;
}

/** Formats a duration for display: "85 ms" or "1.62 seconds". */
export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} seconds`;
}

/** Formats a number with thousands separators: 10000 -> "10,000". */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Small stopwatch for viewer actions.
 *
 * start(action)  -> remembers the start time (performance.now()).
 * finish(action) -> computes the elapsed time and publishes the result message.
 *
 * Only one measurement per action runs at a time; starting again restarts it.
 */
export function usePerfTimer() {
  const starts = useRef<Partial<Record<PerfAction, number>>>({});
  const [result, setResult] = useState<PerfResult | null>(null);
  const [pending, setPending] = useState<PerfAction | null>(null);

  const start = useCallback((action: PerfAction, at: number = performance.now()) => {
    starts.current[action] = at;
    setPending(action);
  }, []);

  const isRunning = useCallback((action: PerfAction) => starts.current[action] !== undefined, []);

  const cancel = useCallback((action: PerfAction) => {
    delete starts.current[action];
    setPending((current) => (current === action ? null : current));
  }, []);

  const finish = useCallback(
    (action: PerfAction, describe: (duration: string) => string, at: number = performance.now()) => {
      const startedAt = starts.current[action];
      if (startedAt === undefined) return null;
      delete starts.current[action];
      const ms = Math.max(0, at - startedAt);
      const next: PerfResult = { action, ms, message: describe(formatDuration(ms)) };
      setResult(next);
      setPending((current) => (current === action ? null : current));
      // Also log to the console, handy when recording demos or comparing runs.
      console.info(`[PDF Viewer performance] ${next.message}`);
      return ms;
    },
    [],
  );

  return { result, pending, start, finish, cancel, isRunning };
}

export type PerfTimer = ReturnType<typeof usePerfTimer>;
