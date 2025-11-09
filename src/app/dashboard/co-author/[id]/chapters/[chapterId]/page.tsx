
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, arrayRemove, collection, getDocs, query, where } from 'firebase/firestore';
import type { Project, Chapter, ResearchProfile, StyleProfile } from '@/lib/definitions';
import { Loader2, Bot, Save, Wand2, ArrowLeft, Copy, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { generateChapterContent } from '@/ai/flows/generate-chapter-content';
import { useCollection } from '@/firebase/firestore/use-collection';
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

// New Component for the interactive editor
const ChapterEditor = ({ content, onContentChange }: { content: string; onContentChange: (newContent: string) => void }) => {
    const renderContent = () => {
        return content.split('\n').map((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$')) {
                return <h3 key={index} className="text-xl font-bold font-headline mt-6 mb-3">{trimmedLine.replaceAll('$$', '')}</h3>;
            }
            if (trimmedLine.startsWith('Your Action Step:') || trimmedLine.startsWith('Coming Up Next:')) {
                 return <h4 key={index} className="text-lg font-bold font-headline mt-6 mb-2">{trimmedLine}</h4>;
            }
            if (trimmedLine === '') {
                return <div key={index} className="h-4" />; // Spacer for paragraph gaps
            }
            return (
                <div key={index} className="relative group">
                    <p className="mb-4">{line}</p>
                    <div className="absolute top-0 -right-32 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2">
                         <Button variant="outline" size="sm" className="text-xs">
                             <Sparkles className="mr-2 h-3 w-3" />
                             Extend
                         </Button>
                    </div>
                </div>
            );
        });
    };

    return (
         <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Start writing your chapter here..."
            className="h-[65vh] text-base"
        />
    )
};


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
  
  const researchProfileQuery = useMemoFirebase(() => {
    if (!user || !project?.description) return null;
    return query(
      collection(firestore, 'users', user.uid, 'researchProfiles'),
      where('topic', '==', project.description)
    );
  }, [user, firestore, project?.description]);

  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfileQuery);
  const relevantResearchProfile = researchProfiles?.[0];


  const chapterDetails = chapterData?.chapter;
  const subTopics = chapterData?.subTopics || [];

  useEffect(() => {
    if (project && chapterDetails) {
        const savedChapter = project.chapters?.find(c => c.id === chapterId);
        if (savedChapter && savedChapter.content) {
            setChapterContent(savedChapter.content);
            setPageState('writing');
        }
    }
  }, [project, chapterDetails, chapterId]);

  const generateChapter = useCallback(async () => {
    if (!project || !chapterDetails || subTopics.length === 0) {
        toast({ title: "Missing Information", description: "Cannot generate chapter without project details.", variant: "destructive" });
        return;
    }

    setPageState('generating');
    try {
        const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
        const stylePrompt = selectedStyle?.styleAnalysis;

        const researchPrompt = relevantResearchProfile 
            ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
            : undefined;

        const result = await generateChapterContent({
            bookTitle: project.title,
            bookTopic: project.description || '',
            bookLanguage: project.language || 'English',
            fullOutline: project.outline || '',
            chapterTitle: chapterDetails.title,
            subTopics: subTopics,
            styleProfile: stylePrompt,
            researchProfile: researchPrompt,
        });
        
        let formattedContent = result.chapterContent.replace(`$$${chapterDetails.title}$$`, '').trim();
        subTopics.forEach(subTopic => {
            formattedContent = formattedContent.replace(`$$${subTopic}$$`, `\n\n**${subTopic}**\n`);
        });

        setChapterContent(result.chapterContent);
        setPageState('writing');
        toast({ title: "Chapter Draft Ready", description: "The AI has generated the first draft." });

    } catch (error) {
        console.error("Error generating content:", error);
        toast({ title: "AI Generation Failed", variant: "destructive", description: "Could not generate chapter content." });
        setPageState('overview');
    }
  }, [project, chapterDetails, subTopics, styleProfiles, selectedStyleId, relevantResearchProfile, toast]);


  const handleSaveContent = useCallback(async () => {
    if (!projectDocRef || !chapterDetails) return;
    setIsSaving(true);
    try {
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
  
  const handleCopyContent = () => {
    navigator.clipboard.writeText(chapterContent);
    toast({ title: 'Content Copied', description: 'The chapter content has been copied to your clipboard.' });
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
                        <Link href={`/dashboard/co-author/${projectId}/chapters`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Chapters</Link>
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
                         <Button onClick={generateChapter} size="lg" className="w-full">
                            <Wand2 className="mr-2 h-4 w-4" />
                            Write with AI
                        </Button>
                    </div>
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
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="text-lg font-semibold">AI is writing your chapter...</p>
                        <p className="text-muted-foreground">Please wait a moment while the first draft is being created.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative">
                        <ChapterEditor content={chapterContent} onContentChange={setChapterContent} />
                         <div className="absolute top-2 right-2 flex gap-2">
                            <Button variant="outline" size="sm">
                                <User className="mr-2 h-4 w-4" /> My Insights
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleCopyContent}>
                                <Copy className="mr-2 h-4 w-4" /> Copy
                            </Button>
                        </div>
                    </div>
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
