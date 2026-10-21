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
 * `textSearchHighlight` does not expose a "this is the final highlight" flag in this
 * package version, so the stopwatch is finalized by debounce: every highlight resets
 * the timer, and when no new highlight arrives within this window the search is
 * treated as complete. If the timer fires before any highlight has arrived, the
 * search returned no matches.
 */
const SEARCH_FINALIZE_DELAY_MS = 300;
 
/** Shown in the result bar before the first measurement has finished. */
export const IDLE_TEXT = 'Use the toolbar to open, search, navigate, print, or download. Each action is timed.';
 
export const PENDING_TEXT: Record<PerfAction, string> = {
  load: 'Opening document…',
  download: 'Preparing download…',
  print: 'Preparing to print…',
  search: 'Searching…',
  navigation: 'Changing page…',
};
 
export class PerfMonitor {
  private starts: Partial<Record<PerfAction, number>> = {};
  private subscriptions: [string, (args: any) => void][] = [];
  private domCleanup: (() => void)[] = [];
 
  private viewer?: PdfViewerLike;
  private viewerId = '';
 
  /** Latest interaction time used to align page navigation stopwatches. */
  private lastInteraction = 0;
  /** Page change we're waiting on, or null. */
  private navigationTarget: number | null = null;
  /** Per-search measurement state. */
  private search = {
    term: '',
    startedAt: 0,
    firstMatchAt: 0,
    matchCount: 0,
    finalizeTimer: 0,
  };
 
  private state: PerfState = { pending: null, message: null };
 
  /** Called whenever `state` changes; pass this from the constructor. */
  constructor(private readonly onChange: (state: PerfState) => void) {}
 
  /**
   * Subscribe to every viewer event this monitor uses. Plain JS/TS consumers
   * call this; Angular consumers wire the public on...() handlers to the
   * viewer events in the template.
   */
  attach(viewer: PdfViewerLike): void {
    this.viewer = viewer;
    this.viewerId = viewer.element.id;
    this.subscriptions.forEach(([name, handler]) => this.viewer!.addEventListener(name, handler));
    this.subscriptions = [
      ['documentLoad',        this.onDocumentLoad],
      ['downloadStart',       this.onDownloadStart],
      ['downloadEnd',         this.onDownloadEnd],
      ['printStart',          this.onPrintStart],
      ['printEnd',            this.onPrintEnd],
      ['pageChange',          this.onPageChange],
      ['pageRenderComplete',  this.onPageRenderComplete],
      ['textSearchStart',     this.onTextSearchStart],
      ['textSearchHighlight', this.onTextSearchHighlight],
    ];
    this.subscriptions.forEach(([name, handler]) => this.viewer!.addEventListener(name, handler));
    this.listenToDom();
  }
 
  /**
   * Subscribe the monitor to the events exposed by `viewer` without going through
   * `addEventListener`. Use when the framework already subscribes the events
   * (e.g. Angular template bindings).
   */
  connect(viewer: PdfViewerLike): void {
    this.viewer = viewer;
    this.viewerId = viewer.element.id;
    this.listenToDom();
  }
 
  destroy(): void {
    window.clearTimeout(this.search.finalizeTimer);
    this.search.finalizeTimer = 0;
    if (this.viewer) {
      this.subscriptions.forEach(([name, handler]) => this.viewer!.removeEventListener(name, handler));
    }
    this.subscriptions = [];
    this.domCleanup.forEach((off) => off());
    this.domCleanup = [];
  }
 
  // ------------------------------------------------------------------ stopwatch
 
    /**
   * Open a stopwatch for `action`. Public so the host can start the *initial* load
   * — the one that fires automatically when the viewer mounts, before any user action.
   */
  start(action: PerfAction, at: number = performance.now()): void {
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
  // The debounce is necessary because the event payload in this package version does
  // not include a "final highlight" flag, so we infer completion from "no more
  // highlights after the last one for a short while". matchCount === 0 when the
  // timer fires means the search returned no matches.
 
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
 
  onTextSearchStart = (args: { searchText?: string }): void => {
    const now = performance.now();
    this.search.term = args.searchText ?? '';
    this.search.startedAt = now;
    this.search.firstMatchAt = 0;
    this.search.matchCount = 0;
    this.armFinalizeTimer();
    this.start('search', now);
  };
 
  onTextSearchHighlight = (args: { searchText?: string }): void => {
    if (args.searchText) this.search.term = args.searchText;
    this.search.matchCount += 1;
    if (this.search.firstMatchAt === 0) {
      this.search.firstMatchAt = performance.now();
    }
    this.armFinalizeTimer();
  };
 
  // ------------------------------------------------------------------ DOM listeners
  // Moments the viewer has no event for: keyboard / pointer / wheel interaction
  // (used to align the navigation stopwatch), toolbar Open (file input change),
  // and drag-and-drop of a PDF.
 
  private listenToDom(): void {
    const fileInputId = `${this.viewerId}_fileUploadElement`;
 
    const onKeyDown = () => {
      this.lastInteraction = performance.now();
    };
    const onPointerDown = () => {
      this.lastInteraction = performance.now();
    };
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
 
// -------------------------------------------------------------------- formatting
 
/** Locale-aware duration formatter: "0 ms" → "59.999 s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 3 : 1)} s`;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m} m ${rem.toFixed(1)} s`;
}
 
/** Locale-aware thousands-separator for page/match counts. */
export function formatNumber(n: number): string {
  return n.toLocaleString();
}