
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, arrayRemove, collection, getDocs, query, where } from 'firebase/firestore';
import type { Project } from '@/lib/definitions';
import { Loader2, Bot, Save, Wand2, ArrowLeft, Copy, Sparkles, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { generateChapterContent } from '@/ai/flows/generate-chapter-content';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { expandBookContent } from '@/ai/flows/expand-book-content';
import type { Chapter, ResearchProfile, StyleProfile } from '@/lib/definitions';
import { rewriteChapter } from '@/ai/flows/rewrite-chapter';

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
                 if (topic) subTopics.push(topic);
            }
        } else if (inTargetChapter && trimmedLine === '') {
            // Stop collecting sub-topics after the first blank line in the target chapter section
            if (subTopics.length > 0) break;
        }
    }
    
    if (chapter) {
        return { chapter, subTopics };
    }

    return null;
};

// New state to manage the workflow on this page
type PageState = 'overview' | 'generating' | 'writing' | 'rewriting';

// New Component for the interactive editor
const ChapterEditor = ({ project, chapterDetails, content, onContentChange, selectedStyleId, styleProfiles }: { project: Project, chapterDetails: Chapter, content: string; onContentChange: (newContent: string) => void; selectedStyleId: string; styleProfiles: StyleProfile[] | null }) => {
    
    const [isExtending, setIsExtending] = useState<number | null>(null);
    const { toast } = useToast();

    const handleExtendClick = async (paragraph: string, index: number) => {
        setIsExtending(index);
        try {
            const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);

            const result = await expandBookContent({
                bookTitle: project.title,
                fullOutline: project.outline || '',
                chapterTitle: chapterDetails.title,
                contentToExpand: paragraph,
                styleProfile: selectedStyle?.styleAnalysis,
            });

            const paragraphs = content.split('\n\n');
            // Insert the new content right after the paragraph that was clicked
            paragraphs.splice(index + 1, 0, result.expandedContent);
            onContentChange(paragraphs.join('\n\n'));
            toast({ title: "Content Extended", description: "New content has been added." });

        } catch (error) {
            console.error("Failed to extend content", error);
            toast({ title: "AI Extend Failed", description: "Could not generate additional content.", variant: "destructive" });
        } finally {
            setIsExtending(null);
        }
    };

    const renderContent = () => {
        // Split content by double newlines to get paragraphs/headings
        const sections = content.split('\n\n');

        return sections.map((section, index) => {
            const trimmedSection = section.trim();

            if (trimmedSection.startsWith('$$') && trimmedSection.endsWith('$$')) {
                const title = trimmedSection.replaceAll('$$', '');
                
                 // Render titles with specific styling
                if (title === 'Your Action Step' || title === 'Coming Up Next') {
                    return <h3 key={`title-${index}`} className="text-lg font-bold font-headline mt-8 mb-4">{title}</h3>;
                }
                if (index === 0) { // Main chapter title
                     return <h2 key={`title-${index}`} className="font-headline text-2xl mt-8 mb-4 font-bold">{title}</h2>;
                }
                // Sub-topic titles
                return <h3 key={`title-${index}`} className="text-xl font-bold font-headline mt-8 mb-4">{title}</h3>;

            } else if (trimmedSection !== '') {
                return (
                    <div key={`p-container-${index}`} className="mb-4 group">
                        <p className="text-base leading-relaxed">{trimmedSection}</p>
                        <div className="text-right opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                            <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExtendClick(trimmedSection, index)} disabled={isExtending === index}>
                                {isExtending === index ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
                                 Extend With AI
                             </Button>
                        </div>
                    </div>
                );
            }
            return null; // Return null for empty lines to avoid rendering empty divs
        });
    };

    return <div className="prose prose-lg max-w-none dark:prose-invert">{renderContent()}</div>;
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
    if (!project || !chapterDetails || !subTopics || subTopics.length === 0) {
        toast({ title: "Missing Information", description: "Cannot generate chapter without project details or sub-topics.", variant: "destructive" });
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

        if (result && result.chapterContent) {
            setChapterContent(result.chapterContent);
            setPageState('writing');
            toast({ title: "Chapter Draft Ready", description: "The AI has generated the first draft." });
        } else {
            throw new Error("AI returned empty content.");
        }

    } catch (error) {
        console.error("Error generating content:", error);
        toast({ title: "AI Generation Failed", variant: "destructive", description: "Could not generate chapter content. Please check the AI configuration and try again." });
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
      toast({ title: 'Error Saving', variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [projectDocRef, chapterDetails, chapterContent, chapterId, project?.chapters, toast]);
  
  const handleCopyContent = () => {
    navigator.clipboard.writeText(chapterContent);
    toast({ title: 'Content Copied', description: 'The chapter content has been copied to your clipboard.' });
  }

  const handleRewriteChapter = useCallback(async () => {
    if (!chapterContent) {
        toast({ title: "No Content", description: "There is no content to rewrite.", variant: "destructive" });
        return;
    }
     if (!project?.language) {
        toast({ title: "Language not set", description: "Project language is required to rewrite the chapter.", variant: "destructive" });
        return;
    }

    setPageState('rewriting');
    try {
        const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
        const stylePrompt = selectedStyle?.styleAnalysis;

        const result = await rewriteChapter({
            chapterContent: chapterContent,
            styleProfile: stylePrompt,
            language: project.language,
        });

        if (result && result.rewrittenContent) {
            setChapterContent(result.rewrittenContent);
            toast({ title: "Chapter Rewritten", description: "The AI has rewritten the chapter." });
        } else {
            throw new Error("AI returned empty content during rewrite.");
        }
    } catch (error) {
        console.error("Error rewriting chapter:", error);
        toast({ title: "AI Rewrite Failed", variant: "destructive", description: "Could not rewrite the chapter. Please try again." });
    } finally {
        setPageState('writing');
    }
  }, [chapterContent, styleProfiles, selectedStyleId, toast, project?.language]);


  if (isProjectLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!project && !isProjectLoading) {
    return notFound();
  }

  if (!chapterDetails || !subTopics) {
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
                            {subTopics.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-2">
                                    {subTopics.map((topic, index) => (
                                        <li key={index}>{topic}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">No sub-topics found for this chapter in the blueprint.</p>
                            )}
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
                         <Button onClick={generateChapter} size="lg" className="w-full" disabled={subTopics.length === 0}>
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
                <CardTitle className="font-headline text-xl">{chapterDetails.title}</CardTitle>
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
            {pageState === 'generating' || pageState === 'rewriting' ? (
                <div className="flex h-[65vh] flex-col items-center justify-center space-y-4 rounded-md border border-dashed">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="text-lg font-semibold">
                            {pageState === 'generating' ? 'AI is writing your chapter...' : 'AI is rewriting the chapter...'}
                        </p>
                        <p className="text-muted-foreground">
                            {pageState === 'generating' ? 'Please wait a moment while the first draft is being created.' : 'This may take a moment. Please wait.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-end gap-2 mb-4 sticky top-0 bg-background py-2 z-10">
                        <Button variant="outline" size="sm">
                            <User className="mr-2 h-4 w-4" /> My Insights
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleRewriteChapter}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Rewrite Chapter
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCopyContent}>
                            <Copy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                    </div>
                    <div className="relative">
                        <ChapterEditor
                          project={project}
                          chapterDetails={chapterDetails}
                          content={chapterContent}
                          onContentChange={setChapterContent}
                          selectedStyleId={selectedStyleId}
                          styleProfiles={styleProfiles}
                        />
                    </div>
                    <div className="flex justify-end pt-4 border-t">
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
