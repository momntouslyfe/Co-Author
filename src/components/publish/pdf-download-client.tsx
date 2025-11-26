'use client';

import { ReactElement } from 'react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Eye } from 'lucide-react';

type PDFDownloadClientProps = {
  document: ReactElement;
  fileName: string;
  onPreview?: () => void;
};

export function PDFDownloadClient({ document, fileName, onPreview }: PDFDownloadClientProps) {
  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading }: any) => (
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

export function PDFViewerClient({ document }: { document: ReactElement }) {
  return (
    <PDFViewer width="100%" height="100%" className="rounded-lg">
      {document}
    </PDFViewer>
  );
}
