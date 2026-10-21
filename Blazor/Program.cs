using PdfViewerPerformance.Components;
using Syncfusion.Blazor;

var builder = WebApplication.CreateBuilder(args);

// Optional: paste your Syncfusion license key here to remove the trial banner.
const string SyncfusionLicenseKey = "YOUR-LINCENSE-KEY";
if (!string.IsNullOrEmpty(SyncfusionLicenseKey))
{
    Syncfusion.Licensing.SyncfusionLicenseProvider.RegisterLicense(SyncfusionLicenseKey);
}

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Settings from the PDF Viewer getting started guide (Interactive Server mode).
builder.Services.AddSignalR(o => { o.MaximumReceiveMessageSize = 102400000; });
builder.Services.AddMemoryCache();
builder.Services.AddSyncfusionBlazor();

var app = builder.Build();

app.UseAntiforgery();
app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
