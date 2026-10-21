import { memo, useCallback, useEffect, useRef } from 'react';
import {
  PdfViewerComponent, Toolbar, Magnification, Navigation, Annotation, LinkAnnotation,
  BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, FormFields, FormDesigner,
  PageOrganizer, Inject,
} from '@syncfusion/ej2-react-pdfviewer';
import type {
  LoadEventArgs, PageChangeEventArgs, PageRenderCompleteEventArgs,
  TextSearchHighlightEventArgs, TextSearchStartEventArgs,
} from '@syncfusion/ej2-react-pdfviewer';
import { formatDuration, formatNumber } from '../hooks/usePerfTimer';
import type { PerfTimer } from '../hooks/usePerfTimer';

/** Element id of the viewer. The viewer builds its toolbar element ids from it. */
const VIEWER_ID = 'container';

/** Default document, served from public/samples. */
const DEFAULT_DOCUMENT = `${window.location.origin}/samples/1000 pages.pdf`;

/** PDFium engine files, copied from node_modules into public/ by `npm install`. */
const RESOURCE_URL = `${window.location.origin}/ej2-pdfviewer-lib`;

/** A click or key press this recent (ms) counts as the start of a page change. */
const INTERACTION_WINDOW_MS = 1000;

/** Stop waiting for a page to appear after this long (ms). */
const NAVIGATION_TIMEOUT_MS = 15000;

/**
 * `textSearchHighlight` does not expose a "this is the final highlight" flag in this
 * package version, so the stopwatch is finalized by debounce: every highlight resets
 * the timer, and when no new highlight arrives within this window the search is
 * treated as complete. If the timer fires before any highlight has arrived, the
 * search returned no matches.
 */
const SEARCH_FINALIZE_DELAY_MS = 300;

interface PerfPdfViewerProps {
  /** Stopwatch functions from usePerfTimer (all stable, so the viewer never re-renders). */
  timer: Pick<PerfTimer, 'start' | 'finish' | 'cancel' | 'isRunning'>;
}

/**
 * The standard Syncfusion PDF Viewer with its built-in toolbar.
 * Nothing is added to the viewer UI: every action is timed from the viewer's own events.
 */
