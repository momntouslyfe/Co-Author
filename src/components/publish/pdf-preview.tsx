'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, X, Download } from 'lucide-react';
import { EditorStyles } from '@/lib/publish/content-transformer';
import { EditorChapter } from '@/lib/publish/types';
import { AuthorProfile } from '@/lib/definitions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PDFDocument = dynamic(
  () => import('./pdf-document').then((mod) => mod.PDFDocument),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[600px]"><Loader2 className="h-8 w-8 animate-spin" /></div> }
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview & Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            PDF preview and download features will be available in the next update. Your edited content is being saved automatically.
          </AlertDescription>
        </Alert>
        
        <Button className="w-full gap-2" disabled variant="secondary">
          <Download className="h-4 w-4" />
          Export PDF (Coming Soon)
        </Button>
      </CardContent>
    </Card>
  );
}
