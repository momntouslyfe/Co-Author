'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { PDFDocumentProps } from './pdf-document';

type PDFViewerWrapperProps = {
  documentProps: PDFDocumentProps;
};

export function PDFViewerWrapper({ documentProps }: PDFViewerWrapperProps) {
  const [ViewerComponent, setViewerComponent] = useState<React.ReactNode>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        const { BlobProvider } = await import('@react-pdf/renderer');
        const { PDFDocument } = await import('./pdf-document');

        if (mounted) {
          setViewerComponent(
            <BlobProvider document={<PDFDocument {...documentProps} />}>
              {({ blob, loading, error }) => {
                if (loading) {
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
                      <p className="text-destructive">Failed to generate preview: {error.message}</p>
                    </div>
                  );
                }

                if (!blob) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <p className="text-muted-foreground">No PDF content available</p>
                    </div>
                  );
                }

                const url = URL.createObjectURL(blob);
                
                return (
                  <iframe
                    src={url}
                    className="w-full h-full rounded-lg border"
                    title="PDF Preview"
                  />
                );
              }}
            </BlobProvider>
          );
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading PDF components:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [documentProps]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading viewer...</p>
      </div>
    );
  }

  return <>{ViewerComponent}</>;
}
