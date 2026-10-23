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
            Stream? stream = typeof(App).GetTypeInfo().Assembly.GetManifestResourceStream("PerformanceWithout.100Mb_file.pdf");
            pdfViewer.DocumentLoaded += PdfViewer_DocumentLoaded;
            stopwatch.Start();
            pdfViewer.LoadDocument(stream);
            pdfViewer.PrintDocumentCompleted += PdfViewer_PrintDocumentCompleted;
        }

        private void PdfViewer_PrintDocumentCompleted(object? sender, Syncfusion.Maui.PdfViewer.PrintDocumentCompletedEventArgs e)
        {
            
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
            Stream? stream = typeof(App).GetTypeInfo().Assembly.GetManifestResourceStream("PerformanceWithout.100Mb_file.pdf");
            stopwatch.Restart();
            pdfViewer.LoadDocument(stream);
        }
        private void Button_Clicked3(object sender, EventArgs e)
        {
            pdfViewer.UnloadDocument();
            Stream? stream = typeof(App).GetTypeInfo().Assembly.GetManifestResourceStream("PerformanceWithout.JUTA 01 SO13 I.etapa-I.NP část A200x200pdf 2.pdf");
            stopwatch.Restart();
            pdfViewer.LoadDocument(stream);
        }

        private void Button_Clicked4(object sender, EventArgs e)
        {
            MemoryStream mStream = new MemoryStream();
            pdfViewer.SaveDocument(mStream);
            //File.WriteAllBytes("D://ModifiedPDF.pdf", mStream.ToArray());
            stopwatch.Restart();
            pdfViewer.LoadDocument(mStream);
        }
    }
}
