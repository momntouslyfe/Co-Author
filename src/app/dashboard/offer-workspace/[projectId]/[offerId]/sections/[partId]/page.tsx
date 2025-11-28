'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useAuthUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { doc, updateDoc, getDoc, collection, deleteField } from 'firebase/firestore';
import type { OfferDraft, Project, OfferSection, ResearchProfile, StyleProfile } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import { Loader2, Bot, Save, Wand2, ArrowLeft, Copy, Sparkles, RefreshCw, BookOpen, BrainCircuit, Pencil, FileText, Palette, Drama } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getIdToken } from '@/lib/client-auth';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { OfferWorkflowNavigation } from '@/components/offer-workflow-navigation';
import { Badge } from '@/components/ui/badge';

export const maxDuration = 300;

const frameworks = [
  { value: "The Hero's Journey", label: "The Hero's Journey" },
  { value: "The Mentor's Journey", label: "The Mentor's Journey" },
  { value: 'Three-Act Structure', label: 'Three-Act Structure' },
  { value: 'Fichtean Curve', label: 'Fichtean Curve' },
  { value: 'Save the Cat', label: 'Save the Cat' },
  { value: 'Story Circle', label: 'Story Circle' },
  { value: 'Seven-Point Story Structure', label: 'Seven-Point Story Structure' },
  { value: "Freytag's Pyramid", label: "Freytag's Pyramid" },
];

type PageState = 'overview' | 'writing' | 'rewriting' | 'generating';

