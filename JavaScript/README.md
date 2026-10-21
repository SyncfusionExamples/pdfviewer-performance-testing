# Syncfusion JavaScript (ES6) PDF Viewer – performance sample

The standard PDF Viewer with one message bar above it. Every toolbar action (open, navigate,
search, download, print) is timed automatically from the viewer's own events.

Built following the [JavaScript (ES6) getting started guide](https://help.syncfusion.com/document-processing/pdf/pdf-viewer/javascript-es6/getting-started):
webpack + TypeScript (same setup as the Syncfusion webpack quickstart), `@syncfusion/ej2-pdfviewer` 35.1.41,
`PdfViewer.Inject(...)`, Tailwind 3 theme.

## Run

```bash
npm install
npm start            # webpack dev server, http://localhost:4000
```

For demos, use a production build (realistic numbers):

```bash
npm run build
npx serve dist
```

- Sample PDFs are in `public/samples` and the PDFium engine files are copied from `node_modules` by webpack.
- License: paste your key in `src/app.ts` (`SYNCFUSION_LICENSE_KEY`) to remove the trial banner.

## Code

| File | Purpose |
|---|---|
| `src/index.html` | Result bar and viewer container |
| `src/app.ts` | Creates the viewer and the monitor, renders the result bar |
| `src/perf-monitor.ts` | Timing logic (same file as the Angular sample) |

See the top-level README for what is measured and how.
