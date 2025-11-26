'use client';

import { useState, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { PDFDocument, PDFDocumentProps } from './pdf-document';

type PDFDownloadWrapperProps = {
  documentProps: PDFDocumentProps;
  fileName: string;
};

export function PDFDownloadWrapper({ documentProps, fileName }: PDFDownloadWrapperProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const doc = <PDFDocument {...documentProps} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [documentProps, fileName]);

  return (
    <div className="space-y-2">
      <Button 
        className="w-full gap-2" 
        onClick={handleDownload}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isGenerating ? 'Generating PDF...' : 'Export PDF'}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
