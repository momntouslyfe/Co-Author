'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, updateDoc, setDoc, getDoc, collection } from 'firebase/firestore';
import type { OfferDraft, Project, OfferSection, ResearchProfile, StyleProfile } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import { Loader2, Bot, Save, Wand2, ArrowLeft, Copy, Sparkles, RefreshCw, BookOpen, BrainCircuit, Pencil, FileText, Palette } from 'lucide-react';
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

type PageState = 'overview' | 'writing' | 'generating';

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
  isGenerating,
  setIsGenerating,
  user,
  refreshCredits,
  projectId,
  offerId,
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
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  user: any;
  refreshCredits: () => void;
  projectId: string;
  offerId: string;
}) => {
  const [isExtending, setIsExtending] = useState<number | null>(null);
  const [extendInstruction, setExtendInstruction] = useState('');
  const [openExtendPopoverIndex, setOpenExtendPopoverIndex] = useState<number | null>(null);
  const [isWritingSection, setIsWritingSection] = useState<number | null>(null);
  const [isRewritingSection, setIsRewritingSection] = useState<number | null>(null);
  const [rewriteSectionInstruction, setRewriteSectionInstruction] = useState('');
  const [openRewritePopoverIndex, setOpenRewritePopoverIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

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
    const uniqueIndex = sectionIndex * 1000 + paragraphIndex;
    setIsExtending(uniqueIndex);
    setOpenExtendPopoverIndex(null);
    try {
      const idToken = await getIdToken(user);
      const response = await fetch('/api/offers/expand-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          contentToExpand: paragraph,
          instruction: instruction || 'Expand this content with more detail',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to expand content');
      }

      const result = await response.json();
      if (result && result.expandedContent) {
        onContentChange(prevContent => {
          return prevContent.replace(paragraph, result.expandedContent.trim());
        });
        refreshCredits();
        toast({ title: "Content Expanded", description: "The AI has expanded the content." });
      }
    } catch (error) {
      console.error("Error expanding content:", error);
      toast({ title: "Expand Failed", variant: "destructive", description: "Could not expand the content." });
    } finally {
      setIsExtending(null);
      setExtendInstruction('');
    }
  };

  const findTitleForSection = (sections: string[], sectionIndex: number): string | null => {
    let titleCount = 0;
    for (const section of sections) {
      if (section.match(/^\$\$.+\$\$$/)) {
        if (titleCount === sectionIndex) {
          return section;
        }
        titleCount++;
      }
    }
    return null;
  };

  const handleWriteSection = async (sectionIndex: number, sectionTitle: string) => {
    if (!user) return;
    setIsWritingSection(sectionIndex);
    try {
      const currentContentForContext = content;
      const idToken = await getIdToken(user);

      const response = await fetch('/api/offers/write-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bookTitle: project.title,
          bookDescription: project.outline || project.description || '',
          offerTitle: offerDraft.title,
          offerCategory: offerDraft.category,
          partTitle: partTitle,
          sectionTitle: sectionTitle,
          language: offerDraft.language || project.language || 'English',
          previousContent: currentContentForContext,
          styleProfile: selectedStyle?.styleAnalysis,
          researchProfile: researchPrompt,
          blueprintSummary: blueprintSummary,
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
        toast({ title: "Section Written", description: `"${sectionTitle}" has been generated.` });
      }
    } catch (error) {
      console.error("Error writing section:", error);
      toast({ title: "Write Failed", variant: "destructive", description: "Could not write the section." });
    } finally {
      setIsWritingSection(null);
    }
  };

  const handleRewriteSection = async (sectionIndex: number, sectionContent: string, instruction?: string) => {
    if (!user) return;
    setIsRewritingSection(sectionIndex);
    setOpenRewritePopoverIndex(null);
    try {
      const idToken = await getIdToken(user);
      const response = await fetch('/api/offers/rewrite-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          sectionContent: sectionContent,
          instruction: instruction || 'Rewrite this section to be clearer and more engaging',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rewrite section');
      }

      const result = await response.json();
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
        refreshCredits();
        toast({ title: "Section Rewritten", description: "The AI has rewritten the section." });
      }
    } catch (error) {
      console.error("Error rewriting section:", error);
      toast({ title: "Rewrite Failed", variant: "destructive", description: "Could not rewrite the section." });
    } finally {
      setIsRewritingSection(null);
      setRewriteSectionInstruction('');
    }
  };

  const handleWriteFullPart = useCallback(async () => {
    if (!offerDraft.language && !project.language) {
      toast({ title: "Missing Information", description: "Language is required.", variant: "destructive" });
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
            bookTitle: project.title,
            bookDescription: project.outline || project.description || '',
            offerTitle: offerDraft.title,
            offerCategory: offerDraft.category,
            partTitle: partTitle,
            sectionTitle: sectionTitle,
            language: offerDraft.language || project.language || 'English',
            previousContent: currentContentForContext,
            styleProfile: selectedStyle?.styleAnalysis,
            researchProfile: researchPrompt,
            blueprintSummary: blueprintSummary,
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
        }
      } catch (sectionError) {
        console.error(`Error generating section "${sectionTitle}":`, sectionError);
        failedSections.push({ index, title: sectionTitle, error: sectionError });
      }
    }

    if (failedSections.length > 0) {
      toast({
        title: "Retrying Failed Sections",
        description: `Retrying ${failedSections.length} section(s)...`
      });

      for (const failedSection of failedSections) {
        setIsWritingSection(failedSection.index);
        try {
          await new Promise(resolve => setTimeout(resolve, 3000));

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
              bookTitle: project.title,
              bookDescription: project.outline || project.description || '',
              offerTitle: offerDraft.title,
              offerCategory: offerDraft.category,
              partTitle: partTitle,
              sectionTitle: failedSection.title,
              language: offerDraft.language || project.language || 'English',
              previousContent: currentContentForContext,
              styleProfile: selectedStyle?.styleAnalysis,
              researchProfile: researchPrompt,
              blueprintSummary: blueprintSummary,
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
              successfulSections.push(failedSection.title);
              toast({
                title: "Section Recovered",
                description: `Successfully generated "${failedSection.title}"`
              });
            }
          }
        } catch (retryError) {
          console.error(`Retry failed for "${failedSection.title}":`, retryError);
          toast({
            title: "Section Failed",
            description: `Could not generate "${failedSection.title}"`,
            variant: "destructive"
          });
        }
      }
    }

    if (successfulSections.length === allSectionTitles.length) {
      toast({
        title: "Part Complete",
        description: `All ${allSectionTitles.length} sections generated successfully!`
      });
    } else {
      toast({
        title: "Part Partially Complete",
        description: `${successfulSections.length} of ${allSectionTitles.length} sections generated.`,
        variant: successfulSections.length > 0 ? "default" : "destructive"
      });
    }

    setIsWritingSection(null);
    setIsGenerating(false);
  }, [
    project, offerDraft, partTitle, coreModuleTitles, buildPartSkeleton,
    selectedStyle, researchPrompt, blueprintSummary,
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
                {isWriting ? 'Writing...' : isPartialContent ? 'Regenerate' : 'Write Section'}
              </Button>
            )}
            {hasContent && !isPartialContent && (
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
                      <Textarea
                        id={`rewrite-instruction-${sectionIndex}`}
                        placeholder="e.g., Make it more concise"
                        value={rewriteSectionInstruction}
                        onChange={(e) => setRewriteSectionInstruction(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRewriteSection(sectionIndex, sectionContent.trim(), rewriteSectionInstruction)}
                        disabled={!rewriteSectionInstruction || isProcessing}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Rewrite
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
        <div className="py-4 whitespace-pre-wrap">
          {isWriting ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI is writing this section...</span>
            </div>
          ) : hasContent ? (
            sectionContent.split('\n\n').map((paragraph, pIndex) => {
              if (!paragraph.trim()) return null;
              const uniqueIndex = sectionIndex * 1000 + pIndex;
              const isThisExtending = isExtending === uniqueIndex;
              return (
                <div key={pIndex} className="group/paragraph relative mb-4">
                  <p className="leading-relaxed">{paragraph}</p>
                  <div className="absolute -right-2 top-0 opacity-0 group-hover/paragraph:opacity-100 transition-opacity">
                    <Popover
                      open={openExtendPopoverIndex === uniqueIndex}
                      onOpenChange={(isOpen) => setOpenExtendPopoverIndex(isOpen ? uniqueIndex : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isThisExtending || isProcessing}>
                          {isThisExtending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72">
                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Expand this paragraph</h4>
                          </div>
                          <div className="grid gap-2">
                            <Textarea
                              placeholder="Optional: Add specific instruction..."
                              value={extendInstruction}
                              onChange={(e) => setExtendInstruction(e.target.value)}
                              className="min-h-[60px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleExtendClick(paragraph, sectionIndex, pIndex, extendInstruction)}
                            >
                              <Sparkles className="mr-2 h-4 w-4" /> Expand
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground italic">No content yet. Click "Write Section" to generate.</p>
          )}
        </div>
      </div>
    );
  };

  const parsedSections = useMemo(() => {
    const sections = content.split(/(\$\$[^$]+\$\$)/g);
    const result: { title: string; content: string }[] = [];
    let currentTitle = '';

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (section.match(/^\$\$.+\$\$$/)) {
        currentTitle = section.replace(/^\$\$/, '').replace(/\$\$$/, '');
      } else if (currentTitle) {
        result.push({ title: currentTitle, content: section });
        currentTitle = '';
      }
    }
    return result;
  }, [content]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-headline">Part {partNumber}: {partTitle}</h2>
          <p className="text-muted-foreground">Write your offer content section by section</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{wordCount.toLocaleString()} words</span>
          <Button variant="outline" size="sm" onClick={onCopyContent}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </div>
      </div>

      {parsedSections.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Ready to Write</h3>
            <p className="text-muted-foreground mb-4">
              Click the button below to generate all sections for this part with AI assistance.
            </p>
            <Button onClick={handleWriteFullPart} disabled={isGenerating} size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> Write Full Part
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {parsedSections.length > 0 && (
        <div className="space-y-2">
          {parsedSections.map((section, index) => renderSection(index, section.title, section.content))}
        </div>
      )}

      {parsedSections.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button onClick={handleWriteFullPart} disabled={isGenerating} variant="outline">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate All Sections
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default function PartWritingPage() {
  const { toast } = useToast();
  const params = useParams<{ projectId: string; offerId: string; partId: string }>();
  const router = useRouter();
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const projectId = params.projectId;
  const offerId = params.offerId;
  const partId = params.partId;

  const partNumber = parseInt(partId.replace('part-', ''), 10);

  const [pageState, setPageState] = useState<PageState>('overview');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [selectedResearchId, setSelectedResearchId] = useState<string>('');

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
            let reconstructedContent = `$$Introduction$$\n\n`;
            if (introSection?.content) {
              reconstructedContent += `${introSection.content}\n\n`;
            } else {
              reconstructedContent += '\n\n';
            }
            
            coreModules.forEach(section => {
              reconstructedContent += `$$${section.moduleTitle}$$\n\n`;
              if (section.content) {
                reconstructedContent += `${section.content}\n\n`;
              } else {
                reconstructedContent += '\n\n';
              }
            });
            
            reconstructedContent += `$$Your Action Steps$$\n\n`;
            if (actionSection?.content) {
              reconstructedContent += `${actionSection.content}\n\n`;
            } else {
              reconstructedContent += '\n\n';
            }
            
            reconstructedContent += `$$Coming Up Next$$\n\n`;
            if (comingSection?.content) {
              reconstructedContent += `${comingSection.content}\n\n`;
            } else {
              reconstructedContent += '\n\n';
            }
            
            setContent(reconstructedContent);
            setPageState('writing');
          }
        }
      } catch (error) {
        console.error('Error loading offer draft:', error);
        toast({
          title: 'Error',
          description: 'Failed to load offer data.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOfferDraft();
  }, [user, firestore, projectId, offerId, partNumber, toast]);

  const partSections = useMemo(() => {
    return offerDraft?.sections?.filter(s => s.partNumber === partNumber) || [];
  }, [offerDraft?.sections, partNumber]);

  const partTitle = partSections[0]?.partTitle || `Part ${partNumber}`;

  const handleCopyContent = () => {
    const cleanContent = content.replace(/\$\$[^$]+\$\$/g, '\n\n').trim();
    navigator.clipboard.writeText(cleanContent);
    toast({ title: 'Copied!', description: 'Content copied to clipboard.' });
  };

  const handleSaveContent = async () => {
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

      const updatedSections = offerDraft.sections.map(section => {
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

      const updateData: Record<string, any> = {
        sections: updatedSections,
        updatedAt: new Date().toISOString(),
      };
      
      if (selectedResearchId && selectedResearchId !== 'none') {
        updateData.researchProfileId = selectedResearchId;
      }
      if (selectedStyleId && selectedStyleId !== 'none') {
        updateData.styleProfileId = selectedStyleId;
      }

      await updateDoc(draftRef, updateData);

      setOfferDraft(prev => prev ? { 
        ...prev, 
        sections: updatedSections as OfferSection[],
        researchProfileId: selectedResearchId !== 'none' ? selectedResearchId : prev.researchProfileId,
        styleProfileId: selectedStyleId !== 'none' ? selectedStyleId : prev.styleProfileId,
      } : null);
      toast({ title: 'Saved!', description: 'Your progress has been saved.' });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({ title: 'Error', description: 'Failed to save content.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const extractSectionContent = (fullContent: string, sectionTitle: string): string => {
    const regex = new RegExp(`\\$\\$${escapeRegex(sectionTitle)}\\$\\$([\\s\\S]*?)(?=\\$\\$|$)`, 'i');
    const match = fullContent.match(regex);
    return match ? match[1].trim() : '';
  };

  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const countWords = (text: string): number => {
    const cleanedText = text.replace(/\$\$[^$]+\$\$/g, '');
    const words = cleanedText.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}/sections`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Parts
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <OfferWorkflowNavigation
          projectId={projectId}
          offerId={offerId}
          currentStep="sections"
          offerHasBlueprint={!!offerDraft?.masterBlueprint}
          offerHasTitle={!!offerDraft?.title}
        />

        {pageState === 'overview' && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {OFFER_CATEGORY_LABELS[offerDraft.category]}
                  </Badge>
                  <CardTitle className="font-headline text-3xl">
                    Part {partNumber}: {partTitle}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    This part contains {partSections.length} modules to be written.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Research Profile (Optional)</Label>
                  <Select value={selectedResearchId} onValueChange={setSelectedResearchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select research profile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {researchProfiles?.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Writing Style (Optional)</Label>
                  <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select style profile" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {styleProfiles?.map(profile => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.sampleTitle || profile.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Modules in this part:</h4>
                <div className="space-y-2">
                  {partSections.map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{section.moduleTitle}</p>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button size="lg" onClick={() => setPageState('writing')}>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Writing This Part
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {pageState === 'writing' && (
          <>
            <Card>
              <CardContent className="pt-6">
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
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                  user={user}
                  refreshCredits={refreshCredits}
                  projectId={projectId}
                  offerId={offerId}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setPageState('overview')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Overview
              </Button>
              <Button onClick={handleSaveContent} disabled={isSaving || !content}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Progress
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
