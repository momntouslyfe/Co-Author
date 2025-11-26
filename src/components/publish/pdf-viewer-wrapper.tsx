'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { PDFDocumentProps } from './pdf-document';

const PDFViewerInner = dynamic(
  () => import('./pdf-viewer-inner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading viewer...</p>
      </div>
    ),
  }
);

type PDFViewerWrapperProps = {
  documentProps: PDFDocumentProps;
};

export function PDFViewerWrapper({ documentProps }: PDFViewerWrapperProps) {
  return <PDFViewerInner documentProps={documentProps} />;
}
