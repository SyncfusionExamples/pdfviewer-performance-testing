using System.Diagnostics;
using System.Reflection;

namespace PerformanceWithout
{
    public partial class MainPage : ContentPage
    {
        Stopwatch stopwatch = new Stopwatch();
        public MainPage()
        {
            InitializeComponent();
            Stream? stream = typeof(App).GetTypeInfo().Assembly.GetManifestResourceStream("PerformanceWithout.PDF_Succinctly.pdf");
            pdfViewer.DocumentLoaded += PdfViewer_DocumentLoaded;
            stopwatch.Start();
            pdfViewer.LoadDocument(stream);
        }

        private async void PdfViewer_DocumentLoaded(object? sender, EventArgs? e)
        {
            stopwatch.Stop();
            await DisplayAlertAsync("Time taken", $"Total time taken for loading document {stopwatch.Elapsed.Milliseconds} ms", "Ok");
        }

        private void Button_Clicked(object sender, EventArgs e)
        {
            pdfViewer.UnloadDocument();
            var button = sender as Button;
            if (button == null)
                return;



            Stream? stream = typeof(App).GetTypeInfo().Assembly
                .GetManifestResourceStream($"PerformanceWithout.{button.Text}.pdf");

            if (stream != null)
            {
                stopwatch.Restart();
                pdfViewer.LoadDocument(stream);
            }
        }

        private void Button_Clicked1(object sender, EventArgs e)
        {
            pdfViewer.UnloadDocument();
            Stream? stream = typeof(App).GetTypeInfo().Assembly.GetManifestResourceStream("PerformanceWithout.10mb.pdf");
            stopwatch.Restart();
            pdfViewer.LoadDocument(stream);
        }
        private void Button_Clicked2(object sender, EventArgs e)
        {
            pdfViewer.UnloadDocument();
            Stream? stream = typeof(App).GetTypeInfo().Assembly.GetManifestResourceStream("PerformanceWithout.PDF_Succinctly.pdf");
            stopwatch.Restart();
            pdfViewer.LoadDocument(stream);
        }

        private void Button_Clicked4(object sender, EventArgs e)
        {
            MemoryStream mStream = new MemoryStream();
            pdfViewer.SaveDocument(mStream);
            stopwatch.Restart();
            pdfViewer.LoadDocument(mStream);
        }
    }
}
