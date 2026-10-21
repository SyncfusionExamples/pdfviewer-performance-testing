# Syncfusion React PDF Viewer – performance sample

A marketing sample that shows how fast the Syncfusion React PDF Viewer is.
The screen is just the standard PDF Viewer and one message bar above it.
Every action done with the viewer's own toolbar is timed automatically. Example messages
(measured in a headless cloud test browser without a GPU, so a desktop machine will usually be faster):

- Opened large-10000-pages.pdf (10,000 pages) in 6.01 seconds
- Moved to page 9,999 of 10,000 in 355 ms
- Found 3,123 matches for "invoice" in 1,000 pages in 914 ms (first match in 106 ms)
- Downloaded 10,000 pages in 72 ms
- Ready to print 1,000 pages in 1.83 seconds

Built with Vite, React, and TypeScript, following the
[React PDF Viewer getting started guide](https://help.syncfusion.com/document-processing/pdf/pdf-viewer/react/getting-started)
(standalone, client-side rendering with PDFium).

## Run it

```bash
npm install        # also copies the PDFium engine into public/ej2-pdfviewer-lib
npm run dev        # http://localhost:5173
```

For demos and recordings, use the production build, which gives realistic numbers:

```bash
npm run build
npm run preview    # http://localhost:4173
```

The sample PDFs are already in `public/samples`. To recreate them, run `npm run samples` (needs Python and `pip install reportlab`).

| File | Pages | Use it for |
|---|---|---|
| `large-10000-pages.pdf` | 10,000 | Loaded by default. Load, navigation, download |
| `text-heavy-5000-pages.pdf` | 5,000 | Open it with the toolbar Open button to show search on dense text |

**License:** without a license key the viewer shows the Syncfusion trial banner. To remove it, create a `.env` file containing `VITE_SYNCFUSION_LICENSE_KEY=your-key` and restart.

## What is measured

Timing uses `performance.now()`. Each measurement starts and stops at these points:

| Action | User does | Timer starts | Timer stops |
|---|---|---|---|
| Load | Page opens (default document) | Viewer created | `documentLoad` |
| Open | Toolbar Open, or drag and drop a PDF | File chosen or dropped | `documentLoad` |
| Download | Toolbar Download | `downloadStart` | `downloadEnd` |
| Print | Toolbar Print | `printStart` | `printEnd` (document ready, print dialog about to open) |
| Search | Type a term in the search box, press Enter | Enter pressed | All pages searched (search box spinner hides). First match = `textSearchStart` |
| Search, no match | Same | Enter pressed | Viewer shows its "No matches" dialog |
| Navigation | Page number box, next or previous, first or last, thumbnails, bookmarks, scrolling | The click or key press (or `pageChange`) | Target page image is drawn (`pageRenderComplete`, or immediately if already drawn) |

Each result is also written to the browser console (`[PDF Viewer performance] …`).

### Notes on the viewer events (version 34.2.9)

- `textSearchStart` fires when the **first match is found**, not when the search starts.
- `textSearchComplete` does not fire at the end of every search, so the sample watches the search box spinner instead.
- A page that was drawn before gives no `pageRenderComplete` when you return to it, so the sample also checks whether the page image is already on screen.
- Pressing Enter again with the same term moves to the next match. That isn't timed as a new search.

## Project structure

```
src/
  main.tsx                     optional license registration, app start
  App.tsx                      result bar + viewer
  app.css                      layout and result bar styles
  components/
    ResultBar.tsx              the single message bar
    PerfPdfViewer.tsx          PDF Viewer, event handlers, timing logic
  hooks/
    usePerfTimer.ts            start/finish stopwatch and message formatting
scripts/
  copy-pdfium.mjs              copies pdfium.js / pdfium.wasm into public (postinstall)
  generate_samples.py          creates the sample PDFs
public/samples/                sample PDFs
```

## Tips for recording demos

- Use `npm run preview` (production build) in a normal desktop Chrome window.
- Reload the page before each recording, so the first load is measured fresh.
- Times depend on the machine. Quote the device and browser along with any numbers you publish.
