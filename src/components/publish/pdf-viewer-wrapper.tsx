'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { PDFDocumentProps } from './pdf-document';

type PDFViewerWrapperProps = {
  documentProps: PDFDocumentProps;
};

export function PDFViewerWrapper({ documentProps }: PDFViewerWrapperProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const generatePdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { pdf } = await import('@react-pdf/renderer');
        const { PDFDocument } = await import('./pdf-document');
        
        const doc = <PDFDocument {...documentProps} />;
        const blob = await pdf(doc).toBlob();
        
        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
        }
      } catch (err) {
        console.error('Error generating PDF preview:', err);
        if (isMounted) {
          setError('Failed to generate preview. Please try exporting directly.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    generatePdf();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentProps]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Generating preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!pdfUrl) {
    return null;
  }

  return (
    <iframe
      src={pdfUrl}
      className="w-full h-full rounded-lg border"
      title="PDF Preview"
    />
  );
}
