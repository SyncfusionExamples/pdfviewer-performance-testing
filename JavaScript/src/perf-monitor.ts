/**
 * PDF Viewer performance monitor (framework independent).
 *
 * Times the standard toolbar actions of the Syncfusion PDF Viewer from its own events:
 * load / open, download, print, text search, and page navigation.
 * Every finished measurement produces one message, for example
 * "Moved to page 9,999 of 10,000 in 85 ms".
 *
 * Usage:
 *   const monitor = new PerfMonitor(state => render(state));
 *   monitor.attach(viewer);            // plain JS/TS: subscribes to the viewer events
 *   // or wire the public on...() handlers to the viewer events yourself (Angular templates).
 */

export type PerfAction = 'load' | 'download' | 'print' | 'search' | 'navigation';

export interface PerfState {
  /** Action currently being measured, or null. */
  pending: PerfAction | null;
  /** Latest result message, or null before the first result. */
  message: string | null;
}

/** The parts of the PDF Viewer instance the monitor uses. */
export interface PdfViewerLike {
  element: HTMLElement;
  pageCount: number;
  addEventListener(eventName: string, handler: (args: any) => void): void;
  removeEventListener(eventName: string, handler: (args: any) => void): void;
}

/** A click or key press this recent (ms) counts as the start of a page change. */
const INTERACTION_WINDOW_MS = 1000;
/** Stop waiting for a page to appear after this long (ms). */
const NAVIGATION_TIMEOUT_MS = 15000;
/**
 * `textSearchHighlight` does not expose a "this is the final highlight" flag, so
 * the stopwatch is finalized by debounce: every highlight resets the timer, and
 * when no new highlight arrives within this window the search is treated as
 * complete. If the timer fires before any highlight has arrived, the search
 * returned no matches.
 */
const SEARCH_FINALIZE_DELAY_MS = 300;

export const PENDING_TEXT: Record<PerfAction, string> = {
  load: 'Opening document…',
  download: 'Preparing download…',
  print: 'Preparing to print…',
  search: 'Searching…',
  navigation: 'Moving to page…',
};

export const IDLE_TEXT = 'Use the toolbar to open, search, navigate, print, or download. Each action is timed.';

