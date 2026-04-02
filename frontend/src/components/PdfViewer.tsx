import { useState, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use the CDN worker to avoid bundling issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  onPageClick?: (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => void;
  renderOverlay?: (pageNumber: number, pageWidth: number, pageHeight: number) => React.ReactNode;
  className?: string;
  cursorClass?: string;
}

export default function PdfViewer({
  url,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  onPageClick,
  renderOverlay,
  className,
  cursorClass,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
    onTotalPagesChange(total);
  }, [onTotalPagesChange]);

  // Measure container width for responsive page sizing
  const measureWidth = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setPageWidth(Math.min(entry.contentRect.width, 900));
        }
      });
      observer.observe(node);
      setPageWidth(Math.min(node.clientWidth, 900));
      containerRef.current = node;
    }
  }, []);

  return (
    <div ref={measureWidth} className={className}>
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-sm text-muted-foreground">Loading PDF...</div>
          </div>
        }
        error={
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-destructive">Failed to load PDF</div>
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
          <div
            key={pageNum}
            className={`relative mb-2 ${cursorClass || ''}`}
            data-page={pageNum}
            onClick={(e) => onPageClick?.(e, pageNum)}
          >
            <Page
              pageNumber={pageNum}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
            {/* Per-page overlay for signatures */}
            {renderOverlay && (
              <div className="absolute inset-0 pointer-events-none">
                {renderOverlay(pageNum, pageWidth, 0)}
              </div>
            )}
            {/* Page number label */}
            <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/50 bg-card/80 px-1.5 py-0.5 rounded">
              {pageNum}
            </div>
          </div>
        ))}
      </Document>
    </div>
  );
}
