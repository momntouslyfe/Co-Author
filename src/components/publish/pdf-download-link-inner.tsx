'use client';

import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Loader2, Download } from 'lucide-react';
import { PDFDocument, PDFDocumentProps } from './pdf-document';
import { registerFonts } from '@/lib/publish/fonts';
import { EditorStyles } from '@/lib/publish/content-transformer';
import { AuthorProfile } from '@/lib/definitions';
import { TemplateStyles } from '@/lib/publish/templates';

type SimplifiedPDFDownloadLinkInnerProps = {
  bookTitle: string;
  chapters: { id: string; title: string; partTitle: string; content: string }[];
  styles: Partial<EditorStyles>;
  showTOC: boolean;
  authorProfile?: AuthorProfile;
  coverImageUrl?: string;
  templateStyles?: TemplateStyles;
};

type LegacyPDFDownloadLinkInnerProps = {
  documentProps: PDFDocumentProps;
  fileName: string;
};

type PDFDownloadLinkInnerProps = SimplifiedPDFDownloadLinkInnerProps | LegacyPDFDownloadLinkInnerProps;

function isLegacyProps(props: PDFDownloadLinkInnerProps): props is LegacyPDFDownloadLinkInnerProps {
  return 'documentProps' in props;
}

export function PDFDownloadLinkInner(props: SimplifiedPDFDownloadLinkInnerProps) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    registerFonts().then(() => setFontsReady(true));
  }, []);

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
    ...props.styles,
  };

  const documentProps: PDFDocumentProps = {
    bookTitle: props.bookTitle,
    chapters: props.chapters,
    styles: mergedStyles,
    showTOC: props.showTOC,
    selectedChapterIds: props.chapters.map(c => c.id),
    authorProfile: props.authorProfile,
    coverImageUrl: props.coverImageUrl,
    templateStyles: props.templateStyles,
  };

  const fileName = `${props.bookTitle.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;

  if (!fontsReady) {
    return (
      <Button className="gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading fonts...
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={<PDFDocument {...documentProps} />}
      fileName={fileName}
    >
      {({ loading, error }) => (
        <Button className="gap-2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : error ? (
            <>Error generating PDF</>
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

export default function LegacyPDFDownloadLinkInner({ documentProps, fileName }: LegacyPDFDownloadLinkInnerProps) {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    registerFonts().then(() => setFontsReady(true));
  }, []);

  if (!fontsReady) {
    return (
      <Button className="w-full gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading fonts...
      </Button>
    );
  }

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
