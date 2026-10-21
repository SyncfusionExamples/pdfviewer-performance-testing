# Syncfusion Blazor PDF Viewer – performance sample (Interactive Server)

The standard `SfPdfViewer2` with one message bar above it. Toolbar actions are timed from the
viewer's own events (`PdfViewerEvents`).

Built following the [Blazor Web App getting started guide](https://help.syncfusion.com/document-processing/pdf/pdf-viewer/blazor/getting-started/web-app):
Blazor Web App, **Interactive Server** render mode (prerendering off, so the load timer starts once),
`Syncfusion.Blazor.SfPdfViewer` and `Syncfusion.Blazor.Themes` 35.1.37, Bootstrap 5 theme.

> **Not yet built or run.** This sample was written without access to a .NET SDK or NuGet, so it
> hasn't been compiled or tested. The other four samples were tested in a browser. Please build it
> and report any errors so they can be fixed.

## Run

```bash
dotnet run          # http://localhost:5100
```

- Target framework is `net10.0`. Change `TargetFramework` in the `.csproj` to `net9.0` or `net8.0` if needed.
- Sample PDFs are in `wwwroot/samples` (`large-10000-pages.pdf` loads by default).
- License: paste your key in `Program.cs` (`SyncfusionLicenseKey`) to remove the trial banner.
- Timing messages are also written to the server console.

## How Blazor timing differs from the JavaScript platforms

| Action | Start | Stop |
|---|---|---|
| Load | Page component created (server) | `DocumentLoaded` |
| Open (toolbar or drag and drop) | `DocumentUnloaded` (the old document closes) | `DocumentLoaded` |
| Download | `DownloadStart` | `DownloadEnd` |
| Print | `PrintStart` | `PrintEnd` |
| Search | `OnTextSearchStart` | `OnTextSearchComplete`; first match = first `OnTextSearchHighlight` |
| Navigation | User's click, key press, or scroll (browser, `wwwroot/perf.js`) | `PageChanged` handled (includes the server round trip) |

Limits to check when testing:

- `SfPdfViewer2` has no "page drawn" event, so navigation time is "until the server handled the page change", not "until the page image is shown".
- In the JavaScript viewer, the search start event fires at the first match and the complete event doesn't fire after every search. If Blazor behaves the same, the search message may be missing or too short.
- The Blazor events don't give a match count, so the search message has no count.
