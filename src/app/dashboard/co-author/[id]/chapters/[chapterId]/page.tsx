
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


// Allow up to 5 minutes for AI chapter generation
export const maxDuration = 300;

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
}) => {
    
    const [isExtending, setIsExtending] = useState<number | null>(null);
    const [extendInstruction, setExtendInstruction] = useState('');
    const [openExtendPopoverIndex, setOpenExtendPopoverIndex] = useState<number | null>(null);
    
    const [isRewritingSection, setIsRewritingSection] = useState<number | null>(null);
    const [rewriteSectionInstruction, setRewriteSectionInstruction] = useState('');
    const [openRewritePopoverIndex, setOpenRewritePopoverIndex] = useState<number | null>(null);
    
    const { toast } = useToast();

    const handleExtendClick = async (paragraph: string, sectionIndex: number, paragraphIndex: number, instruction?: string) => {
        const uniqueIndex = sectionIndex * 1000 + paragraphIndex;
        setIsExtending(uniqueIndex);
        setOpenExtendPopoverIndex(null); // Close the popover
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

            // Split by the delimiter, but keep the delimiter in the array.
            const sections = content.split(/(\$\$[^$]+\$\$)/g).filter(s => s.trim() !== '');
            const hasChapterTitle = sections[0].startsWith('$$');
            const introContentIndex = hasChapterTitle ? 1 : 0;
            const contentStartIndex = hasChapterTitle ? 2 : 1;

            if (sectionIndex === -1) { // Intro section
                const introParagraphs = (sections[introContentIndex] || '').trim().split('\n\n');
                introParagraphs.splice(paragraphIndex + 1, 0, result.expandedContent);
                sections[introContentIndex] = `\n\n${introParagraphs.join('\n\n')}\n\n`;
            } else { // Sub-topic sections
                // The content part is always at index 1 relative to the title part
                const contentPartIndex = contentStartIndex + (sectionIndex * 2) + 1;
                if (contentPartIndex < sections.length) {
                    const sectionParagraphs = (sections[contentPartIndex] || '').trim().split('\n\n');
                    sectionParagraphs.splice(paragraphIndex + 1, 0, result.expandedContent);
                    sections[contentPartIndex] = `\n\n${sectionParagraphs.join('\n\n')}\n\n`;
                }
            }

            onContentChange(sections.join(''));
            toast({ title: "Content Extended", description: "New content has been added." });

        } catch (error) {
            console.error("Failed to extend content", error);
            toast({ title: "AI Extend Failed", description: "Could not generate additional content.", variant: "destructive" });
        } finally {
            setIsExtending(null);
            setExtendInstruction('');
        }
    };
    
    const handleRewriteSection = async (sectionIndex: number, sectionContentToRewrite: string, instruction?: string) => {
        if (!project.language) {
            toast({ title: "Language not set", description: "Project language is required to rewrite.", variant: "destructive" });
            return;
        }
    
        setIsRewritingSection(sectionIndex);
        setOpenRewritePopoverIndex(null);
    
        try {
            const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
            const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
            const researchPrompt = relevantResearchProfile
                ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
                : undefined;
    
            const allSections = content.split(/(\$\$[^$]+\$\$)/g).filter(s => s.trim() !== '');
            const hasChapterTitle = allSections.length > 0 && allSections[0].startsWith('$$');
    
            const isIntro = sectionIndex === -1;
            
            // Simplified and corrected index calculation
            let contentIndex;
            if (isIntro) {
                contentIndex = hasChapterTitle ? 1 : 0;
            } else {
                const baseIndex = hasChapterTitle ? 2 : 0;
                contentIndex = baseIndex + (sectionIndex * 2) + 1;
            }
            
            if (contentIndex < 0 || contentIndex >= allSections.length) {
                throw new Error("Calculated invalid index for section content.");
            }
    
            // Determine if full chapter context is needed for summary sections
            const titlePartIndex = isIntro ? (hasChapterTitle ? 0 : -1) : contentIndex -1;

            const title = titlePartIndex !== -1 ? allSections[titlePartIndex]?.replaceAll('$$', '').trim() : 'Introduction';
            const needsFullContext = title === 'Your Action Step' || title === 'Coming Up Next';
    
            const result = await rewriteSection({
                sectionContent: sectionContentToRewrite,
                chapterContent: needsFullContext ? content : undefined,
                styleProfile: selectedStyle?.styleAnalysis,
                researchProfile: researchPrompt,
                storytellingFramework: selectedFramework,
                language: project.language,
                instruction,
            });
    
            if (result && result.rewrittenSection) {
                 allSections[contentIndex] = `\n\n${result.rewrittenSection.trim()}\n\n`;
                 onContentChange(allSections.join(''));
                 toast({ title: "Section Rewritten", description: "The AI has rewritten the section." });
            } else {
                throw new Error("AI returned empty content during section rewrite.");
            }
    
        } catch (error) {
            console.error("Error rewriting section:", error);
            toast({ title: "AI Rewrite Failed", variant: "destructive", description: `Could not rewrite the section. ${error}` });
        } finally {
            setIsRewritingSection(null);
            setRewriteSectionInstruction('');
        }
    };


    const renderContent = () => {
        // Split by the delimiter, but keep the delimiter in the array.
        const sections = content.split(/(\$\$[^$]+\$\$)/g).filter(s => s.trim() !== '');
        
        if (sections.length === 0) return null;

        const renderedSections: JSX.Element[] = [];

        // Identify if the first block is the chapter title.
        const hasChapterTitle = sections.length > 0 && sections[0].startsWith('$$');
        const chapterTitle = hasChapterTitle ? sections[0].replaceAll('$$', '') : chapterDetails.title;
        
        // Correctly identify intro content, which might be the first or second element.
        const introContentIndex = hasChapterTitle ? 1 : 0;
        const introContent = sections[introContentIndex] || '';

        // The actual sub-topic content starts after the title (if present) and intro.
        const contentStartIndex = hasChapterTitle ? 2 : 1;
        const introSectionIndex = -1; // Special index for intro

        // Check if there is anything to render as introduction
        if (introContent || hasChapterTitle) {
            renderedSections.push(
                <div key="section-container-intro" className="group/section relative">
                    <div className="flex items-center justify-between">
                        <h2 className="font-headline mt-8 mb-4 font-bold text-2xl">{chapterTitle}</h2>
                        <Popover open={openRewritePopoverIndex === introSectionIndex} onOpenChange={(isOpen) => setOpenRewritePopoverIndex(isOpen ? introSectionIndex : null)}>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="opacity-0 group-hover/section:opacity-100 transition-opacity"
                                    disabled={isRewritingSection === introSectionIndex}
                                >
                                    {isRewritingSection === introSectionIndex ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Rewrite Introduction
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Guided Rewrite</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Give the AI specific instructions.
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor={`rewrite-instruction-intro`} className="sr-only">Instruction</Label>
                                        <Input
                                            id={`rewrite-instruction-intro`}
                                            placeholder="e.g., Make it more engaging"
                                            value={rewriteSectionInstruction}
                                            onChange={(e) => setRewriteSectionInstruction(e.target.value)}
                                        />
                                        <Button size="sm" onClick={() => handleRewriteSection(introSectionIndex, introContent.trim(), rewriteSectionInstruction)} disabled={!rewriteSectionInstruction || isRewritingSection === introSectionIndex}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Rewrite with My Instruction
                                        </Button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-popover px-2 text-muted-foreground">Or</span></div>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => handleRewriteSection(introSectionIndex, introContent.trim())} disabled={isRewritingSection === introSectionIndex}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Just Rewrite
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    {isRewritingSection === introSectionIndex ? (
                        <div className="space-y-2">
                            <div className="h-6 w-full rounded-md bg-muted animate-pulse"></div>
                            <div className="h-6 w-5/6 rounded-md bg-muted animate-pulse"></div>
                        </div>
                    ) : (
                        introContent.trim().split('\n\n').map((paragraph, pIndex) => (
                            <div key={`p-container-intro-${pIndex}`} className="mb-4 group/paragraph">
                                <p className="text-base leading-relaxed">{paragraph}</p>
                                <div className="text-right opacity-0 group-hover/paragraph:opacity-100 transition-opacity mt-2">
                                <Popover open={openExtendPopoverIndex === (introSectionIndex * 1000 + pIndex)} onOpenChange={(isOpen) => setOpenExtendPopoverIndex(isOpen ? (introSectionIndex * 1000 + pIndex) : null)}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-xs" disabled={isExtending === (introSectionIndex * 1000 + pIndex)}>
                                                {isExtending === (introSectionIndex * 1000 + pIndex) ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
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
                                                    <Label htmlFor={`instruction-intro-${pIndex}`} className="sr-only">Instruction</Label>
                                                    <Input
                                                        id={`instruction-intro-${pIndex}`}
                                                        placeholder="e.g., Add a historical example"
                                                        value={extendInstruction}
                                                        onChange={(e) => setExtendInstruction(e.target.value)}
                                                    />
                                                    <Button size="sm" onClick={() => handleExtendClick(paragraph, introSectionIndex, pIndex, extendInstruction)} disabled={!extendInstruction || isExtending === (introSectionIndex * 1000 + pIndex)}>
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
                                                <Button size="sm" variant="secondary" onClick={() => handleExtendClick(paragraph, introSectionIndex, pIndex)} disabled={isExtending === (introSectionIndex * 1000 + pIndex)}>
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

        // Loop through pairs of [Title, Content] for sub-topics and beyond
        for (let i = contentStartIndex; i < sections.length; i += 2) {
            const titlePart = sections[i];
            const contentPart = sections[i + 1] || '';
            // Adjust sectionIndex to account for the intro and chapter title
            const sectionIndex = (i - contentStartIndex) / 2;
            
            const title = titlePart.replaceAll('$$', '');
            
            renderedSections.push(
                <div key={`section-container-${sectionIndex}`} className="group/section relative">
                    <div className="flex items-center justify-between">
                         <h3 className={`font-headline mt-8 mb-4 font-bold text-xl`}>{title}</h3>
                         <Popover open={openRewritePopoverIndex === sectionIndex} onOpenChange={(isOpen) => setOpenRewritePopoverIndex(isOpen ? sectionIndex : null)}>
                             <PopoverTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="opacity-0 group-hover/section:opacity-100 transition-opacity"
                                    disabled={isRewritingSection === sectionIndex}
                                >
                                    {isRewritingSection === sectionIndex ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Rewrite Section
                                </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Guided Rewrite</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Give the AI specific instructions on how to rewrite.
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor={`rewrite-instruction-${sectionIndex}`} className="sr-only">Instruction</Label>
                                        <Input
                                            id={`rewrite-instruction-${sectionIndex}`}
                                            placeholder="e.g., Make it more concise"
                                            value={rewriteSectionInstruction}
                                            onChange={(e) => setRewriteSectionInstruction(e.target.value)}
                                        />
                                        <Button size="sm" onClick={() => handleRewriteSection(sectionIndex, contentPart.trim(), rewriteSectionInstruction)} disabled={!rewriteSectionInstruction || isRewritingSection === sectionIndex}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Rewrite with My Instruction
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
                                    <Button size="sm" variant="secondary" onClick={() => handleRewriteSection(sectionIndex, contentPart.trim())} disabled={isRewritingSection === sectionIndex}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Just Rewrite
                                    </Button>
                                </div>
                             </PopoverContent>
                         </Popover>
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
                                <Popover open={openExtendPopoverIndex === (sectionIndex * 1000 + pIndex)} onOpenChange={(isOpen) => setOpenExtendPopoverIndex(isOpen ? (sectionIndex * 1000 + pIndex) : null)}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-xs" disabled={isExtending === (sectionIndex * 1000 + pIndex)}>
                                                {isExtending === (sectionIndex * 1000 + pIndex) ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
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
                                                    <Button size="sm" onClick={() => handleExtendClick(paragraph, sectionIndex, pIndex, extendInstruction)} disabled={!extendInstruction || isExtending === (sectionIndex * 1000 + pIndex)}>
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
                                                <Button size="sm" variant="secondary" onClick={() => handleExtendClick(paragraph, sectionIndex, pIndex)} disabled={isExtending === (sectionIndex * 1000 + pIndex)}>
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
  const [rewriteChapterInstruction, setRewriteChapterInstruction] = useState('');
  const [isRewriteChapterPopoverOpen, setRewriteChapterPopoverOpen] = useState(false);


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
        toast({ title: "AI Generation Failed", variant: "destructive", description: "Could not generate chapter content. The process may have timed out. Please try again." });
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

  const handleRewriteChapter = useCallback(async (instruction?: string) => {
    if (!chapterContent) {
        toast({ title: "No Content", description: "There is no content to rewrite.", variant: "destructive" });
        return;
    }
     if (!project?.language) {
        toast({ title: "Language not set", description: "Project language is required to rewrite the chapter.", variant: "destructive" });
        return;
    }

    setPageState('rewriting');
    setRewriteChapterPopoverOpen(false);
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
            instruction,
        });

        if (result && result.rewrittenContent) {
            setChapterContent(result.rewrittenContent);
            toast({ title: "Chapter Rewritten", description: "The AI has rewritten the chapter." });
        } else {
            throw new Error("AI returned empty content during rewrite.");
        }
    } catch (error) {
        console.error("Error rewriting chapter:", error);
        toast({ title: "AI Rewrite Failed", variant: "destructive", description: "Could not rewrite the chapter. The process may have timed out. Please try again." });
    } finally {
        setPageState('writing');
        setRewriteChapterInstruction('');
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
            {pageState === 'generating' || pageState === 'rewriting' ? (
                <div className="flex h-[65vh] flex-col items-center justify-center space-y-4 rounded-md border border-dashed">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="text-lg font-semibold">
                            {pageState === 'generating' && 'AI is writing your chapter...'}
                            {pageState === 'rewriting' && 'AI is rewriting the chapter...'}
                        </p>
                        <p className="text-muted-foreground">
                            {pageState === 'generating' ? 'This can take up to 5 minutes. Please wait.' : 'This may take a moment. Please wait.'}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-end gap-2 mb-4 sticky top-0 bg-background py-2 z-10">
                        <Button variant="outline" size="sm">
                            <User className="mr-2 h-4 w-4" /> My Insights
                        </Button>
                        <Popover open={isRewriteChapterPopoverOpen} onOpenChange={setRewriteChapterPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <RefreshCw className="mr-2 h-4 w-4" /> Rewrite Chapter
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Guided Rewrite</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Give the AI specific instructions on how to rewrite the entire chapter.
                                        </p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="rewrite-chapter-instruction" className="sr-only">Instruction</Label>
                                        <Input
                                            id="rewrite-chapter-instruction"
                                            placeholder="e.g., Make it more formal"
                                            value={rewriteChapterInstruction}
                                            onChange={(e) => setRewriteChapterInstruction(e.target.value)}
                                        />
                                        <Button size="sm" onClick={() => handleRewriteChapter(rewriteChapterInstruction)} disabled={!rewriteChapterInstruction}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Rewrite with My Instruction
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
                                    <Button size="sm" variant="secondary" onClick={() => handleRewriteChapter()}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Just Rewrite
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
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

    

    



    
