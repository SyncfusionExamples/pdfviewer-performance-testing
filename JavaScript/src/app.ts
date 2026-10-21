import { registerLicense } from '@syncfusion/ej2-base';
import {
  PdfViewer, Toolbar, Magnification, Navigation, Annotation, LinkAnnotation, ThumbnailView,
  BookmarkView, TextSelection, TextSearch, Print, FormFields, FormDesigner, PageOrganizer,
} from '@syncfusion/ej2-pdfviewer';
import { IDLE_TEXT, PENDING_TEXT, PerfMonitor, PerfState, PdfViewerLike } from './perf-monitor';
import './styles/styles.css';

/** Optional: paste your Syncfusion license key here to remove the trial banner. */
const SYNCFUSION_LICENSE_KEY = 'YOUR-LICENSE-KEY';
if (SYNCFUSION_LICENSE_KEY) registerLicense(SYNCFUSION_LICENSE_KEY);

// ---------- Result bar ----------

const bar = document.getElementById('result-bar')!;
const icon = bar.querySelector('.result-icon')!;
const text = bar.querySelector('.result-text')!;

function render({ pending, message }: PerfState): void {
  bar.classList.toggle('is-pending', pending !== null);
  bar.classList.toggle('is-done', pending === null && message !== null);
  icon.innerHTML = pending ? '<span class="spinner"></span>' : '⚡';
  text.textContent = pending ? PENDING_TEXT[pending] : (message ?? IDLE_TEXT);
}

// ---------- PDF Viewer ----------

// The first load is timed from this moment.
const monitor = new PerfMonitor(render);

PdfViewer.Inject(Toolbar, Magnification, Navigation, Annotation, LinkAnnotation, ThumbnailView,
  BookmarkView, TextSelection, TextSearch, Print, FormFields, FormDesigner, PageOrganizer);

const viewer = new PdfViewer({
  documentPath: `${window.location.origin}/samples/1000 pages.pdf`,
  resourceUrl: `${window.location.origin}/ej2-pdfviewer-lib`,
  height: '100%',
});
viewer.appendTo('#container');

// Subscribe to the viewer events and toolbar input.
monitor.attach(viewer as unknown as PdfViewerLike);
