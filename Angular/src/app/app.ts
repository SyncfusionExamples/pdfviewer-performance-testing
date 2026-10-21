import { AfterViewInit, Component, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import {
  PdfViewerComponent, PdfViewerModule, LinkAnnotationService, BookmarkViewService, MagnificationService,
  ThumbnailViewService, ToolbarService, NavigationService, TextSearchService, TextSelectionService,
  PrintService, FormDesignerService, FormFieldsService, AnnotationService, PageOrganizerService,
} from '@syncfusion/ej2-angular-pdfviewer';
import { IDLE_TEXT, PENDING_TEXT, PerfMonitor, PerfState, PdfViewerLike } from './perf-monitor';
import { registerLicense } from '@syncfusion/ej2-base';

registerLicense('YOUR-LICENSE-KEY');

@Component({
  selector: 'app-root',
  imports: [PdfViewerModule],
  providers: [
    LinkAnnotationService, BookmarkViewService, MagnificationService, ThumbnailViewService, ToolbarService,
    NavigationService, TextSearchService, TextSelectionService, PrintService, FormDesignerService,
    FormFieldsService, AnnotationService, PageOrganizerService,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('pdfviewer') viewer!: PdfViewerComponent;

  /** Default document and PDFium engine files, both served from this app (see angular.json assets). */
  readonly documentPath = `${window.location.origin}/samples/1000 pages.pdf`;
  readonly resourceUrl = `${window.location.origin}/ej2-pdfviewer-lib`;

  /** Latest measurement shown in the result bar. */
  readonly state = signal<PerfState>({ pending: null, message: null });

  /** Times every toolbar action. The first load is timed from this moment (component creation). */
  readonly monitor = new PerfMonitor((s) => this.state.set(s));

  readonly isPending = computed(() => this.state().pending !== null);
  readonly isDone = computed(() => !this.isPending() && this.state().message !== null);
  readonly text = computed(() => {
    const { pending, message } = this.state();
    return pending ? PENDING_TEXT[pending] : (message ?? IDLE_TEXT);
  });

  ngAfterViewInit(): void {
    // Viewer events are bound in app.html; the monitor also listens to toolbar input (search box, Open).
    this.monitor.connect(this.viewer as unknown as PdfViewerLike);
    // The first document starts loading as soon as the viewer is created; open the
    // load stopwatch now so `onDocumentLoad` can close it.
    this.monitor.start('load');
  }

  ngOnDestroy(): void {
    this.monitor.destroy();
  }
}
