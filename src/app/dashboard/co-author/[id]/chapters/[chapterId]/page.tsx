
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, arrayRemove, collection } from 'firebase/firestore';
import type { Project } from '@/lib/definitions';
import { Loader2, Bot, Save, Wand2, ArrowLeft, Copy, Sparkles, User, RefreshCw, BookOpen, BrainCircuit, Drama, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateChapterContent } from '@/ai/flows/generate-chapter-content';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { expandBookContent } from '@/ai/flows/expand-book-content';
import type { Chapter, ResearchProfile, StyleProfile } from '@/lib/definitions';
import { rewriteChapter } from '@/ai/flows/rewrite-chapter';
import { rewriteSection } from '@/ai/flows/rewrite-section';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
type PageState = 'overview' | 'generating' | 'writing' | 'rewriting' | 'rewriting-section';

// New Component for the interactive editor
const ChapterEditor = ({ 
    project, 
    chapterDetails, 
    content, 
    onContentChange, 
    selectedStyleId, 
    styleProfiles,
    selectedResearchId,
    researchProfiles,
    selectedFramework,
    onRewriteSectionStart,
    onRewriteSectionEnd
}: { 
    project: Project, 
    chapterDetails: Chapter, 
    content: string; 
    onContentChange: (newContent: string) => void; 
    selectedStyleId: string; 
    styleProfiles: StyleProfile[] | null;
    selectedResearchId: string;
    researchProfiles: ResearchProfile[] | null;
    selectedFramework: string;
    onRewriteSectionStart: () => void;
    onRewriteSectionEnd: (newContent: string) => void;
}) => {
    
    const [isExtending, setIsExtending] = useState<number | null>(null);
    const [extendInstruction, setExtendInstruction] = useState('');
    const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
    const [isRewritingSection, setIsRewritingSection] = useState<number | null>(null);
    const { toast } = useToast();

    const handleExtendClick = async (paragraph: string, index: number, instruction?: string) => {
        setIsExtending(index);
        setOpenPopoverIndex(null); // Close the popover
        try {
            const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);

            const result = await expandBookContent({
                bookTitle: project.title,
                fullOutline: project.outline || '',
                chapterTitle: chapterDetails.title,
                contentToExpand: paragraph,
                instruction,
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
            setExtendInstruction('');
        }
    };
    
    const handleRewriteSection = async (sectionIndex: number, sectionContentToRewrite: string) => {
        if (!project.language) {
            toast({ title: "Language not set", description: "Project language is required to rewrite.", variant: "destructive" });
            return;
        }

        setIsRewritingSection(sectionIndex);
        onRewriteSectionStart(); // Notify parent that a section rewrite is starting

        try {
            const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
            const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
            const researchPrompt = relevantResearchProfile 
                ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
                : undefined;

            const result = await rewriteSection({
                sectionContent: sectionContentToRewrite,
                styleProfile: selectedStyle?.styleAnalysis,
                researchProfile: researchPrompt,
                storytellingFramework: selectedFramework,
                language: project.language,
            });

            if (result && result.rewrittenSection) {
                // This is the key part: replace the old section content with the new one.
                const allSections = content.split(/(\$\$[^$]+\$\$)/g).filter(s => s.trim() !== '');
                // The content to replace is at index `sectionIndex * 2 + 1`
                allSections[sectionIndex * 2 + 1] = `\n\n${result.rewrittenSection}\n\n`;
                onRewriteSectionEnd(allSections.join('')); // Notify parent with the full new content
                toast({ title: "Section Rewritten", description: "The AI has rewritten the section." });
            } else {
                throw new Error("AI returned empty content during section rewrite.");
            }

        } catch (error) {
            console.error("Error rewriting section:", error);
            toast({ title: "AI Rewrite Failed", variant: "destructive", description: "Could not rewrite the section." });
            onRewriteSectionEnd(content); // On error, revert to original content
        } finally {
            setIsRewritingSection(null);
        }
    }


    const renderContent = () => {
        // Split content by the section delimiters, keeping the delimiters
        const sections = content.split(/(\$\$[^$]+\$\$)/g).filter(s => s.trim() !== '');
        const renderedSections: JSX.Element[] = [];
        
        for (let i = 0; i < sections.length; i += 2) {
            const titlePart = sections[i];
            const contentPart = sections[i + 1] || '';
            const sectionIndex = i / 2;
            
            const title = titlePart.replaceAll('$$', '');
            const isMainTitle = sectionIndex === 0;
            const isActionOrNext = title === 'Your Action Step' || title === 'Coming Up Next';
            
            renderedSections.push(
                <div key={`section-container-${sectionIndex}`} className="group/section relative">
                    <div className="flex items-center justify-between">
                         <h3 className={`font-headline mt-8 mb-4 font-bold ${isMainTitle ? 'text-xl' : 'text-lg'}`}>{title}</h3>
                         {!isMainTitle && !isActionOrNext && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="opacity-0 group-hover/section:opacity-100 transition-opacity"
                                onClick={() => handleRewriteSection(sectionIndex, contentPart)}
                                disabled={isRewritingSection === sectionIndex}
                            >
                                {isRewritingSection === sectionIndex ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Rewrite Section
                            </Button>
                         )}
                    </div>
                   
                    {isRewritingSection === sectionIndex ? (
                        <div className="space-y-2">
                            <div className="h-6 w-full rounded-md bg-muted animate-pulse"></div>
                            <div className="h-6 w-5/6 rounded-md bg-muted animate-pulse"></div>
                            <div className="h-6 w-3/4 rounded-md bg-muted animate-pulse"></div>
                        </div>
                    ) : (
                        contentPart.trim().split('\n\n').map((paragraph, pIndex) => (
                            <div key={`p-container-${sectionIndex}-${pIndex}`} className="mb-4 group/paragraph">
                                <p className="text-base leading-relaxed">{paragraph}</p>
                                <div className="text-right opacity-0 group-hover/paragraph:opacity-100 transition-opacity mt-2">
                                <Popover open={openPopoverIndex === (sectionIndex * 100 + pIndex)} onOpenChange={(isOpen) => setOpenPopoverIndex(isOpen ? (sectionIndex * 100 + pIndex) : null)}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-xs" disabled={isExtending === (sectionIndex * 100 + pIndex)}>
                                                {isExtending === (sectionIndex * 100 + pIndex) ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
                                                Extend With AI
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium leading-none">Guided Extend</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        Give the AI specific instructions.
                                                    </p>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`instruction-${sectionIndex}-${pIndex}`} className="sr-only">Instruction</Label>
                                                    <Input
                                                        id={`instruction-${sectionIndex}-${pIndex}`}
                                                        placeholder="e.g., Add a historical example"
                                                        value={extendInstruction}
                                                        onChange={(e) => setExtendInstruction(e.target.value)}
                                                    />
                                                    <Button size="sm" onClick={() => handleExtendClick(paragraph, (sectionIndex * 100 + pIndex), extendInstruction)} disabled={!extendInstruction || isExtending === (sectionIndex * 100 + pIndex)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Write More With My instruction
                                                    </Button>
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <span className="w-full border-t" />
                                                    </div>
                                                    <div className="relative flex justify-center text-xs uppercase">
                                                        <span className="bg-popover px-2 text-muted-foreground">
                                                        Or
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="secondary" onClick={() => handleExtendClick(paragraph, (sectionIndex * 100 + pIndex))} disabled={isExtending === (sectionIndex * 100 + pIndex)}>
                                                    <Wand2 className="mr-2 h-4 w-4" />
                                                    Just Write More
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            );
        }
        
        return renderedSections;
    };

    return <div className="prose max-w-none dark:prose-invert">{renderContent()}</div>;
};

const frameworks = [
    { value: 'The Hero\'s Journey', label: 'The Hero\'s Journey' },
    { value: 'The Mentor\'s Journey', label: 'The Mentor\'s Journey' },
    { value: 'Three-Act Structure', label: 'Three-Act Structure' },
    { value: 'Fichtean Curve', label: 'Fichtean Curve' },
    { value: 'Save the Cat', label: 'Save the Cat' },
];


export default function ChapterPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string; chapterId: string }>();
  const projectId = params.id;
  const chapterId = params.chapterId;

  const { user } = useAuthUser();
  const firestore = useFirestore();
  
  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  const [pageState, setPageState] = useState<PageState>('overview');
  const [chapterContent, setChapterContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('default');
  const [selectedResearchId, setSelectedResearchId] = useState<string>(project?.researchProfileId || 'none');
  const [selectedFramework, setSelectedFramework] = useState<string>(project?.storytellingFramework || '');


  const styleProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'styleProfiles');
  }, [user, firestore]);

  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);

  const chapterData = useMemo(() => {
    if (!project?.outline || !chapterId) return null;
    return parseChapterDetails(project.outline, chapterId);
  }, [project?.outline, chapterId]);
  
  const researchProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'researchProfiles');
  }, [user, firestore]);

  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);


  const chapterDetails = chapterData?.chapter;
  const subTopics = chapterData?.subTopics || [];

  useEffect(() => {
    if (project) {
        // Pre-select saved chapter content if available
        const savedChapter = project.chapters?.find(c => c.id === chapterId);
        if (savedChapter && savedChapter.content) {
            setChapterContent(savedChapter.content);
            setPageState('writing');
        }

        // Pre-select storytelling framework from project
        if (project.storytellingFramework) {
            setSelectedFramework(project.storytellingFramework);
        }
        
        // Pre-select research profile from project
        if (project.researchProfileId) {
            setSelectedResearchId(project.researchProfileId);
        }
    }
  }, [project, chapterId]);

  const generateChapter = useCallback(async () => {
    if (!project || !chapterDetails || !subTopics || subTopics.length === 0) {
        toast({ title: "Missing Information", description: "Cannot generate chapter without project details or sub-topics.", variant: "destructive" });
        return;
    }

    setPageState('generating');
    try {
        const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
        const stylePrompt = selectedStyle?.styleAnalysis;

        const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
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
            storytellingFramework: selectedFramework,
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
  }, [project, chapterDetails, subTopics, styleProfiles, selectedStyleId, researchProfiles, selectedResearchId, selectedFramework, toast]);


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

        const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
        const researchPrompt = relevantResearchProfile
            ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
            : undefined;

        const result = await rewriteChapter({
            chapterContent: chapterContent,
            styleProfile: stylePrompt,
            researchProfile: researchPrompt,
            storytellingFramework: selectedFramework,
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
  }, [chapterContent, styleProfiles, selectedStyleId, toast, project?.language, selectedFramework, researchProfiles, selectedResearchId]);


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
                        <CardTitle className="font-headline text-xl">{chapterDetails.title}</CardTitle>
                        <CardDescription>Part of: {chapterDetails.part}</CardDescription>
                    </div>
                     <Button asChild variant="outline">
                        <Link href={`/dashboard/co-author/${projectId}/chapters`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Chapters</Link>
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Card className="bg-secondary/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Bot className="w-5 h-5"/>
                                AI Writing Context
                            </CardTitle>
                            <CardDescription>The AI will use the following context to write this chapter. You can change these settings before generating.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-start gap-3">
                                    <BookOpen className="w-5 h-5 mt-1 text-primary" />
                                    <div>
                                        <h4 className="font-semibold">Chapter Talking Points</h4>
                                        {subTopics.length > 0 ? (
                                            <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                                                {subTopics.map((topic, index) => (
                                                    <li key={index}>{topic}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-muted-foreground mt-1">No sub-topics found for this chapter in the blueprint.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                             <div className="p-4 border rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Drama className="w-5 h-5 mt-1 text-primary" />
                                    <div className='w-full'>
                                        <h4 className="font-semibold">Storytelling Framework</h4>
                                        <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="Select a framework" />
                                            </SelectTrigger>
                                            <SelectContent>
                                            {frameworks.map(fw => (
                                                <SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <div className="flex items-start gap-3">
                                    <BrainCircuit className="w-5 h-5 mt-1 text-primary" />
                                    <div className='w-full'>
                                        <h4 className="font-semibold">AI Research Profile</h4>
                                         <Select value={selectedResearchId} onValueChange={setSelectedResearchId}>
                                            <SelectTrigger className="mt-2">
                                                <SelectValue placeholder="Select a research profile" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {researchProfiles?.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.topic}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
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
            {pageState === 'generating' || pageState === 'rewriting' || pageState === 'rewriting-section' ? (
                <div className="flex h-[65vh] flex-col items-center justify-center space-y-4 rounded-md border border-dashed">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="text-lg font-semibold">
                            {pageState === 'generating' && 'AI is writing your chapter...'}
                            {pageState === 'rewriting' && 'AI is rewriting the chapter...'}
                            {pageState === 'rewriting-section' && 'AI is rewriting the section...'}
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
                          selectedResearchId={selectedResearchId}
                          researchProfiles={researchProfiles}
                          selectedFramework={selectedFramework}
                          onRewriteSectionStart={() => setPageState('rewriting-section')}
                          onRewriteSectionEnd={(newContent) => {
                              setChapterContent(newContent);
                              setPageState('writing');
                          }}
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

    
    
