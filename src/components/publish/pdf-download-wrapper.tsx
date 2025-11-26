'use client';

import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import type { PDFDocumentProps } from './pdf-document';

const PDFDownloadLinkWrapper = dynamic(
  () => import('./pdf-download-link-inner'),
  {
    ssr: false,
    loading: () => (
      <Button className="w-full gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    ),
  }
);

type PDFDownloadWrapperProps = {
  documentProps: PDFDocumentProps;
  fileName: string;
};

export function PDFDownloadWrapper({ documentProps, fileName }: PDFDownloadWrapperProps) {
  return <PDFDownloadLinkWrapper documentProps={documentProps} fileName={fileName} />;
}
