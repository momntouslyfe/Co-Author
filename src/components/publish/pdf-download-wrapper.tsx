'use client';

import { ReactElement } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';

type PDFDownloadWrapperProps = {
  document: ReactElement;
  fileName: string;
};

export default function PDFDownloadWrapper({ document, fileName }: PDFDownloadWrapperProps) {
  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading }) => (
        <Button className="w-full gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {loading ? 'Generating...' : 'Export PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
