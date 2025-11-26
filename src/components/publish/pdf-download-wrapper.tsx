'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { PDFDocumentProps } from './pdf-document';

type PDFDownloadWrapperProps = {
  documentProps: PDFDocumentProps;
  fileName: string;
};

export function PDFDownloadWrapper({ documentProps, fileName }: PDFDownloadWrapperProps) {
  const [DownloadComponent, setDownloadComponent] = useState<React.ReactNode>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadComponent = async () => {
      try {
        const { PDFDownloadLink } = await import('@react-pdf/renderer');
        const { PDFDocument } = await import('./pdf-document');
        
        if (mounted) {
          setDownloadComponent(
            <PDFDownloadLink
              document={<PDFDocument {...documentProps} />}
              fileName={fileName}
              style={{ width: '100%' }}
            >
              {({ loading, error }) => (
                <Button className="w-full gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating PDF...
                    </>
                  ) : error ? (
                    'Error generating PDF'
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
  }, [documentProps, fileName]);

  if (isLoading) {
    return (
      <Button className="w-full gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  return <>{DownloadComponent}</>;
}
