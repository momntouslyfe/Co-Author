
'use client';

import { useMemo } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Project, Chapter } from '@/lib/definitions';
import { Loader2, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Helper function to parse the Markdown outline into a structured format
const parseOutline = (outline: string): { parts: { title: string; chapters: Chapter[] }[] } => {
  if (!outline) return { parts: [] };

  const lines = outline.split('\n');
  const parts: { title: string; chapters: Chapter[] }[] = [];
  let currentPart: { title: string; chapters: Chapter[] } | null = null;
  let chapterCounter = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('## ')) {
      // It's a Part
      if (currentPart) {
        parts.push(currentPart);
      }
      currentPart = { title: trimmedLine.substring(3), chapters: [] };
    } else if (trimmedLine.startsWith('### ') && currentPart) {
      // It's a Chapter
      chapterCounter++;
      currentPart.chapters.push({
        id: `chapter-${chapterCounter}`,
        title: trimmedLine.substring(4),
        part: currentPart.title,
        content: '', // Initially empty
      });
    }
  }
  if (currentPart) {
    parts.push(currentPart);
  }
  return { parts };
};


export default function ChaptersPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { user } = useAuthUser();
  const firestore = useFirestore();

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  const structuredOutline = useMemo(() => {
    return parseOutline(project?.outline || '');
  }, [project?.outline]);

  if (isProjectLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!project && !isProjectLoading) {
    return notFound();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Step 3: Write Your Book</CardTitle>
          <CardDescription>
            Your blueprint is ready. Select a chapter below to start writing with your AI co-author.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="font-bold text-lg mb-4">Book Title: {project.title}</p>
            <Accordion type="multiple" defaultValue={structuredOutline.parts.map(p => p.title)} className="w-full space-y-2">
                {structuredOutline.parts.map((part) => (
                    <Card key={part.title}>
                        <AccordionItem value={part.title} className="border-0">
                        <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
                            {part.title}
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <div className="space-y-2">
                            {part.chapters.map((chapter) => (
                                <Link key={chapter.id} href={`/dashboard/co-author/${projectId}/chapters/${chapter.id}`} passHref>
                                <div className="flex items-center justify-between p-3 rounded-md border hover:bg-secondary transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">{chapter.title}</span>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                                </Link>
                            ))}
                            </div>
                        </AccordionContent>
                        </AccordionItem>
                    </Card>
                ))}
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
