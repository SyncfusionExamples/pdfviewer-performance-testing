import { useMemo } from 'react';
import { PerfPdfViewer } from './components/PerfPdfViewer';
import { ResultBar } from './components/ResultBar';
import { usePerfTimer } from './hooks/usePerfTimer';

export default function App() {
  const { result, pending, start, finish, cancel, isRunning } = usePerfTimer();
  // Stable object, so result updates re-render only the result bar, never the viewer.
  const timer = useMemo(() => ({ start, finish, cancel, isRunning }), [start, finish, cancel, isRunning]);

  return (
    <div className="app">
      <ResultBar result={result} pending={pending} />
      <div className="viewer-host">
        <PerfPdfViewer timer={timer} />
      </div>
    </div>
  );
}
