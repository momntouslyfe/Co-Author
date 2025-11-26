'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, Eye, X } from 'lucide-react';
import { EditorStyles } from '@/lib/publish/content-transformer';
import { EditorChapter } from '@/lib/publish/types';
import { AuthorProfile } from '@/lib/definitions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PDFDocumentProps } from './pdf-document';

type PDFPreviewProps = {
  bookTitle: string;
  chapters: EditorChapter[];
  styles: EditorStyles;
  showTOC: boolean;
  outline?: string;
  selectedChapterIds: string[];
  authorProfile?: AuthorProfile;
  authorBioContent?: string;
  coverImageUrl?: string;
};

const PDFDownloadWrapper = dynamic<{ documentProps: PDFDocumentProps; fileName: string }>(
  () => import('./pdf-download-wrapper').then((mod) => mod.PDFDownloadWrapper),
  { 
    ssr: false,
    loading: () => (
      <Button className="w-full gap-2" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </Button>
    )
  }
);

const PDFViewerWrapper = dynamic<{ documentProps: PDFDocumentProps }>(
  () => import('./pdf-viewer-wrapper').then((mod) => mod.PDFViewerWrapper),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
);

export function PDFPreview({
  bookTitle,
  chapters,
  styles,
  showTOC,
  outline,
  selectedChapterIds,
  authorProfile,
  authorBioContent,
  coverImageUrl,
}: PDFPreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const documentProps: PDFDocumentProps = useMemo(() => ({
    bookTitle,
    chapters,
    styles,
    showTOC,
    outline,
    selectedChapterIds,
    authorProfile,
    authorBioContent,
    coverImageUrl,
  }), [bookTitle, chapters, styles, showTOC, outline, selectedChapterIds, authorProfile, authorBioContent, coverImageUrl]);

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview & Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview & Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full gap-2"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="h-4 w-4" />
            Preview PDF
          </Button>
          
          <PDFDownloadWrapper
            documentProps={documentProps}
            fileName={`${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
          />
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>PDF Preview - {bookTitle}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPreviewOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isPreviewOpen && (
              <PDFViewerWrapper documentProps={documentProps} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
