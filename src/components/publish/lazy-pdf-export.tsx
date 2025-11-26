'use client';

import { useState, useCallback, createElement } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { registerFonts } from '@/lib/publish/fonts';
import { EditorStyles } from '@/lib/publish/content-transformer';
import { AuthorProfile } from '@/lib/definitions';
import { TemplateStyles } from '@/lib/publish/templates';

interface LazyPDFExportProps {
  bookTitle: string;
  chapters: { id: string; title: string; partTitle: string; content: string }[];
  styles: Partial<EditorStyles>;
  showTOC: boolean;
  authorProfile?: AuthorProfile;
  coverImageUrl?: string;
  templateStyles?: TemplateStyles;
}

export function LazyPDFExport({
  bookTitle,
  chapters,
  styles,
  showTOC,
  authorProfile,
  coverImageUrl,
  templateStyles,
}: LazyPDFExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      await registerFonts();

      const reactPdf = await import('@react-pdf/renderer');
      const pdfDocModule = await import('@/components/publish/pdf-document');

      const defaultStyles: EditorStyles = {
        chapterTitleFont: 'Poppins',
        chapterTitleSize: 24,
        chapterTitleColor: '#1a1a1a',
        subtopicFont: 'Open Sans',
        subtopicSize: 14,
        subtopicColor: '#333333',
        bodyFont: 'Open Sans',
        bodySize: 11,
        bodyColor: '#2d2d2d',
        headerFont: 'Open Sans',
        headerSize: 9,
        headerColor: '#666666',
        footerFont: 'Open Sans',
        footerSize: 9,
        footerColor: '#666666',
      };

      const mergedStyles: EditorStyles = {
        ...defaultStyles,
        ...styles,
      };

      const documentProps = {
        bookTitle,
        chapters,
        styles: mergedStyles,
        showTOC,
        selectedChapterIds: chapters.map(c => c.id),
        authorProfile,
        coverImageUrl,
        templateStyles,
      };

      const PDFDocument = pdfDocModule.PDFDocument;
      const documentElement = createElement(PDFDocument, documentProps) as any;
      const blob = await reactPdf.pdf(documentElement).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${bookTitle.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [bookTitle, chapters, styles, showTOC, authorProfile, coverImageUrl, templateStyles]);

  return (
    <div>
      <Button 
        className="gap-2" 
        onClick={handleExport}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export PDF
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}

export default LazyPDFExport;
