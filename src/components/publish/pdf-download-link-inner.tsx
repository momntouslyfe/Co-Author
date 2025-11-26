'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { PDFDocument, PDFDocumentProps } from './pdf-document';

type PDFDownloadLinkInnerProps = {
  documentProps: PDFDocumentProps;
  fileName: string;
};

export default function PDFDownloadLinkInner({ documentProps, fileName }: PDFDownloadLinkInnerProps) {
  return (
    <PDFDownloadLink
      document={<PDFDocument {...documentProps} />}
      fileName={fileName}
      style={{ width: '100%', display: 'block' }}
    >
      {({ loading, error }) => (
        <Button className="w-full gap-2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : error ? (
            <>Error: {error.message}</>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export PDF
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
