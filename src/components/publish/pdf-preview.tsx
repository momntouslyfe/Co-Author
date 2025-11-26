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

const PDFViewer = dynamic(
  async () => {
    const { PDFViewer } = await import('@react-pdf/renderer');
    return PDFViewer;
  },
  { ssr: false }
);

const PDFDocument = dynamic(
  () => import('./pdf-document').then((mod) => mod.PDFDocument),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[600px]"><Loader2 className="h-8 w-8 animate-spin" /></div> }
);

const PDFDownloadLink = dynamic(
  async () => {
    const { PDFDownloadLink: Link } = await import('@react-pdf/renderer');
    return Link;
  },
  { ssr: false }
);

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

  const documentProps = useMemo(() => ({
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
          
          <PDFDownloadLink
            document={<PDFDocument {...documentProps} />}
            fileName={`${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
          >
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
            <PDFViewer width="100%" height="100%" className="rounded-lg">
              <PDFDocument {...documentProps} />
            </PDFViewer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
