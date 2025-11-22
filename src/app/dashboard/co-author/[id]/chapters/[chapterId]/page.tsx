
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, arrayRemove, collection } from 'firebase/firestore';
import type { Project } from '@/lib/definitions';
import { Loader2, Bot, Save, Wand2, ArrowLeft, Copy, Sparkles, RefreshCw, BookOpen, BrainCircuit, Drama, Pencil, FileText, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { expandBookContent } from '@/ai/flows/expand-book-content';
import type { Chapter, ResearchProfile, StyleProfile } from '@/lib/definitions';
import { rewriteChapter } from '@/ai/flows/rewrite-chapter';
import { rewriteSection } from '@/ai/flows/rewrite-section';
import { writeChapterSection } from '@/ai/flows/write-chapter-section';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getIdToken } from '@/lib/client-auth';


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
type PageState = 'overview' | 'writing' | 'rewriting' | 'generating';

// New Component for the interactive editor
const ChapterEditor = ({ 
    project, 
    chapterDetails,
    subTopics,
    content, 
    onContentChange, 
    onCopyContent,
    selectedStyleId, 
    styleProfiles,
    selectedResearchId,
    researchProfiles,
    selectedFramework,
    isGenerating,
    setIsGenerating,
    onRewriteChapter,
    user,
}: { 
    project: Project, 
    chapterDetails: Chapter, 
    subTopics: string[],
    content: string; 
    onContentChange: (newContent: string | ((prev: string) => string)) => void;
    onCopyContent: () => void;
    selectedStyleId: string; 
    styleProfiles: StyleProfile[] | null;
    selectedResearchId: string;
    researchProfiles: ResearchProfile[] | null;
    selectedFramework: string;
    isGenerating: boolean;
    setIsGenerating: (isGenerating: boolean) => void;
    onRewriteChapter: (instruction?: string) => void;
    user: any;
}) => {
    
    const [isExtending, setIsExtending] = useState<number | null>(null);
    const [extendInstruction, setExtendInstruction] = useState('');
    const [openExtendPopoverIndex, setOpenExtendPopoverIndex] = useState<number | null>(null);
    
    const [isWritingSection, setIsWritingSection] = useState<number | null>(null);
    const [isRewritingSection, setIsRewritingSection] = useState<number | null>(null);
    const [rewriteSectionInstruction, setRewriteSectionInstruction] = useState('');
    const [openRewritePopoverIndex, setOpenRewritePopoverIndex] = useState<number | null>(null);
    
    const { toast } = useToast();
    const [rewriteChapterInstruction, setRewriteChapterInstruction] = useState('');
    const [isRewriteChapterPopoverOpen, setRewriteChapterPopoverOpen] = useState(false);

    // Utility function to count words in content
    const countWords = (text: string): number => {
        // Remove section markers ($$...$$)
        const cleanedText = text.replace(/\$\$[^$]+\$\$/g, '');
        // Remove extra whitespace and split by whitespace
        const words = cleanedText.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    };

    const wordCount = useMemo(() => countWords(content), [content]);

    const buildChapterSkeleton = useCallback(() => {
        let skeleton = `$$Introduction$$\n\n\n\n`;
        subTopics.forEach(topic => {
          skeleton += `$$${topic}$$\n\n\n\n`;
        });
        skeleton += `$$Your Action Step$$\n\n\n\n`;
        skeleton += `$$Coming Up Next$$\n\n\n\n`;
        return skeleton;
    }, [subTopics]);

    // Helper to get selected profiles
    const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
    const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
    const researchPrompt = relevantResearchProfile
        ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
        : undefined;

    const handleExtendClick = async (paragraph: string, sectionIndex: number, paragraphIndex: number, instruction?: string) => {
        if (!user) return;
        const uniqueIndex = sectionIndex * 1000 + paragraphIndex;
        setIsExtending(uniqueIndex);
        setOpenExtendPopoverIndex(null); // Close the popover
        try {
            const idToken = await getIdToken(user);
            const result = await expandBookContent({
                userId: user.uid,
                idToken,
                bookTitle: project.title,
                fullOutline: project.outline || '',
                chapterTitle: chapterDetails.title,
                contentToExpand: paragraph,
                instruction,
                styleProfile: selectedStyle?.styleAnalysis,
                researchProfile: researchPrompt,
                storytellingFramework: selectedFramework,
            });

            onContentChange(prevContent => {
                // Split by the delimiter, but keep the delimiter in the array.
                const sections = prevContent.split(/(\$\$[^$]+\$\$)/g);
                const titleToFind = findTitleForSection(sections, sectionIndex);

                const titleIndex = sections.findIndex(s => s === titleToFind);

                if (titleIndex !== -1 && titleIndex + 1 < sections.length) {
                    const contentPartIndex = titleIndex + 1;
                    const sectionParagraphs = (sections[contentPartIndex] || '').trim().split('\n\n').filter(p => p.trim() !== '');
                    sectionParagraphs.splice(paragraphIndex + 1, 0, result.expandedContent);
                    sections[contentPartIndex] = `\n\n${sectionParagraphs.join('\n\n')}\n\n`;
                    return sections.join('');
                }
                // If something went wrong, return the previous content to avoid data loss
                return prevContent;
            });

            toast({ title: "Content Extended", description: "New content has been added." });

        } catch (error) {
            console.error("Failed to extend content", error);
            toast({ title: "AI Extend Failed", description: "Could not generate additional content.", variant: "destructive" });
        } finally {
            setIsExtending(null);
            setExtendInstruction('');
        }
    };
    
    const findTitleForSection = (sections: string[], sectionIndex: number): string | null => {
        const titleSections = sections.filter(s => s.startsWith('$$') && s.endsWith('$$'));
        if (sectionIndex >= 0 && sectionIndex < titleSections.length) {
            return titleSections[sectionIndex];
        }
        return null;
    };

    const handleWriteSection = async (sectionIndex: number, sectionTitle: string) => {
        if (!user) return;
        if (!project.language) {
            toast({ title: "Language not set", description: "Project language is required to write.", variant: "destructive" });
            return;
        }
    
        setIsWritingSection(sectionIndex);
    
        try {
            const currentContentForContext = await new Promise<string>(resolve => {
                onContentChange(prev => {
                    resolve(prev);
                    return prev;
                });
            });

            const idToken = await getIdToken(user);
            const result = await writeChapterSection({
                userId: user.uid,
                idToken,
                bookTitle: project.title,
                fullOutline: project.outline || '',
                chapterTitle: chapterDetails.title,
                sectionTitle: sectionTitle,
                language: project.language,
                previousContent: currentContentForContext,
                styleProfile: selectedStyle?.styleAnalysis,
                researchProfile: researchPrompt,
                storytellingFramework: selectedFramework,
            });
    
            if (result && result.sectionContent) {
                onContentChange(prevContent => {
                    const sections = prevContent.split(/(\$\$[^$]+\$\$)/g);
                    const titleToFind = `$$${sectionTitle}$$`;
                    const titleIndex = sections.findIndex(s => s.trim() === titleToFind.trim());

                    if (titleIndex !== -1) {
                        const contentIndex = titleIndex + 1;
                        if (contentIndex >= sections.length || sections[contentIndex].startsWith('$$')) {
                            sections.splice(contentIndex, 0, ''); 
                        }
                        sections[contentIndex] = `\n\n${result.sectionContent.trim()}\n\n`;
                        return sections.join('');
                    }
                    return prevContent;
                });
                toast({ title: "Section Written", description: `Successfully generated "${sectionTitle}"` });
            } else {
                throw new Error("AI returned no content");
            }
    
        } catch (error) {
            console.error("Error writing section:", error);
            toast({ title: "AI Write Failed", variant: "destructive", description: `Could not generate the section. ${error}` });
        } finally {
            setIsWritingSection(null);
        }
    };

    const handleRewriteSection = async (sectionIndex: number, sectionContentToRewrite: string, instruction?: string) => {
        if (!user) return;
        if (!project.language) {
            toast({ title: "Language not set", description: "Project language is required to rewrite.", variant: "destructive" });
            return;
        }
    
        setIsRewritingSection(sectionIndex);
        setOpenRewritePopoverIndex(null);
    
        try {
            const idToken = await getIdToken(user);
            const allSections = content.split(/(\$\$[^$]+\$\$)/g);
            const titleToFind = findTitleForSection(allSections, sectionIndex);

            if (!titleToFind) {
                throw new Error("Could not find the section title to determine context needs.");
            }
            
            const title = titleToFind.replaceAll('$$', '').trim();
            const needsFullContext = title === 'Your Action Step' || title === 'Coming Up Next';
    
            const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
            const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
            const researchPrompt = relevantResearchProfile
                ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
                : undefined;

            const result = await rewriteSection({
                userId: user.uid,
                idToken,
                sectionContent: sectionContentToRewrite,
                chapterContent: needsFullContext ? content : undefined,
                styleProfile: selectedStyle?.styleAnalysis,
                researchProfile: researchPrompt,
                storytellingFramework: selectedFramework,
                language: project.language,
                instruction,
            });
    
            if (result && result.rewrittenSection) {
                 onContentChange(prevContent => {
                    const currentSections = prevContent.split(/(\$\$[^$]+\$\$)/g);
                    const currentTitleToFind = findTitleForSection(currentSections, sectionIndex);
                    if (!currentTitleToFind) return prevContent;

                    const titleIndex = currentSections.findIndex(s => s.trim() === currentTitleToFind.trim());
                    if (titleIndex !== -1) {
                         if (titleIndex + 1 >= currentSections.length || currentSections[titleIndex + 1].startsWith('$$')) {
                            currentSections.splice(titleIndex + 1, 0, ''); 
                        }
                        currentSections[titleIndex + 1] = `\n\n${result.rewrittenSection.trim()}\n\n`;
                        return currentSections.join('');
                    }
                    return prevContent;
                });
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


    const handleWriteFullChapter = useCallback(async () => {
        if (!project.language) {
          toast({ title: "Missing Information", description: "Project language is required.", variant: "destructive" });
          return;
        }
        setIsGenerating(true);
    
        const allSectionTitles = ["Introduction", ...subTopics, "Your Action Step", "Coming Up Next"];
        onContentChange(buildChapterSkeleton());
    
        const failedSections: Array<{ index: number; title: string; error: any }> = [];
        const successfulSections: string[] = [];
    
        for (const [index, sectionTitle] of allSectionTitles.entries()) {
          setIsWritingSection(index);
          try {
            const currentContentForContext = await new Promise<string>(resolve => {
                onContentChange(prev => {
                    resolve(prev);
                    return prev;
                });
            });

            const idToken = await getIdToken(user!);
            const result = await writeChapterSection({
              userId: user!.uid,
              idToken,
              bookTitle: project.title,
              fullOutline: project.outline || '',
              chapterTitle: chapterDetails.title,
              sectionTitle: sectionTitle,
              language: project.language,
              previousContent: currentContentForContext,
              styleProfile: selectedStyle?.styleAnalysis,
              researchProfile: researchPrompt,
              storytellingFramework: selectedFramework,
            });
    
            if (result && result.sectionContent) {
                onContentChange(prevContent => {
                    const sections = prevContent.split(/(\$\$[^$]+\$\$)/g);
                    const titleToFind = `$$${sectionTitle}$$`;
                    const titleIndex = sections.findIndex(s => s.trim() === titleToFind.trim());

                    if (titleIndex !== -1) {
                        const contentIndex = titleIndex + 1;
                         if (contentIndex >= sections.length || sections[contentIndex].startsWith('$$')) {
                            sections.splice(contentIndex, 0, ''); 
                        }
                        sections[contentIndex] = `\n\n${result.sectionContent.trim()}\n\n`;
                        return sections.join('');
                    }
                    return prevContent;
                });
                successfulSections.push(sectionTitle);
            } else {
              failedSections.push({ index, title: sectionTitle, error: new Error("AI returned no content") });
              toast({ title: "Section Pending", description: `Section "${sectionTitle}" will be retried...`, variant: "default" });
            }
          } catch (sectionError) {
            console.error(`Error generating section "${sectionTitle}":`, sectionError);
            failedSections.push({ index, title: sectionTitle, error: sectionError });
            toast({ title: "Section Pending", description: `Section "${sectionTitle}" will be retried...`, variant: "default" });
          }
        }
        
        if (failedSections.length > 0) {
          toast({ 
            title: "Retrying Failed Sections", 
            description: `Retrying ${failedSections.length} section(s) that failed initially...` 
          });
          
          const stillFailedSections: string[] = [];
          
          for (const failedSection of failedSections) {
            setIsWritingSection(failedSection.index);
            
            let retrySuccess = false;
            for (let retryAttempt = 1; retryAttempt <= 2; retryAttempt++) {
              try {
                await new Promise(resolve => setTimeout(resolve, 3000 * retryAttempt));
                
                const currentContentForContext = await new Promise<string>(resolve => {
                    onContentChange(prev => {
                        resolve(prev);
                        return prev;
                    });
                });

                const idToken = await getIdToken(user!);
                const result = await writeChapterSection({
                  userId: user!.uid,
                  idToken,
                  bookTitle: project.title,
                  fullOutline: project.outline || '',
                  chapterTitle: chapterDetails.title,
                  sectionTitle: failedSection.title,
                  language: project.language,
                  previousContent: currentContentForContext,
                  styleProfile: selectedStyle?.styleAnalysis,
                  researchProfile: researchPrompt,
                  storytellingFramework: selectedFramework,
                });
        
                if (result && result.sectionContent) {
                    onContentChange(prevContent => {
                        const sections = prevContent.split(/(\$\$[^$]+\$\$)/g);
                        const titleToFind = `$$${failedSection.title}$$`;
                        const titleIndex = sections.findIndex(s => s.trim() === titleToFind.trim());

                        if (titleIndex !== -1) {
                            const contentIndex = titleIndex + 1;
                             if (contentIndex >= sections.length || sections[contentIndex].startsWith('$$')) {
                                sections.splice(contentIndex, 0, ''); 
                            }
                            sections[contentIndex] = `\n\n${result.sectionContent.trim()}\n\n`;
                            return sections.join('');
                        }
                        return prevContent;
                    });
                    retrySuccess = true;
                    successfulSections.push(failedSection.title);
                    toast({ 
                      title: "Section Recovered", 
                      description: `Successfully generated "${failedSection.title}"` 
                    });
                    break;
                }
              } catch (retryError) {
                console.error(`Retry ${retryAttempt} failed for "${failedSection.title}":`, retryError);
                if (retryAttempt === 2) {
                  stillFailedSections.push(failedSection.title);
                }
              }
            }
            
            if (!retrySuccess) {
              toast({ 
                title: "Section Failed", 
                description: `Could not generate "${failedSection.title}" after multiple attempts.`,
                variant: "destructive"
              });
            }
          }
          
          if (stillFailedSections.length > 0) {
            toast({ 
              title: "Chapter Partially Complete", 
              description: `${successfulSections.length} of ${allSectionTitles.length} sections generated. Failed: ${stillFailedSections.join(', ')}. Please try regenerating the failed sections individually.`,
              variant: "destructive"
            });
          } else {
            toast({ 
              title: "Chapter Complete", 
              description: `All ${allSectionTitles.length} sections generated successfully!` 
            });
          }
        } else {
          toast({ 
            title: "Chapter Complete", 
            description: `All ${allSectionTitles.length} sections generated successfully!` 
          });
        }
        
        setIsWritingSection(null);
        setIsGenerating(false);
      }, [
        project, chapterDetails, subTopics, buildChapterSkeleton, 
        selectedStyle, researchPrompt, selectedFramework, 
        onContentChange, setIsGenerating, toast, user
    ]);

    const renderSection = (sectionIndex: number, title: string, sectionContent: string) => {
        const hasContent = sectionContent.trim().length > 0;
        const isPartialContent = hasContent && sectionContent.trim().length < 100;
        const isWriting = isWritingSection === sectionIndex;
        const isRewriting = isRewritingSection === sectionIndex;
        const isProcessing = isWriting || isRewriting || isGenerating;
        const shouldShowWriteButton = !hasContent || isPartialContent;

        return (
            <div key={`section-container-${sectionIndex}`} className="group/section relative pt-4">
                <div className="flex items-center justify-between gap-4 border-b pb-2">
                     <h3 className={`font-headline font-bold ${sectionIndex === 0 ? 'text-2xl' : 'text-xl'}`}>{title}</h3>
                     <div className="flex items-center gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                        {shouldShowWriteButton && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handleWriteSection(sectionIndex, title)}
                                disabled={isProcessing}
                            >
                                {isWriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                {isWriting ? 'Writing...' : isPartialContent ? 'Regenerate Section' : 'Write Section'}
                            </Button>
                        )}
                        {hasContent && !isPartialContent && (
                            <>
                            <Popover open={openRewritePopoverIndex === sectionIndex} onOpenChange={(isOpen) => setOpenRewritePopoverIndex(isOpen ? sectionIndex : null)}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={isProcessing}>
                                        {isRewriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                        {isRewriting ? 'Rewriting...' : 'Rewrite'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Guided Rewrite</h4>
                                        <p className="text-sm text-muted-foreground">Give the AI a specific instruction.</p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor={`rewrite-instruction-${sectionIndex}`} className="sr-only">Instruction</Label>
                                        <Textarea id={`rewrite-instruction-${sectionIndex}`} placeholder="e.g., Make it more concise" value={rewriteSectionInstruction} onChange={(e) => setRewriteSectionInstruction(e.target.value)} />
                                        <Button size="sm" onClick={() => handleRewriteSection(sectionIndex, sectionContent.trim(), rewriteSectionInstruction)} disabled={!rewriteSectionInstruction || isProcessing}>
                                            <Pencil className="mr-2 h-4 w-4" /> Rewrite with My Instruction
                                        </Button>
                                    </div>
                                    <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-popover px-2 text-muted-foreground">Or</span></div></div>
                                    <Button size="sm" variant="secondary" onClick={() => handleRewriteSection(sectionIndex, sectionContent.trim())} disabled={isProcessing}>
                                        <RefreshCw className="mr-2 h-4 w-4" /> Just Rewrite
                                    </Button>
                                </div>
                                </PopoverContent>
                            </Popover>
                            </>
                        )}
                     </div>
                </div>

                <div className="mt-4">
                    {isWriting || isRewriting ? (
                         <div className="space-y-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-5/6" />
                            <Skeleton className="h-6 w-3/4" />
                        </div>
                    ) : hasContent ? (
                        sectionContent.trim().split('\n\n').filter(p => p.trim()).map((paragraph, pIndex) => (
                            <div key={`p-container-${sectionIndex}-${pIndex}`} className="mb-4 group/paragraph">
                                <p className="text-base leading-relaxed whitespace-pre-wrap">{paragraph}</p>
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
                                            <div className="space-y-2"><h4 className="font-medium leading-none">Guided Extend</h4><p className="text-sm text-muted-foreground">Give the AI specific instructions.</p></div>
                                            <div className="grid gap-2">
                                                <Label htmlFor={`instruction-${sectionIndex}-${pIndex}`} className="sr-only">Instruction</Label>
                                                <Textarea id={`instruction-${sectionIndex}-${pIndex}`} placeholder="e.g., Add a historical example" value={extendInstruction} onChange={(e) => setExtendInstruction(e.target.value)} />
                                                <Button size="sm" onClick={() => handleExtendClick(paragraph, sectionIndex, pIndex, extendInstruction)} disabled={!extendInstruction || isExtending === (sectionIndex * 1000 + pIndex)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Write With My Instruction
                                                </Button>
                                            </div>
                                            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-popover px-2 text-muted-foreground">Or</span></div></div>
                                            <Button size="sm" variant="secondary" onClick={() => handleExtendClick(paragraph, sectionIndex, pIndex)} disabled={isExtending === (sectionIndex * 1000 + pIndex)}>
                                                <Wand2 className="mr-2 h-4 w-4" /> Just Write More
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-24 gap-3 border-2 border-dashed rounded-md bg-muted/20">
                           <p className="text-sm text-muted-foreground">This section is empty or was skipped</p>
                           <p className="text-xs text-muted-foreground">Use the button above to generate content</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        const parts = content.split(/(\$\$[^$]+\$\$)/g).filter(s => s.trim() !== '');
        if (parts.length === 0) return null;
    
        const renderedSections: JSX.Element[] = [];
        let sectionIndexCounter = 0;
    
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith('$$') && part.endsWith('$$')) {
                const title = part.replaceAll('$$', '');
                const contentPart = (i + 1 < parts.length && !parts[i + 1].startsWith('$$')) ? parts[i + 1] : '';
                renderedSections.push(renderSection(sectionIndexCounter, title, contentPart));
                sectionIndexCounter++;
                 if (contentPart) {
                    i++; 
                }
            }
        }
        
        return renderedSections;
    };

    const handleLocalRewriteChapter = (instruction?: string) => {
        setRewriteChapterPopoverOpen(false);
        onRewriteChapter(instruction);
    };

    return (
        <div className="prose max-w-none dark:prose-invert space-y-8">
            <div className="flex justify-end gap-2 mb-4 sticky top-0 bg-background py-2 z-10">
                <Button variant="outline" size="sm" onClick={handleWriteFullChapter} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {isGenerating ? 'Writing...' : 'Write Full Chapter'}
                </Button>
                 <Popover open={isRewriteChapterPopoverOpen} onOpenChange={setRewriteChapterPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isGenerating}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Rewrite Chapter
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Guided Chapter Rewrite</h4>
                                <p className="text-sm text-muted-foreground">Provide specific instructions for the rewrite.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rewrite-chapter-instruction" className="sr-only">Instruction</Label>
                                <Textarea id="rewrite-chapter-instruction" placeholder="e.g., Make it more formal and add more examples." value={rewriteChapterInstruction} onChange={(e) => setRewriteChapterInstruction(e.target.value)} />
                                <Button size="sm" onClick={() => handleLocalRewriteChapter(rewriteChapterInstruction)} disabled={!rewriteChapterInstruction || isGenerating}>
                                    <Pencil className="mr-2 h-4 w-4" /> Rewrite with My Instruction
                                </Button>
                            </div>
                            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-popover px-2 text-muted-foreground">Or</span></div></div>
                            <Button size="sm" variant="secondary" onClick={() => handleLocalRewriteChapter()} disabled={isGenerating}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Just Rewrite Chapter
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        {wordCount} {wordCount === 1 ? 'word' : 'words'}
                    </span>
                    <Button variant="outline" size="sm" onClick={onCopyContent}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Text
                    </Button>
                </div>
            </div>
            {renderContent()}
        </div>
    );
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('default');
  const [selectedResearchId, setSelectedResearchId] = useState<string>('none');
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  

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
  
  const buildChapterSkeleton = useCallback(() => {
    if (!chapterDetails) return '';
    let skeleton = `$$Introduction$$\n\n\n\n`; // Add intro section
    subTopics.forEach(topic => {
      skeleton += `$$${topic}$$\n\n\n\n`;
    });
    skeleton += `$$Your Action Step$$\n\n\n\n`;
    skeleton += `$$Coming Up Next$$\n\n\n\n`;
    return skeleton;
  }, [chapterDetails, subTopics]);

  useEffect(() => {
    if (project) {
        // Initialize profiles and framework from project data
        if (project.styleProfileId) {
            setSelectedStyleId(project.styleProfileId);
        }
        if (project.researchProfileId) {
            setSelectedResearchId(project.researchProfileId);
        }
        if (project.storytellingFramework) {
            setSelectedFramework(project.storytellingFramework);
        }
        
        const savedChapter = project.chapters?.find(c => c.id === chapterId);
        if (savedChapter && savedChapter.content) {
            setChapterContent(savedChapter.content);
            setPageState('writing');
        } else if (chapterDetails) {
            // Only set skeleton if there's no saved content
            setChapterContent(buildChapterSkeleton());
        }

        if (project.storytellingFramework) setSelectedFramework(project.storytellingFramework);
        if (project.researchProfileId) setSelectedResearchId(project.researchProfileId);
        if (project.styleProfileId) setSelectedStyleId(project.styleProfileId);

    }
  }, [project, chapterId, chapterDetails, buildChapterSkeleton]);
  

  const handleProceedToEditor = () => {
    setPageState('writing');
  }

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
  
  const handleCopyContent = useCallback(() => {
    // We need to strip the $$ markers for a clean copy
    const cleanContent = chapterContent.replace(/\$\$[^$]+\$\$/g, '\n\n').trim();
    navigator.clipboard.writeText(cleanContent);
    toast({ title: 'Content Copied', description: 'The chapter text has been copied to your clipboard.' });
  }, [chapterContent, toast]);

  const handleRewriteChapter = useCallback(async (instruction?: string) => {
    if (!user) return;
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
        const idToken = await getIdToken(user);
        const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
        const stylePrompt = selectedStyle?.styleAnalysis;

        const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
        const researchPrompt = relevantResearchProfile
            ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
            : undefined;

        const result = await rewriteChapter({
            userId: user.uid,
            idToken,
            chapterContent: chapterContent,
            styleProfile: stylePrompt,
            researchProfile: researchPrompt,
            storytellingFramework: selectedFramework,
            language: project.language,
            instruction,
            model: undefined
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
    }
  }, [chapterContent, styleProfiles, selectedStyleId, toast, project, selectedFramework, researchProfiles, selectedResearchId]);


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
                            <CardDescription>The AI will use the following context to write this chapter. You can change these settings before writing.</CardDescription>
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
                             <div className="p-4 border rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Palette className="w-5 h-5 mt-1 text-primary" />
                                    <div className='w-full'>
                                        <label htmlFor="style-select" className="font-semibold">
                                            Writing Style
                                        </label>
                                        <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                                            <SelectTrigger id="style-select" className="mt-2">
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
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-wrap gap-4">
                         <Button onClick={handleProceedToEditor} size="lg">
                            <Pencil className="mr-2 h-4 w-4" />
                            Proceed to Interactive Editor
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
        <CardHeader className="flex-row items-center justify-between">
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
            {pageState === 'rewriting' ? (
                <div className="flex h-[65vh] flex-col items-center justify-center space-y-4 rounded-md border border-dashed">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                        <p className="text-lg font-semibold">AI is working...</p>
                        <p className="text-muted-foreground">Rewriting chapter...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative">
                        <ChapterEditor
                          project={project}
                          chapterDetails={chapterDetails}
                          subTopics={subTopics}
                          content={chapterContent}
                          onContentChange={setChapterContent}
                          onCopyContent={handleCopyContent}
                          selectedStyleId={selectedStyleId}
                          styleProfiles={styleProfiles}
                          selectedResearchId={selectedResearchId}
                          researchProfiles={researchProfiles}
                          selectedFramework={selectedFramework}
                          isGenerating={isGenerating}
                          setIsGenerating={setIsGenerating}
                          onRewriteChapter={handleRewriteChapter}
                          user={user}
                        />
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleSaveContent} disabled={isSaving || isGenerating}>
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
