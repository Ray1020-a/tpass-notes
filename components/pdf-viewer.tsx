"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function PdfViewer({ fileUrl, fileName }: { fileUrl: string; fileName?: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-foreground bg-muted p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))} disabled={pageNumber <= 1} className="rounded-lg border-2 border-foreground bg-card px-3 py-1 font-mono text-sm font-bold shadow-[2px_2px_0_0_var(--color-foreground)] disabled:opacity-40">&lt;</button>
          <span className="font-mono text-sm font-bold">{pageNumber} / {numPages}</span>
          <button onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))} disabled={pageNumber >= numPages} className="rounded-lg border-2 border-foreground bg-card px-3 py-1 font-mono text-sm font-bold shadow-[2px_2px_0_0_var(--color-foreground)] disabled:opacity-40">&gt;</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))} className="rounded-lg border-2 border-foreground bg-card px-2 py-1 font-mono text-xs font-bold shadow-[2px_2px_0_0_var(--color-foreground)]">-</button>
          <span className="font-mono text-sm font-bold">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((prev) => Math.min(2, prev + 0.1))} className="rounded-lg border-2 border-foreground bg-card px-2 py-1 font-mono text-xs font-bold shadow-[2px_2px_0_0_var(--color-foreground)]">+</button>
        </div>
      </div>
      <div className="flex justify-center rounded-xl border-2 border-foreground bg-card p-4">
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="py-8 text-center font-semibold text-muted-foreground">載入中…</div>} error={<div className="py-8 text-center font-semibold text-destructive">無法載入 PDF</div>}>
          <Page pageNumber={pageNumber} scale={scale} renderTextLayer={true} renderAnnotationLayer={true} />
        </Document>
      </div>
    </div>
  );
}
