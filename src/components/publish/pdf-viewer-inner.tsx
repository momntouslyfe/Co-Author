'use client';

import { BlobProvider } from '@react-pdf/renderer';
import { Loader2 } from 'lucide-react';
import { PDFDocument, PDFDocumentProps } from './pdf-document';

type PDFViewerInnerProps = {
  documentProps: PDFDocumentProps;
};

export default function PDFViewerInner({ documentProps }: PDFViewerInnerProps) {
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
