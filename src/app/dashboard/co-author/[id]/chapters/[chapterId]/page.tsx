
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, arrayRemove } from 'firebase/firestore';
import type { Project, Chapter } from '@/lib/definitions';
import { Loader2, Bot, Save, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { expandBookContent } from '@/ai/flows/expand-book-content';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { StyleProfile } from '@/lib/definitions';
import { collection } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Helper function to parse the Markdown outline into a structured format
const parseOutlineForChapter = (outline: string, chapterId: string): Chapter | null => {
    if (!outline) return null;
  
    const lines = outline.split('\n');
    let currentPart: string | null = null;
    let chapterCounter = 0;
  
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('## ')) {
        currentPart = trimmedLine.substring(3);
      } else if (trimmedLine.startsWith('### ') && currentPart) {
        chapterCounter++;
        const currentChapterId = `chapter-${chapterCounter}`;
        if (currentChapterId === chapterId) {
            return {
                id: currentChapterId,
                title: trimmedLine.substring(4),
                part: currentPart,
                content: '', // Initially empty
            };
        }
      }
    }
    return null;
  };


export default function ChapterEditorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string; chapterId: string }>();
  const projectId = params.id;
  const chapterId = params.chapterId;

  const { user } = useAuthUser();
  const firestore = useFirestore();

  const [chapterContent, setChapterContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('default');

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  const styleProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'styleProfiles');
  }, [user, firestore]);

  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);

  const chapterDetails = useMemo(() => {
    if (!project?.outline || !chapterId) return null;
    return parseOutlineForChapter(project.outline, chapterId);
  }, [project?.outline, chapterId]);

  useEffect(() => {
    if (project && chapterDetails) {
        const savedChapter = project.chapters?.find(c => c.id === chapterId);
        setChapterContent(savedChapter?.content || '');
    }
  }, [project, chapterDetails, chapterId]);

  const handleSaveContent = useCallback(async () => {
    if (!projectDocRef || !chapterDetails) return;
    setIsSaving(true);
    try {
        // First, remove any existing version of this chapter to prevent duplicates
        const existingChapter = project?.chapters?.find(c => c.id === chapterId);
        if (existingChapter) {
            await updateDoc(projectDocRef, {
                chapters: arrayRemove(existingChapter)
            });
        }
        
        // Now, add the new/updated chapter
        await updateDoc(projectDocRef, {
            chapters: arrayUnion({
                id: chapterId,
                title: chapterDetails.title,
                part: chapterDetails.part,
                content: chapterContent,
            }),
            lastUpdated: serverTimestamp(),
        });

      toast({
        title: 'Content Saved',
        description: `Your work on "${chapterDetails.title}" has been saved.`,
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: 'Error Saving',
        description: 'Could not save your content.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [projectDocRef, chapterDetails, chapterContent, chapterId, project?.chapters, toast]);

  const handleExtendWithAI = async () => {
    if (!chapterContent.trim()) {
        toast({
            title: 'Cannot Extend Empty Content',
            description: 'Please write some content first before using the AI extension.',
            variant: 'destructive',
        });
        return;
    }
    setIsExtending(true);
    try {
        const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
        const stylePrompt = selectedStyle ? selectedStyle.styleAnalysis : "the current writing style";

        const result = await expandBookContent({
            content: chapterContent,
            style: stylePrompt,
        });
        setChapterContent(prev => prev + '\n\n' + result.expandedContent);
        toast({
            title: 'Content Extended',
            description: 'The AI has expanded on your writing.',
        });
    } catch (error) {
        console.error('Error extending content:', error);
        toast({
            title: 'Error Extending Content',
            description: 'The AI could not extend the content. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsExtending(false);
    }
  }


  if (isProjectLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!project && !isProjectLoading) {
    return notFound();
  }

  if (!chapterDetails) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Card>
                <CardHeader>
                    <CardTitle>Chapter Not Found</CardTitle>
                    <CardDescription>This chapter does not seem to exist in your project's blueprint.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild><Link href={`/dashboard/co-author/${projectId}/chapters`}>Back to Chapters</Link></Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex-row items-start justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">{chapterDetails.title}</CardTitle>
                <CardDescription>Part of: {chapterDetails.part}</CardDescription>
            </div>
            <Button asChild variant="outline">
                <Link href={`/dashboard/co-author/${projectId}/chapters`}>Back to Chapter List</Link>
            </Button>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                     <Textarea
                        value={chapterContent}
                        onChange={(e) => setChapterContent(e.target.value)}
                        placeholder="Start writing your chapter here..."
                        className="h-[65vh] text-base"
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleSaveContent} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save
                        </Button>
                    </div>
                </div>
                <div className="md:col-span-1 space-y-4">
                    <Card className="bg-secondary/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 font-headline">
                                <Wand2 className="w-5 h-5 text-primary" />
                                AI Co-Author Tools
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div>
                                <label htmlFor="style-select" className="text-sm font-medium mb-2 block">
                                    Writing Style
                                </label>
                                <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                                    <SelectTrigger id="style-select">
                                        <SelectValue placeholder="Select a style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Follow Current Style</SelectItem>
                                        {styleProfiles?.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleExtendWithAI} disabled={isExtending} className="w-full">
                                {isExtending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Extend with AI
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
