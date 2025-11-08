'use client';

import { useState } from 'react';
import type { Project, Chapter } from '@/lib/definitions';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { expandBookContent } from '@/ai/flows/expand-book-content';

export default function EditorClient({ project }: { project: Project }) {
  const { toast } = useToast();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(project.chapters[0]?.id || null);
  const [chapters, setChapters] = useState<Chapter[]>(project.chapters);
  const [isExtending, setIsExtending] = useState(false);

  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  const handleContentChange = (newContent: string) => {
    if (!activeChapterId) return;
    setChapters(
      chapters.map((c) =>
        c.id === activeChapterId ? { ...c, content: newContent } : c
      )
    );
  };

  const handleExtend = async () => {
    if (!activeChapter || !activeChapter.content) {
        toast({ title: 'Content is empty', description: 'Cannot extend empty content.', variant: 'destructive' });
        return;
    }
    
    setIsExtending(true);
    try {
        const result = await expandBookContent({
            content: activeChapter.content,
            style: 'narrative, descriptive', // This could be a user setting in the future
        });
        handleContentChange(result.expandedContent);
        toast({ title: 'Content Extended', description: 'AI has expanded your chapter content.' });
    } catch (error) {
        console.error(error);
        toast({ title: 'Error Extending Content', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
        setIsExtending(false);
    }
  };


  return (
    <div className="h-[calc(100vh-theme(spacing.14)-2*theme(spacing.6))] grid md:grid-cols-[300px_1fr] gap-6">
      {/* Sidebar for Chapters */}
      <div className="flex flex-col border rounded-lg">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/projects">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
          </Button>
          <h2 className="text-lg font-headline font-semibold mt-2 px-2">{project.title}</h2>
        </div>
        <div className="flex-grow overflow-y-auto">
          <Accordion
            type="single"
            collapsible
            defaultValue={`item-${activeChapterId}`}
            className="w-full"
          >
            <AccordionItem value="item-chapters">
              <AccordionTrigger className="px-4 font-semibold">Chapters</AccordionTrigger>
              <AccordionContent className="p-2 space-y-1">
                {chapters.map((chapter) => (
                  <Button
                    key={chapter.id}
                    variant={activeChapterId === chapter.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveChapterId(chapter.id)}
                  >
                    {chapter.title}
                  </Button>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex flex-col border rounded-lg">
        {activeChapter ? (
          <>
            <div className="p-4 border-b space-y-2">
              <Input
                value={activeChapter.title}
                onChange={(e) => {
                    if (!activeChapterId) return;
                    setChapters(chapters.map((c) => c.id === activeChapterId ? { ...c, title: e.target.value } : c));
                }}
                className="text-2xl font-bold font-headline border-none shadow-none focus-visible:ring-0 h-auto p-0"
              />
            </div>
            <div className="flex-grow relative">
                <Textarea
                    value={activeChapter.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Start writing your chapter here..."
                    className="w-full h-full border-none resize-none focus-visible:ring-0 p-4"
                />
                <div className="absolute bottom-4 right-4">
                    <Button onClick={handleExtend} disabled={isExtending}>
                        {isExtending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Extend with AI
                    </Button>
                </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Bot className="w-16 h-16 text-muted-foreground" />
            <h3 className="text-xl font-headline mt-4">Select a Chapter</h3>
            <p className="text-muted-foreground">Choose a chapter from the sidebar to start editing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