const PartEditor = ({
  project,
  offerDraft,
  partNumber,
  partTitle,
  modules,
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
  onRewritePart,
  user,
  refreshCredits,
}: {
  project: Project;
  offerDraft: OfferDraft;
  partNumber: number;
  partTitle: string;
  modules: OfferSection[];
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
  onRewritePart: (instruction?: string) => void;
  user: any;
  refreshCredits: () => void;
}) => {
  const [isExtending, setIsExtending] = useState<number | null>(null);
  const [extendInstruction, setExtendInstruction] = useState('');
  const [openExtendPopoverIndex, setOpenExtendPopoverIndex] = useState<number | null>(null);
  const [isWritingSection, setIsWritingSection] = useState<number | null>(null);
  const [isRewritingSection, setIsRewritingSection] = useState<number | null>(null);
  const [rewriteSectionInstruction, setRewriteSectionInstruction] = useState('');
  const [openRewritePopoverIndex, setOpenRewritePopoverIndex] = useState<number | null>(null);
  const [rewritePartInstruction, setRewritePartInstruction] = useState('');
  const [isRewritePartPopoverOpen, setRewritePartPopoverOpen] = useState(false);
  const { toast } = useToast();

  const countWords = (text: string): number => {
    const cleanedText = text.replace(/\$\$[^$]+\$\$/g, '');
    const words = cleanedText.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  };

  const wordCount = useMemo(() => countWords(content), [content]);

  const isCanonicalSection = (section: OfferSection): boolean => {
    if (section.sectionType) {
      return section.sectionType === 'introduction' ||
             section.sectionType === 'actionSteps' ||
             section.sectionType === 'comingUp';
    }
    const lower = section.moduleTitle.toLowerCase().trim();
    return lower === 'introduction' ||
           lower === 'your action steps' ||
           lower === 'action steps' ||
           lower === 'coming up next' ||
           lower === 'coming up';
  };

  const coreModuleTitles = modules
    .filter(m => !isCanonicalSection(m))
    .map(m => m.moduleTitle);

  const buildPartSkeleton = useCallback(() => {
    let skeleton = `$$Introduction$$\n\n\n\n`;
    coreModuleTitles.forEach(title => {
      skeleton += `$$${title}$$\n\n\n\n`;
    });
    skeleton += `$$Your Action Steps$$\n\n\n\n`;
    skeleton += `$$Coming Up Next$$\n\n\n\n`;
    return skeleton;
  }, [coreModuleTitles]);

  const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
  const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
  const researchPrompt = relevantResearchProfile
    ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
    : undefined;

  const blueprintSummary = offerDraft.masterBlueprint?.substring(0, 2000) || '';

  const handleExtendClick = async (paragraph: string, sectionIndex: number, paragraphIndex: number, instruction?: string) => {
    if (!user) return;
    
    if (!paragraph || paragraph.trim().length === 0) {
      toast({ title: "No Content", description: "There is no content to extend.", variant: "destructive" });
      return;
    }
    
    const uniqueIndex = sectionIndex * 1000 + paragraphIndex;
    setIsExtending(uniqueIndex);
    setOpenExtendPopoverIndex(null);

    const sections = content.split(/(\$\$[^$]+\$\$)/g);
    const titleToFind = findTitleForSection(sections, sectionIndex);
    const moduleTitle = titleToFind ? titleToFind.replaceAll('$$', '').trim() : 'Section';

    try {
      const idToken = await getIdToken(user);
      const response = await fetch('/api/offers/expand-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          originalContent: paragraph,
          moduleTitle: moduleTitle,
          expansionFocus: instruction || 'Expand this content with more detail',
          styleProfile: selectedStyle?.styleAnalysis,
          language: offerDraft.language || project.language || 'English',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to expand content');
      }

      const result = await response.json();
      if (result && result.expandedContent) {
        onContentChange(prevContent => {
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
          return prevContent;
        });
        refreshCredits();
        toast({ title: "Content Extended", description: "New content has been added." });
      }
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
    const language = offerDraft.language || project.language;
    if (!language) {
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
      const response = await fetch('/api/offers/write-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          offerTitle: offerDraft.title,
          offerCategory: offerDraft.category,
          blueprintSummary: blueprintSummary,
          partTitle: partTitle,
          moduleTitle: sectionTitle,
          allParts: offerDraft.masterBlueprint || '',
          targetWordCount: 500,
          previousContent: currentContentForContext,
          bookContext: project.title ? `Book: ${project.title}. ${project.description || ''}` : undefined,
          language: language,
          styleProfile: selectedStyle?.styleAnalysis,
          researchProfile: researchPrompt,
          storytellingFramework: selectedFramework,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to write section');
      }

      const result = await response.json();
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
        refreshCredits();
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
    
    if (!sectionContentToRewrite || sectionContentToRewrite.trim().length === 0) {
      toast({ title: "No Content", description: "There is no content to rewrite. Please write the section first.", variant: "destructive" });
      return;
    }
    
    const language = offerDraft.language || project.language;
    if (!language) {
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
      const needsFullContext = title === 'Your Action Steps' || title === 'Coming Up Next';

      const response = await fetch('/api/offers/rewrite-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          originalContent: sectionContentToRewrite,
          moduleTitle: title,
          styleProfile: selectedStyle?.styleAnalysis,
          researchProfile: researchPrompt,
          storytellingFramework: selectedFramework !== 'none' ? selectedFramework : undefined,
          language: language,
          rewriteInstructions: instruction,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rewrite section');
      }

      const result = await response.json();
      if (result && result.rewrittenContent) {
        onContentChange(prevContent => {
          const currentSections = prevContent.split(/(\$\$[^$]+\$\$)/g);
          const currentTitleToFind = findTitleForSection(currentSections, sectionIndex);
          if (!currentTitleToFind) return prevContent;

          const titleIndex = currentSections.findIndex(s => s.trim() === currentTitleToFind.trim());
          if (titleIndex !== -1) {
            if (titleIndex + 1 >= currentSections.length || currentSections[titleIndex + 1].startsWith('$$')) {
              currentSections.splice(titleIndex + 1, 0, '');
            }
            currentSections[titleIndex + 1] = `\n\n${result.rewrittenContent.trim()}\n\n`;
            return currentSections.join('');
          }
          return prevContent;
        });
        refreshCredits();
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

  const handleWriteFullPart = useCallback(async () => {
    const language = offerDraft.language || project.language;
    if (!language) {
      toast({ title: "Missing Information", description: "Project language is required.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);

    const allSectionTitles = ["Introduction", ...coreModuleTitles, "Your Action Steps", "Coming Up Next"];
    onContentChange(buildPartSkeleton());

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
        const response = await fetch('/api/offers/write-section', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            offerTitle: offerDraft.title,
            offerCategory: offerDraft.category,
            blueprintSummary: blueprintSummary,
            partTitle: partTitle,
            moduleTitle: sectionTitle,
            allParts: offerDraft.masterBlueprint || '',
            targetWordCount: 500,
            previousContent: currentContentForContext,
            bookContext: project.title ? `Book: ${project.title}. ${project.description || ''}` : undefined,
            language: language,
            styleProfile: selectedStyle?.styleAnalysis,
            researchProfile: researchPrompt,
            storytellingFramework: selectedFramework,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to write section');
        }

        const result = await response.json();
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
          refreshCredits();
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
            const response = await fetch('/api/offers/write-section', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                offerTitle: offerDraft.title,
                offerCategory: offerDraft.category,
                blueprintSummary: blueprintSummary,
                partTitle: partTitle,
                moduleTitle: failedSection.title,
                allParts: offerDraft.masterBlueprint || '',
                targetWordCount: 500,
                previousContent: currentContentForContext,
                bookContext: project.title ? `Book: ${project.title}. ${project.description || ''}` : undefined,
                language: language,
                styleProfile: selectedStyle?.styleAnalysis,
                researchProfile: researchPrompt,
                storytellingFramework: selectedFramework,
              }),
            });

            if (response.ok) {
              const result = await response.json();
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
                refreshCredits();
                retrySuccess = true;
                successfulSections.push(failedSection.title);
                toast({
                  title: "Section Recovered",
                  description: `Successfully generated "${failedSection.title}"`
                });
                break;
              }
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
          title: "Part Partially Complete",
          description: `${successfulSections.length} of ${allSectionTitles.length} sections generated. Failed: ${stillFailedSections.join(', ')}. Please try regenerating the failed sections individually.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Part Complete",
          description: `All ${allSectionTitles.length} sections generated successfully!`
        });
      }
    } else {
      toast({
        title: "Part Complete",
        description: `All ${allSectionTitles.length} sections generated successfully!`
      });
    }

    setIsWritingSection(null);
    setIsGenerating(false);
  }, [
    project, offerDraft, partTitle, coreModuleTitles, buildPartSkeleton,
    selectedStyle, researchPrompt, selectedFramework, blueprintSummary,
    onContentChange, setIsGenerating, toast, user, refreshCredits
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
            sectionContent.trim().split('\n\n').filter(p => p.trim()).map((paragraph, pIndex) => {
              const trimmedParagraph = paragraph.trim();
              const h2Match = trimmedParagraph.match(/^##\s+(.+)$/m);
              const h3Match = trimmedParagraph.match(/^###\s+(.+)$/m);

              if (h3Match) {
                return (
                  <div key={`p-container-${sectionIndex}-${pIndex}`} className="mb-4">
                    <h5 className="text-base font-semibold text-foreground">{h3Match[1]}</h5>
                  </div>
                );
              }

              if (h2Match) {
                return (
                  <div key={`p-container-${sectionIndex}-${pIndex}`} className="mb-4">
                    <h4 className="text-lg font-semibold text-foreground">{h2Match[1]}</h4>
                  </div>
                );
              }

              return (
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
                            <Textarea id={`instruction-${sectionIndex}-${pIndex}`} placeholder="e.g., Add a practical example" value={extendInstruction} onChange={(e) => setExtendInstruction(e.target.value)} />
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
              );
            })
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

  const handleLocalRewritePart = (instruction?: string) => {
    setRewritePartPopoverOpen(false);
    onRewritePart(instruction);
  };

  return (
    <div className="prose max-w-none dark:prose-invert space-y-8">
      <div className="flex justify-end gap-2 mb-4 sticky top-0 bg-background py-2 z-10">
        <Button variant="outline" size="sm" onClick={handleWriteFullPart} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          {isGenerating ? 'Writing...' : 'Write Full Part'}
        </Button>
        <Popover open={isRewritePartPopoverOpen} onOpenChange={setRewritePartPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={isGenerating}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Rewrite Part
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Guided Part Rewrite</h4>
                <p className="text-sm text-muted-foreground">Provide specific instructions for the rewrite.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rewrite-part-instruction" className="sr-only">Instruction</Label>
                <Textarea id="rewrite-part-instruction" placeholder="e.g., Make it more formal and add more examples." value={rewritePartInstruction} onChange={(e) => setRewritePartInstruction(e.target.value)} />
                <Button size="sm" onClick={() => handleLocalRewritePart(rewritePartInstruction)} disabled={!rewritePartInstruction || isGenerating}>
                  <Pencil className="mr-2 h-4 w-4" /> Rewrite with My Instruction
                </Button>
              </div>
              <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-popover px-2 text-muted-foreground">Or</span></div></div>
              <Button size="sm" variant="secondary" onClick={() => handleLocalRewritePart()} disabled={isGenerating}>
                <RefreshCw className="mr-2 h-4 w-4" /> Just Rewrite Part
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

export default function PartWritingPage() {
  const { toast } = useToast();
  const params = useParams<{ projectId: string; offerId: string; partId: string }>();
  const projectId = params.projectId;
  const offerId = params.offerId;
  const partId = params.partId;
  const partNumber = partId.startsWith('part-') ? parseInt(partId.replace('part-', ''), 10) : parseInt(partId, 10);

  const { user } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const [pageState, setPageState] = useState<PageState>('overview');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('none');
  const [selectedResearchId, setSelectedResearchId] = useState<string>('none');
  const [selectedFramework, setSelectedFramework] = useState<string>('none');

  const [offerDraft, setOfferDraft] = useState<OfferDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  const researchProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'researchProfiles');
  }, [user, firestore]);

  const styleProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'styleProfiles');
  }, [user, firestore]);

  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);
  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);

  useEffect(() => {
    const loadOfferDraft = async () => {
      if (!user || !projectId || !offerId) return;

      try {
        const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
        const draftSnap = await getDoc(draftRef);

        if (draftSnap.exists()) {
          const draft = { id: draftSnap.id, ...draftSnap.data() } as OfferDraft;
          setOfferDraft(draft);

          if (draft.researchProfileId) {
            setSelectedResearchId(draft.researchProfileId);
          }
          if (draft.styleProfileId) {
            setSelectedStyleId(draft.styleProfileId);
          }
          if (draft.storytellingFramework) {
            setSelectedFramework(draft.storytellingFramework);
          }

          const partSections = draft.sections?.filter(s => s.partNumber === partNumber) || [];

          const isCanonicalType = (s: OfferSection): 'introduction' | 'actionSteps' | 'comingUp' | null => {
            if (s.sectionType === 'introduction') return 'introduction';
            if (s.sectionType === 'actionSteps') return 'actionSteps';
            if (s.sectionType === 'comingUp') return 'comingUp';
            const lower = s.moduleTitle.toLowerCase().trim();
            if (lower === 'introduction') return 'introduction';
            if (lower === 'your action steps' || lower === 'action steps') return 'actionSteps';
            if (lower === 'coming up next' || lower === 'coming up') return 'comingUp';
            return null;
          };

          const coreModules = partSections.filter(s => !isCanonicalType(s));
          const introSection = partSections.find(s => isCanonicalType(s) === 'introduction');
          const actionSection = partSections.find(s => isCanonicalType(s) === 'actionSteps');
          const comingSection = partSections.find(s => isCanonicalType(s) === 'comingUp');

          const hasAnyContent = partSections.some(s => s.content);

          if (hasAnyContent) {
            let reconstructed = `$$Introduction$$\n\n${introSection?.content || ''}\n\n`;
            coreModules.forEach(m => {
              reconstructed += `$$${m.moduleTitle}$$\n\n${m.content || ''}\n\n`;
            });
            reconstructed += `$$Your Action Steps$$\n\n${actionSection?.content || ''}\n\n`;
            reconstructed += `$$Coming Up Next$$\n\n${comingSection?.content || ''}\n\n`;
            setContent(reconstructed);
            setPageState('writing');
          } else {
            let skeleton = `$$Introduction$$\n\n\n\n`;
            coreModules.forEach(m => {
              skeleton += `$$${m.moduleTitle}$$\n\n\n\n`;
            });
            skeleton += `$$Your Action Steps$$\n\n\n\n`;
            skeleton += `$$Coming Up Next$$\n\n\n\n`;
            setContent(skeleton);
          }
        }
      } catch (error) {
        console.error('Error loading offer draft:', error);
        toast({ title: 'Error', description: 'Failed to load offer draft.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    loadOfferDraft();
  }, [user, firestore, projectId, offerId, partNumber, toast]);

  const partSections = useMemo(() => {
    if (!offerDraft) return [];
    return offerDraft.sections?.filter(s => s.partNumber === partNumber) || [];
  }, [offerDraft, partNumber]);

  const partTitle = partSections[0]?.partTitle || `Part ${partNumber}`;

  const extractSectionContent = (fullContent: string, sectionTitle: string): string => {
    const regex = new RegExp(`\\$\\$${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\$\\$([\\s\\S]*?)(?=\\$\\$|$)`, 'i');
    const match = fullContent.match(regex);
    return match ? match[1].trim() : '';
  };

  const handleSaveContent = useCallback(async () => {
    if (!user || !offerDraft) return;
    setIsSaving(true);
    try {
      const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);

      const getCanonicalType = (s: OfferSection): 'introduction' | 'actionSteps' | 'comingUp' | null => {
        if (s.sectionType === 'introduction') return 'introduction';
        if (s.sectionType === 'actionSteps') return 'actionSteps';
        if (s.sectionType === 'comingUp') return 'comingUp';
        const lower = s.moduleTitle.toLowerCase().trim();
        if (lower === 'introduction') return 'introduction';
        if (lower === 'your action steps' || lower === 'action steps') return 'actionSteps';
        if (lower === 'coming up next' || lower === 'coming up') return 'comingUp';
        return null;
      };

      const countWords = (text: string): number => {
        const cleanedText = text.replace(/\$\$[^$]+\$\$/g, '');
        return cleanedText.trim().split(/\s+/).filter(word => word.length > 0).length;
      };

      const currentPartTitle = partSections[0]?.partTitle || `Part ${partNumber}`;

      const existingSectionsForPart = offerDraft.sections.filter(s => s.partNumber === partNumber);
      const hasIntro = existingSectionsForPart.some(s => getCanonicalType(s) === 'introduction');
      const hasActionSteps = existingSectionsForPart.some(s => getCanonicalType(s) === 'actionSteps');
      const hasComingUp = existingSectionsForPart.some(s => getCanonicalType(s) === 'comingUp');

      let updatedSections = offerDraft.sections.map(section => {
        if (section.partNumber === partNumber) {
          let sectionContent = '';
          const canonicalType = getCanonicalType(section);

          if (canonicalType === 'introduction') {
            sectionContent = extractSectionContent(content, 'Introduction');
          } else if (canonicalType === 'actionSteps') {
            sectionContent = extractSectionContent(content, 'Your Action Steps');
          } else if (canonicalType === 'comingUp') {
            sectionContent = extractSectionContent(content, 'Coming Up Next');
          } else {
            sectionContent = extractSectionContent(content, section.moduleTitle);
          }

          const wordCount = countWords(sectionContent);
          return {
            ...section,
            content: sectionContent,
            wordCount,
            status: sectionContent ? 'completed' : 'pending',
          };
        }
        return section;
      });

      if (!hasIntro) {
        const introContent = extractSectionContent(content, 'Introduction');
        updatedSections.push({
          id: `part-${partNumber}-intro`,
          partNumber,
          partTitle: currentPartTitle,
          moduleTitle: 'Introduction',
          sectionType: 'introduction',
          content: introContent,
          wordCount: countWords(introContent),
          status: introContent ? 'completed' : 'pending',
        } as OfferSection);
      }

      if (!hasActionSteps) {
        const actionContent = extractSectionContent(content, 'Your Action Steps');
        updatedSections.push({
          id: `part-${partNumber}-action`,
          partNumber,
          partTitle: currentPartTitle,
          moduleTitle: 'Your Action Steps',
          sectionType: 'actionSteps',
          content: actionContent,
          wordCount: countWords(actionContent),
          status: actionContent ? 'completed' : 'pending',
        } as OfferSection);
      }

      if (!hasComingUp) {
        const comingUpContent = extractSectionContent(content, 'Coming Up Next');
        updatedSections.push({
          id: `part-${partNumber}-comingup`,
          partNumber,
          partTitle: currentPartTitle,
          moduleTitle: 'Coming Up Next',
          sectionType: 'comingUp',
          content: comingUpContent,
          wordCount: countWords(comingUpContent),
          status: comingUpContent ? 'completed' : 'pending',
        } as OfferSection);
      }

      const updateData: Record<string, any> = {
        sections: updatedSections,
        updatedAt: new Date().toISOString(),
      };

      if (selectedResearchId && selectedResearchId !== 'none') {
        updateData.researchProfileId = selectedResearchId;
      } else {
        updateData.researchProfileId = deleteField();
      }
      if (selectedStyleId && selectedStyleId !== 'none') {
        updateData.styleProfileId = selectedStyleId;
      } else {
        updateData.styleProfileId = deleteField();
      }
      if (selectedFramework && selectedFramework !== 'none') {
        updateData.storytellingFramework = selectedFramework;
      } else {
        updateData.storytellingFramework = deleteField();
      }

      await updateDoc(draftRef, updateData);

      setOfferDraft(prev => {
        if (!prev) return null;
        const updated: OfferDraft = {
          ...prev,
          sections: updatedSections as OfferSection[],
        };
        if (selectedResearchId !== 'none') {
          updated.researchProfileId = selectedResearchId;
        } else {
          delete updated.researchProfileId;
        }
        if (selectedStyleId !== 'none') {
          updated.styleProfileId = selectedStyleId;
        } else {
          delete updated.styleProfileId;
        }
        if (selectedFramework !== 'none') {
          updated.storytellingFramework = selectedFramework;
        } else {
          delete updated.storytellingFramework;
        }
        return updated;
      });
      toast({ title: 'Saved!', description: 'Your progress has been saved.' });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({ title: 'Error', description: 'Failed to save content.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [user, firestore, projectId, offerId, offerDraft, content, partNumber, partSections, selectedResearchId, selectedStyleId, selectedFramework, toast]);

  const handleCopyContent = useCallback(async () => {
    let htmlContent = '';
    let plainContent = '';

    const formatContentToHtml = (text: string): string => {
      const lines = text.split('\n');
      let result = '';
      let inList = false;
      let listType = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          if (inList) {
            result += listType === 'ul' ? '</ul>' : '</ol>';
            inList = false;
            listType = '';
          }
          continue;
        }

        const h2Match = line.match(/^##\s+(.+)$/);
        const h3Match = line.match(/^###\s+(.+)$/);
        const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
        const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/);

        if (h3Match) {
          if (inList) {
            result += listType === 'ul' ? '</ul>' : '</ol>';
            inList = false;
            listType = '';
          }
          result += `<h4>${h3Match[1]}</h4>`;
        } else if (h2Match) {
          if (inList) {
            result += listType === 'ul' ? '</ul>' : '</ol>';
            inList = false;
            listType = '';
          }
          result += `<h3>${h2Match[1]}</h3>`;
        } else if (bulletMatch) {
          if (!inList || listType !== 'ul') {
            if (inList) result += listType === 'ul' ? '</ul>' : '</ol>';
            result += '<ul>';
            inList = true;
            listType = 'ul';
          }
          result += `<li>${bulletMatch[1]}</li>`;
        } else if (numberedMatch) {
          if (!inList || listType !== 'ol') {
            if (inList) result += listType === 'ul' ? '</ul>' : '</ol>';
            result += '<ol>';
            inList = true;
            listType = 'ol';
          }
          result += `<li>${numberedMatch[1]}</li>`;
        } else {
          if (inList) {
            result += listType === 'ul' ? '</ul>' : '</ol>';
            inList = false;
            listType = '';
          }
          result += `<p>${line}</p>`;
        }
      }

      if (inList) {
        result += listType === 'ul' ? '</ul>' : '</ol>';
      }

      return result;
    };

    htmlContent += `<h1>${partTitle}</h1>`;
    plainContent += `${partTitle}\n\n`;

    const parts = content.split(/(\$\$[^$]+\$\$)/g).filter(s => s.trim() !== '');

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const sectionTitle = part.replace(/\$\$/g, '').trim();
        const nextPart = (i + 1 < parts.length && !parts[i + 1].startsWith('$$')) ? parts[i + 1].trim() : '';

        if (sectionTitle === 'Introduction') {
          if (nextPart) {
            htmlContent += formatContentToHtml(nextPart);
            plainContent += `${nextPart}\n\n`;
          }
          if (nextPart) i++;
        } else if (sectionTitle === 'Your Action Steps' || sectionTitle === 'Coming Up Next') {
          if (nextPart) {
            htmlContent += formatContentToHtml(nextPart);
            plainContent += `${nextPart}\n\n`;
          }
          if (nextPart) i++;
        } else {
          htmlContent += `<h2>${sectionTitle}</h2>`;
          plainContent += `${sectionTitle}\n`;
          if (nextPart) {
            htmlContent += formatContentToHtml(nextPart);
            plainContent += `${nextPart}\n\n`;
            i++;
          }
        }
      }
    }

    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const plainBlob = new Blob([plainContent.trim()], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': plainBlob,
        }),
      ]);
      toast({ title: 'Content Copied', description: 'Part with formatted headings copied to clipboard.' });
    } catch (err) {
      navigator.clipboard.writeText(plainContent.trim());
      toast({ title: 'Content Copied', description: 'Part content copied to clipboard.' });
    }
  }, [content, partTitle, toast]);

  const handleRewritePart = useCallback(async (instruction?: string) => {
    if (!user || !project) return;
    
    const contentToRewrite = content.replace(/\$\$[^$]+\$\$/g, '').trim();
    if (!contentToRewrite || contentToRewrite.length === 0) {
      toast({ title: "No Content", description: "There is no written content to rewrite. Please write some sections first.", variant: "destructive" });
      return;
    }
    
    setPageState('rewriting');

    try {
      const idToken = await getIdToken(user);
      const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
      const stylePrompt = selectedStyle ? selectedStyle.styleAnalysis : undefined;
      const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
      const researchPrompt = relevantResearchProfile
        ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
        : undefined;

      const response = await fetch('/api/offers/rewrite-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          originalContent: content,
          moduleTitle: partTitle,
          styleProfile: stylePrompt,
          researchProfile: researchPrompt,
          storytellingFramework: selectedFramework !== 'none' ? selectedFramework : undefined,
          language: offerDraft?.language || project.language || 'English',
          rewriteInstructions: instruction,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rewrite part');
      }

      const result = await response.json();
      if (result && result.rewrittenContent) {
        setContent(result.rewrittenContent);
        refreshCredits();
        toast({ title: "Part Rewritten", description: "The AI has rewritten the part." });
      } else {
        throw new Error("AI returned empty content during rewrite.");
      }
    } catch (error) {
      console.error("Error rewriting part:", error);
      toast({ title: "AI Rewrite Failed", variant: "destructive", description: "Could not rewrite the part. Please try again." });
    } finally {
      setPageState('writing');
    }
  }, [content, styleProfiles, selectedStyleId, toast, project, selectedFramework, researchProfiles, selectedResearchId, offerDraft, user, refreshCredits]);

  const handleProceedToEditor = () => {
    setPageState('writing');
  };

  if (isLoading || isProjectLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!offerDraft || !project) {
    return notFound();
  }

  if (isNaN(partNumber) || partSections.length === 0) {
    return notFound();
  }

  if (pageState === 'overview') {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}/sections`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Parts
            </Link>
          </Button>
        </div>

        <OfferWorkflowNavigation
          projectId={projectId}
          offerId={offerId}
          currentStep="sections"
          offerHasBlueprint={!!offerDraft?.masterBlueprint}
          offerHasTitle={!!offerDraft?.title}
        />

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <Badge variant="outline" className="mb-2">
                {OFFER_CATEGORY_LABELS[offerDraft.category]}
              </Badge>
              <CardTitle className="font-headline text-xl">Part {partNumber}: {partTitle}</CardTitle>
              <CardDescription>This part contains {partSections.length} modules to write.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card className="bg-secondary/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI Writing Context
                </CardTitle>
                <CardDescription>The AI will use the following context to write this part. You can change these settings before writing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 mt-1 text-primary" />
                    <div>
                      <h4 className="font-semibold">Part Modules</h4>
                      {partSections.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1 text-sm mt-1">
                          {partSections.map((section, index) => (
                            <li key={index}>{section.moduleTitle}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">No modules found for this part.</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Drama className="w-5 h-5 mt-1 text-primary" />
                    <div className="w-full">
                      <h4 className="font-semibold">Storytelling Framework</h4>
                      <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select a framework" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
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
                    <div className="w-full">
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
                    <div className="w-full">
                      <label htmlFor="style-select" className="font-semibold">
                        Writing Style
                      </label>
                      <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                        <SelectTrigger id="style-select" className="mt-2">
                          <SelectValue placeholder="Select a style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Default (AI's own style)</SelectItem>
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
    <>
      <div className="space-y-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}/sections`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Parts
            </Link>
          </Button>
        </div>

        <OfferWorkflowNavigation
          projectId={projectId}
          offerId={offerId}
          currentStep="sections"
          offerHasBlueprint={!!offerDraft?.masterBlueprint}
          offerHasTitle={!!offerDraft?.title}
        />

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <Badge variant="outline" className="mb-2">
                {OFFER_CATEGORY_LABELS[offerDraft.category]}
              </Badge>
              <CardTitle className="font-headline text-xl">Part {partNumber}: {partTitle}</CardTitle>
              <CardDescription>Writing {partSections.length} modules</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setPageState('overview')} variant="outline">Back to Overview</Button>
              <Button asChild variant="outline">
                <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}/sections`}>Parts List</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pageState === 'rewriting' ? (
              <div className="flex h-[65vh] flex-col items-center justify-center space-y-4 rounded-md border border-dashed">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-lg font-semibold">AI is working...</p>
                  <p className="text-muted-foreground">Rewriting part...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <PartEditor
                    project={project}
                    offerDraft={offerDraft}
                    partNumber={partNumber}
                    partTitle={partTitle}
                    modules={partSections}
                    content={content}
                    onContentChange={setContent}
                    onCopyContent={handleCopyContent}
                    selectedStyleId={selectedStyleId}
                    styleProfiles={styleProfiles || null}
                    selectedResearchId={selectedResearchId}
                    researchProfiles={researchProfiles || null}
                    selectedFramework={selectedFramework}
                    isGenerating={isGenerating}
                    setIsGenerating={setIsGenerating}
                    onRewritePart={handleRewritePart}
                    user={user}
                    refreshCredits={refreshCredits}
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
    </>
  );
}
