"""Generate large sample PDFs for the PDF Viewer performance sample.

Usage:
    pip install reportlab
    python scripts/generate_samples.py

Creates:
    public/samples/large-10000-pages.pdf      (10,000 pages, default document)
    public/samples/text-heavy-5000-pages.pdf  (5,000 dense text pages, for search)
"""
import os
import random

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "samples")

WORDS = (
    "the service provider shall deliver all documents within the agreed period and "
    "the customer agrees to review each invoice report contract clause schedule "
    "performance quality payment delivery warranty liability confidential notice "
    "termination renewal section party obligation data security support license"
).split()


def sentence(rng: random.Random, n: int) -> str:
    words = [rng.choice(WORDS) for _ in range(n)]
    words[0] = words[0].capitalize()
    return " ".join(words) + "."


def build(path: str, pages: int, lines_per_page: int, seed: int, title: str) -> None:
    rng = random.Random(seed)
    width, height = A4
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle(title)
    c.setAuthor("Syncfusion PDF Viewer performance sample")
    for p in range(1, pages + 1):
        if p % 100 == 1:
            c.bookmarkPage(f"p{p}")
            c.addOutlineEntry(f"Pages {p} - {min(p + 99, pages)}", f"p{p}", level=0)
        c.setFont("Helvetica-Bold", 20)
        c.drawString(56, height - 70, f"{title}")
        c.setFont("Helvetica", 11)
        c.drawString(56, height - 92, f"Page {p:,} of {pages:,}")
        c.line(56, height - 100, width - 56, height - 100)
        c.setFont("Helvetica", 10)
        y = height - 124
        for _ in range(lines_per_page):
            c.drawString(56, y, sentence(rng, rng.randint(9, 13)))
            y -= 14
        c.setFont("Helvetica", 9)
        c.drawCentredString(width / 2, 30, f"- {p:,} -")
        c.showPage()
    c.save()
    print(f"{path}: {os.path.getsize(path) / 1e6:.1f} MB")


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    build(os.path.join(OUT_DIR, "large-10000-pages.pdf"), 10000, 12, 1, "Large document")
    build(os.path.join(OUT_DIR, "text-heavy-5000-pages.pdf"), 5000, 48, 2, "Text-heavy document")
