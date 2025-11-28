'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Project, OfferDraft, OfferSection, ResearchProfile, StyleProfile } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import { Loader2, Bot, Save, Wand2, ArrowLeft, Copy, Sparkles, RefreshCw, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { collection } from 'firebase/firestore';
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

type PageState = 'overview' | 'writing';

const frameworks = [
  { value: "The Hero's Journey", label: "The Hero's Journey" },
  { value: "The Mentor's Journey", label: "The Mentor's Journey" },
  { value: 'Three-Act Structure', label: 'Three-Act Structure' },
  { value: 'Fichtean Curve', label: 'Fichtean Curve' },
  { value: 'Save the Cat', label: 'Save the Cat' },
  { value: 'AIDA (Attention, Interest, Desire, Action)', label: 'AIDA Framework' },
  { value: 'PAS (Problem, Agitation, Solution)', label: 'PAS Framework' },
  { value: 'BAB (Before, After, Bridge)', label: 'BAB Framework' },
];

const SectionEditor = ({
  offerDraft,
  project,
  section,
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
  user,
  refreshCredits,
}: {
  offerDraft: OfferDraft;
  project: Project;
  section: OfferSection;
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
  user: any;
  refreshCredits: () => void;
}) => {
  const [isExtending, setIsExtending] = useState<number | null>(null);
  const [extendInstruction, setExtendInstruction] = useState('');
  const [openExtendPopoverIndex, setOpenExtendPopoverIndex] = useState<number | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [isRewritePopoverOpen, setIsRewritePopoverOpen] = useState(false);
  const { toast } = useToast();

  const countWords = (text: string): number => {
    const cleanedText = text.trim();
    const words = cleanedText.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  };

  const wordCount = useMemo(() => countWords(content), [content]);

  const selectedStyle = styleProfiles?.find(p => p.id === selectedStyleId);
  const relevantResearchProfile = researchProfiles?.find(p => p.id === selectedResearchId);
  const researchPrompt = relevantResearchProfile
    ? `Target Audience: ${relevantResearchProfile.targetAudienceSuggestion}\nPain Points: ${relevantResearchProfile.painPointAnalysis}\nDeep Research:\n${relevantResearchProfile.deepTopicResearch}`
    : undefined;

  const handleWriteSection = async () => {
    if (!user || !offerDraft.language) {
      toast({ title: 'Language not set', description: 'Content language is required.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
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
          blueprintSummary: `${offerDraft.title}: ${offerDraft.description || 'A comprehensive bonus material for readers.'}`,
          partTitle: section.partTitle,
          moduleTitle: section.moduleTitle,
          allParts: offerDraft.masterBlueprint || '',
          targetWordCount: section.targetWordCount || 500,
          previousContent: content || undefined,
          bookContext: project?.outline ? `Book: ${project.title}\n${project.outline}` : undefined,
          language: offerDraft.language,
          styleProfile: selectedStyle?.styleAnalysis,
          researchProfile: researchPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to write section');
      }

      const result = await response.json();
      if (result && result.sectionContent) {
        onContentChange(result.sectionContent.trim());
        refreshCredits();
        toast({ title: 'Section Written', description: 'Content generated successfully.' });
      } else {
        throw new Error('AI returned no content');
      }
    } catch (error) {
      console.error('Error writing section:', error);
      toast({ title: 'AI Write Failed', variant: 'destructive', description: `Could not generate content. ${error}` });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRewriteSection = async (instruction?: string) => {
    if (!user || !content.trim()) {
      toast({ title: 'No content', description: 'There is no content to rewrite.', variant: 'destructive' });
      return;
    }

    setIsRewriting(true);
    setIsRewritePopoverOpen(false);
    try {
      const idToken = await getIdToken(user);
      const response = await fetch('/api/offers/rewrite-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          originalContent: content,
          moduleTitle: section.moduleTitle,
          language: offerDraft.language || 'English',
          rewriteInstructions: instruction,
          styleProfile: selectedStyle?.styleAnalysis,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to rewrite section');
      }

      const result = await response.json();
      if (result && result.rewrittenContent && result.rewrittenContent.trim()) {
        onContentChange(result.rewrittenContent.trim());
        refreshCredits();
        toast({ title: 'Section Rewritten', description: 'Content has been rewritten.' });
      } else {
        throw new Error('AI returned empty content');
      }
    } catch (error) {
      console.error('Error rewriting section:', error);
      toast({ title: 'AI Rewrite Failed', variant: 'destructive', description: `Could not rewrite content.` });
    } finally {
      setIsRewriting(false);
      setRewriteInstruction('');
    }
  };

  const handleExtendClick = async (paragraph: string, paragraphIndex: number, instruction?: string) => {
    if (!user) return;
    setIsExtending(paragraphIndex);
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
          originalContent: paragraph,
          targetWordCount: section.targetWordCount,
          moduleTitle: section.moduleTitle,
          language: offerDraft.language || 'English',
          expansionFocus: instruction,
          styleProfile: selectedStyle?.styleAnalysis,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to expand section');
      }

      const result = await response.json();
      if (result && result.expandedContent && result.expandedContent.trim()) {
        onContentChange(prevContent => {
          const paragraphs = prevContent.split('\n\n').filter(p => p.trim() !== '');
          paragraphs.splice(paragraphIndex + 1, 0, result.expandedContent.trim());
          return paragraphs.join('\n\n');
        });
        refreshCredits();
        toast({ title: 'Content Extended', description: 'New content has been added.' });
      } else {
        throw new Error('AI returned empty content');
      }
    } catch (error) {
      console.error('Failed to extend content', error);
      toast({ title: 'AI Extend Failed', description: 'Could not generate additional content.', variant: 'destructive' });
    } finally {
      setIsExtending(null);
      setExtendInstruction('');
    }
  };

  const hasContent = content.trim().length > 0;
  const isProcessing = isGenerating || isRewriting || isExtending !== null;

  return (
    <div className="prose max-w-none dark:prose-invert space-y-6">
      <div className="flex justify-between items-center gap-2 sticky top-0 bg-background py-2 z-10 border-b pb-4">
        <div className="flex gap-2">
          {!hasContent && (
            <Button onClick={handleWriteSection} disabled={isProcessing}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {isGenerating ? 'Writing...' : 'Write Section'}
            </Button>
          )}
          {hasContent && (
            <>
              <Button variant="outline" onClick={handleWriteSection} disabled={isProcessing}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Popover open={isRewritePopoverOpen} onOpenChange={setIsRewritePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" disabled={isProcessing}>
                    {isRewriting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
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
                      <Textarea
                        placeholder="e.g., Make it more concise"
                        value={rewriteInstruction}
                        onChange={(e) => setRewriteInstruction(e.target.value)}
                      />
                      <Button size="sm" onClick={() => handleRewriteSection(rewriteInstruction)} disabled={!rewriteInstruction || isProcessing}>
                        <Pencil className="mr-2 h-4 w-4" /> Rewrite with Instruction
                      </Button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-popover px-2 text-muted-foreground">Or</span></div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleRewriteSection()} disabled={isProcessing}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Just Rewrite
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {wordCount} / {section.targetWordCount} words
          </span>
          <Button variant="outline" size="sm" onClick={onCopyContent} disabled={!hasContent}>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </Button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {isGenerating ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : hasContent ? (
          content.split('\n\n').filter(p => p.trim()).map((paragraph, pIndex) => (
            <div key={`p-${pIndex}`} className="mb-4 group/paragraph">
              <p className="text-base leading-relaxed whitespace-pre-wrap">{paragraph}</p>
              <div className="text-right opacity-0 group-hover/paragraph:opacity-100 transition-opacity mt-2">
                <Popover open={openExtendPopoverIndex === pIndex} onOpenChange={(isOpen) => setOpenExtendPopoverIndex(isOpen ? pIndex : null)}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs" disabled={isExtending === pIndex}>
                      {isExtending === pIndex ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-2 h-3 w-3" />}
                      Extend With AI
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Guided Extend</h4>
                        <p className="text-sm text-muted-foreground">Give the AI specific instructions.</p>
                      </div>
                      <div className="grid gap-2">
                        <Textarea
                          placeholder="e.g., Add a practical example"
                          value={extendInstruction}
                          onChange={(e) => setExtendInstruction(e.target.value)}
                        />
                        <Button size="sm" onClick={() => handleExtendClick(paragraph, pIndex, extendInstruction)} disabled={!extendInstruction || isExtending === pIndex}>
                          <Pencil className="mr-2 h-4 w-4" /> Write With Instruction
                        </Button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-popover px-2 text-muted-foreground">Or</span></div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleExtendClick(paragraph, pIndex)} disabled={isExtending === pIndex}>
                        <Wand2 className="mr-2 h-4 w-4" /> Just Write More
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-3 border-2 border-dashed rounded-md bg-muted/20">
            <Bot className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Ready to write this section</p>
            <p className="text-sm text-muted-foreground">Click "Write Section" to generate content with AI</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function OfferSectionWritingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ projectId: string; offerId: string; sectionId: string }>();
  const projectId = params.projectId;
  const offerId = params.offerId;
  const sectionId = params.sectionId;

  const { user } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  const [offerDraft, setOfferDraft] = useState<OfferDraft | null>(null);
  const [pageState, setPageState] = useState<PageState>('overview');
  const [sectionContent, setSectionContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedStyleId, setSelectedStyleId] = useState<string>('default');
  const [selectedResearchId, setSelectedResearchId] = useState<string>('none');
  const [selectedFramework, setSelectedFramework] = useState<string>('');

  const styleProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'styleProfiles');
  }, [user, firestore]);

  const researchProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'researchProfiles');
  }, [user, firestore]);

  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);
  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);

  const section = useMemo(() => {
    return offerDraft?.sections?.find(s => s.id === sectionId);
  }, [offerDraft?.sections, sectionId]);

  useEffect(() => {
    const loadOfferDraft = async () => {
      if (!user || !projectId || !offerId) return;

      try {
        const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
        const draftSnap = await getDoc(draftRef);

        if (draftSnap.exists()) {
          const draft = { id: draftSnap.id, ...draftSnap.data() } as OfferDraft;
          setOfferDraft(draft);

          if (draft.styleProfileId) setSelectedStyleId(draft.styleProfileId);
          if (draft.researchProfileId) setSelectedResearchId(draft.researchProfileId);
          if (draft.storytellingFramework) setSelectedFramework(draft.storytellingFramework);

          const foundSection = draft.sections?.find(s => s.id === sectionId);
          if (foundSection?.content) {
            setSectionContent(foundSection.content);
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
  }, [user, firestore, projectId, offerId, sectionId, toast]);

  const handleProceedToEditor = () => {
    setPageState('writing');
  };

  const handleSaveContent = useCallback(async () => {
    if (!user || !offerDraft || !section) return;

    setIsSaving(true);
    try {
      const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
      
      const wordCount = sectionContent.trim().split(/\s+/).filter(w => w.length > 0).length;
      const updatedSections = offerDraft.sections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            content: sectionContent,
            wordCount,
            status: wordCount > 0 ? 'completed' as const : 'pending' as const,
          };
        }
        return s;
      });

      await updateDoc(draftRef, {
        sections: updatedSections,
        updatedAt: new Date().toISOString(),
      });

      setOfferDraft(prev => prev ? { ...prev, sections: updatedSections } : null);
      toast({ title: 'Content Saved', description: 'Section content has been saved.' });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({ title: 'Error Saving', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [user, firestore, projectId, offerId, offerDraft, section, sectionId, sectionContent, toast]);

  const handleCopyContent = useCallback(async () => {
    if (!sectionContent) return;

    try {
      const plainText = sectionContent;
      const htmlContent = `<h2>${section?.moduleTitle}</h2>${sectionContent.split('\n\n').map(p => `<p>${p}</p>`).join('')}`;
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([htmlContent], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      toast({ title: 'Content Copied', description: 'Section content copied to clipboard.' });
    } catch (err) {
      navigator.clipboard.writeText(sectionContent);
      toast({ title: 'Content Copied', description: 'Section content copied to clipboard.' });
    }
  }, [sectionContent, section?.moduleTitle, toast]);

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

  if (!section) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-medium text-lg mb-2">Section Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This section does not exist in the offer.
            </p>
            <Button asChild>
              <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}/sections`}>
                Back to Sections
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}/sections`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sections
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
                  <CardTitle className="font-headline text-2xl">{section.moduleTitle}</CardTitle>
                  <CardDescription className="mt-2">
                    Part {section.partNumber}: {section.partTitle}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {OFFER_CATEGORY_LABELS[offerDraft.category]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Section Description</h4>
                <p className="text-muted-foreground">{section.description}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Target: ~{section.targetWordCount} words
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">AI Context Settings</h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Research Profile</Label>
                    <Select value={selectedResearchId} onValueChange={setSelectedResearchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {researchProfiles?.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>{profile.topic}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Style Profile</Label>
                    <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        {styleProfiles?.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Storytelling Framework</Label>
                    <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
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

              <Button onClick={handleProceedToEditor} size="lg">
                <Bot className="mr-2 h-4 w-4" />
                Start Writing with AI
              </Button>
            </CardContent>
          </Card>
        )}

        {pageState === 'writing' && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 font-headline">
                  <Bot className="w-5 h-5" />
                  {section.moduleTitle}
                </CardTitle>
                <CardDescription>
                  Part {section.partNumber}: {section.partTitle}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPageState('overview')}>
                  Settings
                </Button>
                <Button onClick={handleSaveContent} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Section
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SectionEditor
                offerDraft={offerDraft}
                project={project}
                section={section}
                content={sectionContent}
                onContentChange={setSectionContent}
                onCopyContent={handleCopyContent}
                selectedStyleId={selectedStyleId}
                styleProfiles={styleProfiles}
                selectedResearchId={selectedResearchId}
                researchProfiles={researchProfiles}
                selectedFramework={selectedFramework}
                isGenerating={isGenerating}
                setIsGenerating={setIsGenerating}
                user={user}
                refreshCredits={refreshCredits}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
