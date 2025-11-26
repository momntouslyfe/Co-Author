'use client';

import { useState, useEffect } from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import { Loader2 } from 'lucide-react';
import { PDFDocument, PDFDocumentProps } from './pdf-document';
import { registerFonts } from '@/lib/publish/fonts';

type PDFViewerInnerProps = {
  documentProps: PDFDocumentProps;
};

export default function PDFViewerInner({ documentProps }: PDFViewerInnerProps) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    registerFonts().then(() => setFontsReady(true));
  }, []);

  if (!fontsReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading fonts...</p>
      </div>
    );
  }

  return (
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
}