/** "85 ms" or "1.62 seconds". */
export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} seconds`;
}

/** 10000 -> "10,000". */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export class PerfMonitor {
  private viewer: PdfViewerLike | null = null;
  private viewerId = '';
  private readonly starts: Partial<Record<PerfAction, number>> = {};
  private state: PerfState = { pending: null, message: null };

  private lastInteraction = 0;
  private navigationTarget: number | null = null;
  private search = { term: '', startedAt: 0, firstMatchAt: 0, matchCount: 0, finalizeTimer: 0 };
  private subscriptions: Array<[string, (args: any) => void]> = [];
  private domCleanup: Array<() => void> = [];

  /**
   * @param onChange      Called whenever the pending action or the result message changes.
   * @param loadStartedAt Start time of the first document load (default: now).
   */
  constructor(private readonly onChange: (state: PerfState) => void, loadStartedAt: number = performance.now()) {
    this.start('load', loadStartedAt);
  }

  // ------------------------------------------------------------------ setup

  /** Subscribes to the viewer events and DOM interactions. Call once the viewer is created. */
  attach(viewer: PdfViewerLike): void {
    this.connect(viewer);
    const events: Array<[string, (args: any) => void]> = [
      ['documentLoad', this.onDocumentLoad],
      ['downloadStart', this.onDownloadStart],
      ['downloadEnd', this.onDownloadEnd],
      ['printStart', this.onPrintStart],
      ['printEnd', this.onPrintEnd],
      ['pageChange', this.onPageChange],
      ['pageRenderComplete', this.onPageRenderComplete],
      ['textSearchStart', this.onTextSearchStart],
      ['textSearchHighlight', this.onTextSearchHighlight],
    ];
    events.forEach(([name, handler]) => viewer.addEventListener(name, handler));
    this.subscriptions = events;
  }

  /**
   * Gives the monitor the viewer instance and listens to DOM interactions, without
   * subscribing to viewer events (use when the framework binds the events, e.g. Angular).
   */
  connect(viewer: PdfViewerLike): void {
    this.viewer = viewer;
    this.viewerId = viewer.element.id;
    this.listenToDom();
  }

  destroy(): void {
    window.clearTimeout(this.search.finalizeTimer);
    if (this.viewer) {
      this.subscriptions.forEach(([name, handler]) => this.viewer!.removeEventListener(name, handler));
    }
    this.subscriptions = [];
    this.domCleanup.forEach((off) => off());
    this.domCleanup = [];
  }

  // ------------------------------------------------------------------ stopwatch

  private start(action: PerfAction, at: number = performance.now()): void {
    this.starts[action] = at;
    this.emit({ pending: action });
  }

  private isRunning(action: PerfAction): boolean {
    return this.starts[action] !== undefined;
  }

  private cancel(action: PerfAction): void {
    delete this.starts[action];
    if (this.state.pending === action) this.emit({ pending: null });
  }

  private finish(action: PerfAction, describe: (duration: string) => string): void {
    const startedAt = this.starts[action];
    if (startedAt === undefined) return;
    delete this.starts[action];
    const message = describe(formatDuration(performance.now() - startedAt));
    console.info(`[PDF Viewer performance] ${message}`);
    this.emit({ message, pending: this.state.pending === action ? null : this.state.pending });
  }

  private emit(change: Partial<PerfState>): void {
    this.state = { ...this.state, ...change };
    this.onChange(this.state);
  }

  private pageCount(): number {
    return this.viewer?.pageCount ?? 0;
  }

  // ------------------------------------------------------------------ load / open

  onDocumentLoad = (args: { documentName?: string }): void => {
    this.navigationTarget = null;
    this.finish('load', (d) => `Opened ${args.documentName ?? 'document'} (${formatNumber(this.pageCount())} pages) in ${d}`);
  };

  private beginLoad(): void {
    this.navigationTarget = null;
    this.cancel('navigation');
    window.clearTimeout(this.search.finalizeTimer);
    this.search.finalizeTimer = 0;
    this.search.term = '';
    this.cancel('search');
    this.start('load');
  }

  // ------------------------------------------------------------------ download

  onDownloadStart = (): void => this.start('download');

  onDownloadEnd = (): void => {
    this.finish('download', (d) => `Downloaded ${formatNumber(this.pageCount())} pages in ${d}`);
  };

  // ------------------------------------------------------------------ print

  onPrintStart = (): void => this.start('print');

  onPrintEnd = (): void => {
    this.finish('print', (d) => `Ready to print ${formatNumber(this.pageCount())} pages in ${d}`);
  };

  // ------------------------------------------------------------------ navigation

  /** True when the page image is already drawn (for example, a page visited before). */
  private isPageDrawn(pageNumber: number): boolean {
    const img = document.getElementById(`${this.viewerId}_pageCanvas_${pageNumber - 1}`) as HTMLImageElement | null;
    return !!img && !!img.getAttribute('src') && img.complete && img.naturalWidth > 0;
  }

  private finishNavigation(pageNumber: number): void {
    this.navigationTarget = null;
    this.finish('navigation', (d) => `Moved to page ${formatNumber(pageNumber)} of ${formatNumber(this.pageCount())} in ${d}`);
  }

  onPageChange = (args: { currentPageNumber: number }): void => {
    if (this.isRunning('load')) return; // page changes while a document opens are part of the load
    const now = performance.now();
    // Start from the user's click or key press when there was one, otherwise from the event.
    const startedAt = now - this.lastInteraction <= INTERACTION_WINDOW_MS ? this.lastInteraction : now;
    this.start('navigation', startedAt);
    const target = args.currentPageNumber;
    this.navigationTarget = target;
    // Pages drawn before are reused without a pageRenderComplete event, so also
    // check every frame until the page image is shown.
    const check = () => {
      if (this.navigationTarget !== target) return; // finished, or a newer page change
      if (this.isPageDrawn(target)) {
        this.finishNavigation(target);
      } else if (performance.now() - now < NAVIGATION_TIMEOUT_MS) {
        requestAnimationFrame(check);
      } else {
        this.navigationTarget = null;
        this.cancel('navigation');
      }
    };
    requestAnimationFrame(check);
  };

  onPageRenderComplete = (args: { data?: { pageNumber?: number } }): void => {
    const rendered = Number(args.data?.pageNumber); // 1-based page number
    if (this.navigationTarget !== null && rendered === this.navigationTarget) this.finishNavigation(rendered);
  };

  // ------------------------------------------------------------------ text search
  // The whole measurement rides on two viewer events:
  //   textSearchStart      → open the stopwatch, remember the term, arm the finalize timer
  //   textSearchHighlight  → count every match, stamp the first-match time,
  //                          and reset the finalize timer; when no further highlight
  //                          arrives within SEARCH_FINALIZE_DELAY_MS, the stopwatch is
  //                          closed and the popup message is emitted.
  // The debounce is necessary because the event payload does not include a
  // "final highlight" flag, so we infer completion from "no more highlights after
  // the last one for a short while". matchCount === 0 when the timer fires means
  // the search returned no matches.

  private finalizeSearch(): void {
    const { term, startedAt, firstMatchAt, matchCount } = this.search;
    this.search.finalizeTimer = 0;
    const pages = this.pageCount();
    const first = firstMatchAt !== 0
      ? ` (first match in ${formatDuration(firstMatchAt - startedAt)})`
      : '';
    if (matchCount === 0) {
      this.finish('search', (d) => `No matches for "${term}" in ${formatNumber(pages)} pages (searched in ${d})`);
    } else {
      this.finish('search', (d) => `Found ${formatNumber(matchCount)} matches for "${term}" in ${formatNumber(pages)} pages in ${d}${first}`);
    }
  }

  private armFinalizeTimer(): void {
    window.clearTimeout(this.search.finalizeTimer);
    this.search.finalizeTimer = window.setTimeout(() => this.finalizeSearch(), SEARCH_FINALIZE_DELAY_MS);
  }

  onTextSearchStart = (args: { searchText: string }): void => {
    const now = performance.now();
    this.search.term = args.searchText;
    this.search.startedAt = now;
    this.search.firstMatchAt = 0;
    this.search.matchCount = 0;
    this.armFinalizeTimer();
    this.start('search', now);
  };

  onTextSearchHighlight = (args: { searchText: string }): void => {
    this.search.term = args.searchText;
    this.search.matchCount += 1;
    if (this.search.firstMatchAt === 0) {
      this.search.firstMatchAt = performance.now();
    }
    this.armFinalizeTimer();
  };

  // ------------------------------------------------------------------ DOM listeners

  /** Moments the viewer has no event for: toolbar Open, drag and drop, user input. */
  private listenToDom(): void {
    this.domCleanup.forEach((off) => off());
    const fileInputId = `${this.viewerId}_fileUploadElement`;

    const onKeyDown = () => { this.lastInteraction = performance.now(); };
    const onPointerDown = () => { this.lastInteraction = performance.now(); };
    const onChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.id === fileInputId && input.files && input.files.length > 0) this.beginLoad();
    };
    const onWheel = () => { this.lastInteraction = performance.now(); };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer && e.dataTransfer.files.length > 0) this.beginLoad();
    };

    const root = this.viewer!.element;
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('change', onChange, true);
    root.addEventListener('wheel', onWheel, { capture: true, passive: true });
    root.addEventListener('drop', onDrop, true);
    this.domCleanup = [
      () => document.removeEventListener('keydown', onKeyDown, true),
      () => document.removeEventListener('pointerdown', onPointerDown, true),
      () => document.removeEventListener('change', onChange, true),
      () => root.removeEventListener('wheel', onWheel, true),
      () => root.removeEventListener('drop', onDrop, true),
    ];
  }
}