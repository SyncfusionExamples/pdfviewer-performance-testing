# Syncfusion Angular PDF Viewer – performance sample

The standard PDF Viewer with one message bar above it. Every toolbar action (open, navigate,
search, download, print) is timed automatically from the viewer's own events, for example
"Found 3,123 matches for "invoice" in 1,000 pages in 869 ms (first match in 130 ms)".

Built following the [Angular getting started guide](https://help.syncfusion.com/document-processing/pdf/pdf-viewer/angular/getting-started):
Angular 21 (standalone component), `@syncfusion/ej2-angular-pdfviewer` 35.1.41, Tailwind 3 theme.

## Run

```bash
npm install
npm start            # ng serve, http://localhost:4200
```

For demos, use a production build (realistic numbers):

```bash
npm run build
npx serve dist/pdf-viewer-performance/browser
```

- Sample PDFs are in `public/samples` (`large-10000-pages.pdf` loads by default; open `text-heavy-5000-pages.pdf` with the toolbar Open button).
- PDFium engine files are copied from `node_modules` at build time (`angular.json` → assets).
- License: paste your key in `src/license.ts` to remove the trial banner.

## Code

| File | Purpose |
|---|---|
| `src/app/app.html` | Result bar + `<ejs-pdfviewer>` with its events bound to the monitor |
| `src/app/app.ts` | Component: services, signal state, connects the monitor |
| `src/app/perf-monitor.ts` | Timing logic (same file as the JavaScript ES6 sample) |

See the top-level README for what is measured and how.