export const PerfPdfViewer = memo(function PerfPdfViewer({ timer }: PerfPdfViewerProps) {
  const viewerRef = useRef<PdfViewerComponent>(null);
  const { start, finish, cancel, isRunning } = timer;

  // The first document starts loading as soon as the viewer is created.
  const createdAt = useRef(performance.now());
  useEffect(() => {
    start('load', createdAt.current);
  }, [start]);

  // State used while measuring (refs, so updates never re-render the viewer).
  const lastInteraction = useRef(0);
  const navigationTarget = useRef<number | null>(null);
  const search = useRef({
    term: '',
    startedAt: 0,
    firstMatchAt: 0,
    matchCount: 0,
    finalizeTimer: 0,
  });

  const viewer = () => viewerRef.current;
  const pageCount = () => viewer()?.pageCount ?? 0;

  // ---------- Document load (first load, toolbar Open, drag and drop) ----------

  const onDocumentLoad = useCallback((args: LoadEventArgs) => {
    navigationTarget.current = null;
    finish('load', (d) => `Opened ${args.documentName} (${formatNumber(pageCount())} pages) in ${d}`);
  }, [finish]);

  // ---------- Download ----------

  const onDownloadStart = useCallback(() => start('download'), [start]);
  const onDownloadEnd = useCallback(() => {
    finish('download', (d) => `Downloaded ${formatNumber(pageCount())} pages in ${d}`);
  }, [finish]);

  // ---------- Print ----------

  const onPrintStart = useCallback(() => start('print'), [start]);
  const onPrintEnd = useCallback(() => {
    finish('print', (d) => `Ready to print ${formatNumber(pageCount())} pages in ${d}`);
  }, [finish]);

  // ---------- Page navigation ----------

  /** True when the page image is already drawn (for example, a page visited before). */
  const isPageDrawn = (pageNumber: number) => {
    const img = document.getElementById(`${VIEWER_ID}_pageCanvas_${pageNumber - 1}`) as HTMLImageElement | null;
    return !!img && !!img.getAttribute('src') && img.complete && img.naturalWidth > 0;
  };

  const finishNavigation = useCallback((pageNumber: number) => {
    navigationTarget.current = null;
    finish('navigation', (d) => `Moved to page ${formatNumber(pageNumber)} of ${formatNumber(pageCount())} in ${d}`);
  }, [finish]);

  const onPageChange = useCallback((args: PageChangeEventArgs) => {
    if (isRunning('load')) return; // page changes while a document opens are part of the load
    const now = performance.now();
    const sinceInteraction = now - lastInteraction.current;
    // Start from the user's click or key press when there was one, otherwise from the event.
    start('navigation', sinceInteraction <= INTERACTION_WINDOW_MS ? lastInteraction.current : now);
    const target = args.currentPageNumber;
    navigationTarget.current = target;
    // Pages drawn before (for example, page 1 after a jump) are reused without a
    // pageRenderComplete event, so also check every frame until the page image is shown.
    const watchStartedAt = now;
    const check = () => {
      if (navigationTarget.current !== target) return; // finished, or a newer page change
      if (isPageDrawn(target)) {
        finishNavigation(target);
      } else if (performance.now() - watchStartedAt < NAVIGATION_TIMEOUT_MS) {
        requestAnimationFrame(check);
      } else {
        navigationTarget.current = null;
        cancel('navigation');
      }
    };
    requestAnimationFrame(check);
  }, [isRunning, start, cancel, finishNavigation]);

  const onPageRenderComplete = useCallback((args: PageRenderCompleteEventArgs) => {
    const data = args.data as { pageNumber?: number } | undefined;
    const rendered = Number(data?.pageNumber); // 1-based page number
    if (navigationTarget.current !== null && rendered === navigationTarget.current) {
      finishNavigation(rendered);
    }
  }, [finishNavigation]);

  // ---------- Text search ----------
  // The whole measurement rides on two viewer events:
  //   textSearchStart      → open the stopwatch, remember the term, arm the finalize timer
  //   textSearchHighlight  → count every match, stamp the first-match time,
  //                          and reset the finalize timer; when no further highlight
  //                          arrives within SEARCH_FINALIZE_DELAY_MS, the stopwatch is
  //                          closed and the popup message is emitted.
  // The debounce is necessary because the event payload in this package version does
  // not include a "final highlight" flag, so we infer completion from "no more
  // highlights after the last one for a short while". matchCount === 0 when the
  // timer fires means the search returned no matches.

  const finalizeSearch = useCallback(() => {
    const { term, startedAt, firstMatchAt, matchCount } = search.current;
    search.current.finalizeTimer = 0;
    const pages = pageCount();
    const first = firstMatchAt !== 0
      ? ` (first match in ${formatDuration(firstMatchAt - startedAt)})`
      : '';
    if (matchCount === 0) {
      finish('search', (d) => `No matches for "${term}" in ${formatNumber(pages)} pages (searched in ${d})`);
    } else {
      // finish('search', (d) => `Found ${formatNumber(matchCount)} matches for "${term}" in ${formatNumber(pages)} pages in ${d}${first}`);
      // In finalizeSearch, before formatting d:
      const rawDuration = performance.now() - startedAt;
      const duration = Math.max(0, rawDuration - SEARCH_FINALIZE_DELAY_MS);
      finish('search', (d) => `Found ${formatNumber(matchCount)} matches for "${term}" in ${formatNumber(pages)} pages in ${d}${first}`);
    }
  }, [finish]);

  const armFinalizeTimer = useCallback(() => {
    window.clearTimeout(search.current.finalizeTimer);
    search.current.finalizeTimer = window.setTimeout(finalizeSearch, SEARCH_FINALIZE_DELAY_MS);
  }, [finalizeSearch]);

  const onTextSearchStart = useCallback((args: TextSearchStartEventArgs) => {
    const now = performance.now();
    search.current.startedAt = now;
    search.current.firstMatchAt = 0;
    search.current.matchCount = 0;
    armFinalizeTimer();
    start('search', now);
  }, [start, armFinalizeTimer]);

  const onTextSearchHighlight = useCallback((args: TextSearchHighlightEventArgs) => {
    search.current.term = args.searchText;
    search.current.matchCount += 1;
    if (search.current.firstMatchAt === 0) {
      search.current.firstMatchAt = performance.now();
    }
    armFinalizeTimer();
  }, [armFinalizeTimer]);

  // ---------- DOM listeners for the moments the viewer has no event for ----------

  useEffect(() => {
    const fileInputId = `${VIEWER_ID}_fileUploadElement`;

    const onKeyDown = () => {
      lastInteraction.current = performance.now();
    };

    const onPointerDown = () => {
      lastInteraction.current = performance.now();
    };

    const onWheel = () => { lastInteraction.current = performance.now(); };

    // Toolbar "Open": the viewer opens a hidden file input; time from the moment a file is chosen.
    const onChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.id === fileInputId && input.files && input.files.length > 0) beginLoad();
    };

    // Drag and drop a PDF onto the viewer.
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer && e.dataTransfer.files.length > 0) beginLoad();
    };

    const beginLoad = () => {
      navigationTarget.current = null;
      cancel('navigation');
      window.clearTimeout(search.current.finalizeTimer);
      search.current.finalizeTimer = 0;
      cancel('search');
      start('load');
    };

    const root = document.getElementById(VIEWER_ID);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('change', onChange, true);
    root?.addEventListener('wheel', onWheel, { capture: true, passive: true });
    root?.addEventListener('drop', onDrop, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('change', onChange, true);
      root?.removeEventListener('wheel', onWheel, true);
      root?.removeEventListener('drop', onDrop, true);
      window.clearTimeout(search.current.finalizeTimer);
    };
  }, [start, cancel]);

  return (
    <PdfViewerComponent
      id={VIEWER_ID}
      ref={viewerRef}
      documentPath={DEFAULT_DOCUMENT}
      resourceUrl={RESOURCE_URL}
      style={{ height: '100%' }}
      documentLoad={onDocumentLoad}
      downloadStart={onDownloadStart}
      downloadEnd={onDownloadEnd}
      printStart={onPrintStart}
      printEnd={onPrintEnd}
      pageChange={onPageChange}
      pageRenderComplete={onPageRenderComplete}
      textSearchStart={onTextSearchStart}
      textSearchHighlight={onTextSearchHighlight}
    >
      <Inject
        services={[Toolbar, Magnification, Navigation, Annotation, LinkAnnotation, BookmarkView,
          ThumbnailView, Print, TextSelection, TextSearch, FormFields, FormDesigner, PageOrganizer]}
      />
    </PdfViewerComponent>
  );
});