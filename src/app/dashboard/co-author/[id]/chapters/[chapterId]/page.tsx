
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, arrayRemove } from 'firebase/firestore';
import type { Project, Chapter } from '@/lib/definitions';
import { Loader2, Bot, Save, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { generateChapterContent } from '@/ai/flows/generate-chapter-content';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { StyleProfile } from '@/lib/definitions';
import { collection } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Enhanced helper to parse chapter details including sub-topics
const parseChapterDetails = (outline: string, chapterId: string): { chapter: Chapter, subTopics: string[] } | null => {
    if (!outline) return null;

    const lines = outline.split('\n');
    let currentPart: string | null = null;
    let chapterCounter = 0;
    let inTargetChapter = false;
    let chapter: Chapter | null = null;
    const subTopics: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('## ')) {
            currentPart = trimmedLine.substring(3);
            if (inTargetChapter) break; 
        } else if (trimmedLine.startsWith('### ') && currentPart) {
            if (inTargetChapter) break; 
            chapterCounter++;
            const currentChapterId = `chapter-${chapterCounter}`;
            if (currentChapterId === chapterId) {
                inTargetChapter = true;
                chapter = {
                    id: currentChapterId,
                    title: trimmedLine.substring(4),
                    part: currentPart,
                    content: '', 
                };
            }
        } else if (inTargetChapter && chapter && (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* '))) {
            const topic = trimmedLine.substring(2).trim();
            // This is a simple check to exclude the italicized description, might need refinement
            if (!topic.startsWith('*This chapter')) {
                subTopics.push(topic);
            }
        }
    }
    
    if (chapter) {
        return { chapter, subTopics };
    }

    return null;
};

// New state to manage the workflow on this page
type PageState = 'overview' | 'generating' | 'writing';

export default function ChapterPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string; chapterId: string }>();
  const projectId = params.id;
  const chapterId = params.chapterId;

  const { user } = useAuthUser();
  const firestore = useFirestore();

  const [pageState, setPageState] = useState<PageState>('overview');
  const [chapterContent, setChapterContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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

  const chapterData = useMemo(() => {
    if (!project?.outline || !chapterId) return null;
    return parseChapterDetails(project.outline, chapterId);
  }, [project?.outline, chapterId]);

  const chapterDetails = chapterData?.chapter;
  const subTopics = chapterData?.subTopics || [];

  // Effect to load existing content or if content is generated
  useEffect(() => {
    if (project && chapterDetails) {
        const savedChapter = project.chapters?.find(c => c.id === chapterId);
        if (savedChapter && savedChapter.content) {
            setChapterContent(savedChapter.content);
            setPageState('writing'); // If content exists, go straight to writing
        }
    }
  }, [project, chapterDetails, chapterId]);

  // Effect to handle AI content generation when state changes to 'generating'
  useEffect(() => {
    if (pageState === 'generating' && chapterDetails && subTopics.length > 0) {
        const generate = async () => {
             try {
                const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
                const stylePrompt = selectedStyle?.styleAnalysis;

                const result = await generateChapterContent({
                    chapterTitle: chapterDetails.title,
                    subTopics: subTopics,
                    styleProfile: stylePrompt,
                });

                setChapterContent(result.chapterContent);
                setPageState('writing');
                toast({ title: "Chapter Draft Ready", description: "The AI has generated the first draft." });

            } catch (error) {
                console.error("Error generating content:", error);
                toast({ title: "AI Generation Failed", variant: "destructive" });
                setPageState('overview'); // Go back to overview on failure
            }
        };
        generate();
    }
  }, [pageState, chapterDetails, subTopics, styleProfiles, selectedStyleId, toast]);


  const handleSaveContent = useCallback(async () => {
    if (!projectDocRef || !chapterDetails) return;
    setIsSaving(true);
    try {
        // This logic first removes the old chapter version and then adds the new one.
        const existingChapter = project?.chapters?.find(c => c.id === chapterId);
        if (existingChapter) {
            await updateDoc(projectDocRef, { chapters: arrayRemove(existingChapter) });
        }
        await updateDoc(projectDocRef, {
            chapters: arrayUnion({
                id: chapterId,
                title: chapterDetails.title,
                part: chapterDetails.part,
                content: chapterContent,
            }),
            lastUpdated: serverTimestamp(),
        });
      toast({ title: 'Content Saved' });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({ title: 'Error Saving', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [projectDocRef, chapterDetails, chapterContent, chapterId, project?.chapters, toast]);


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

  if (pageState === 'overview') {
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
                <CardContent className="space-y-6">
                    <Card className="bg-secondary/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Chapter Talking Points</CardTitle>
                            <CardDescription>The AI will use these points to structure the chapter.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc pl-5 space-y-2">
                                {subTopics.map((topic, index) => (
                                    <li key={index}>{topic}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <div className="max-w-md space-y-4">
                        <div>
                            <label htmlFor="style-select" className="text-sm font-medium mb-2 block">
                                Writing Style
                            </label>
                            <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                                <SelectTrigger id="style-select">
                                    <SelectValue placeholder="Select a style" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default (AI's own style)</SelectItem>
                                    {styleProfiles?.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-2">Select a style profile to guide the AI's voice and tone.</p>
                        </div>
                         <Button onClick={() => setPageState('generating')} size="lg" className="w-full">
                            <Wand2 className="mr-2 h-4 w-4" />
                            Write with AI
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }


  return ( // This renders for both 'writing' and 'generating' states
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex-row items-start justify-between">
            <div>
                <CardTitle className="font-headline text-2xl">{chapterDetails.title}</CardTitle>
                <CardDescription>Part of: {chapterDetails.part}</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => setPageState('overview')} variant="outline">Back to Overview</Button>
                <Button asChild variant="outline">
                    <Link href={`/dashboard/co-author/${projectId}/chapters`}>Chapter List</Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            {pageState === 'generating' ? (
                <div className="flex h-[65vh] flex-col items-center justify-center space-y-4 rounded-md border border-dashed">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="text-lg font-semibold">AI is writing your chapter...</p>
                        <p className="text-muted-foreground">Please wait a moment while the first draft is being created.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
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
            )}
        </CardContent>
       </Card>
    </div>
  );
}
