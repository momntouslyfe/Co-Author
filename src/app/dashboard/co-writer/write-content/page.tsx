'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  PenTool,
  RefreshCw,
  Sparkles,
  Save,
  ChevronDown,
  ChevronUp,
  Settings2,
  Copy,
  Check,
  FileText,
  Wand2,
  Pencil,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Project, ResearchProfile, StyleProfile, AuthorProfile, ProjectContentIdeas, ContentIdea, ContentDraft } from '@/lib/definitions';
import { STORYTELLING_FRAMEWORKS, getFrameworkConcept } from '@/lib/storytelling-frameworks';
import { useToast } from '@/hooks/use-toast';
import { writeMarketingContent } from '@/ai/flows/write-marketing-content';
import { rewriteMarketingContent } from '@/ai/flows/rewrite-marketing-content';
import { getIdToken } from '@/lib/client-auth';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

const languages = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Bangla', label: 'Bangla' },
  { value: 'Hindi', label: 'Hindi' },
];

const contentFrameworks = [
  { value: 'AIDA (Attention, Interest, Desire, Action)', label: 'AIDA - Attention, Interest, Desire, Action' },
  { value: 'PAS (Problem, Agitation, Solution)', label: 'PAS - Problem, Agitation, Solution' },
  { value: 'BAB (Before, After, Bridge)', label: 'BAB - Before, After, Bridge' },
  { value: 'FAB (Features, Advantages, Benefits)', label: 'FAB - Features, Advantages, Benefits' },
  { value: '4Ps (Promise, Picture, Proof, Push)', label: '4Ps - Promise, Picture, Proof, Push' },
  { value: 'PASTOR (Problem, Amplify, Story, Transformation, Offer, Response)', label: 'PASTOR - Problem to Response' },
  { value: 'QUEST (Qualify, Understand, Educate, Stimulate, Transition)', label: 'QUEST - Qualify to Transition' },
  { value: 'SLAP (Stop, Look, Act, Purchase)', label: 'SLAP - Stop, Look, Act, Purchase' },
  { value: 'ACCA (Awareness, Comprehension, Conviction, Action)', label: 'ACCA - Awareness to Action' },
  { value: 'PPPP (Picture, Promise, Prove, Push)', label: '4P - Picture, Promise, Prove, Push' },
  { value: 'SSS (Star, Story, Solution)', label: 'SSS - Star, Story, Solution' },
  { value: 'APP (Agree, Promise, Preview)', label: 'APP - Agree, Promise, Preview' },
];

const contentCategories = [
  { value: 'Blog Post', label: 'Blog Post' },
  { value: 'Email Newsletter', label: 'Email Newsletter' },
  { value: 'Social Media Post', label: 'Social Media Post' },
  { value: 'Video Script', label: 'Video Script' },
  { value: 'Podcast Script', label: 'Podcast Script' },
  { value: 'Lead Magnet', label: 'Lead Magnet' },
  { value: 'Case Study', label: 'Case Study' },
  { value: 'Book Review', label: 'Book Review' },
];

function WriteContentPageContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const ideaIdParam = searchParams.get('ideaId');
  const draftIdParam = searchParams.get('draftId');
  const { toast } = useToast();
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || '');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>(ideaIdParam || '');
  const [contentTitle, setContentTitle] = useState<string>('');
  const [contentDescription, setContentDescription] = useState<string>('');
  const [targetWordCount, setTargetWordCount] = useState<number>(500);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [contentCategory, setContentCategory] = useState<string>('');
  const [contentFramework, setContentFramework] = useState<string>('');
  const [storytellingFramework, setStorytellingFramework] = useState<string>('');
  const [selectedResearchProfileId, setSelectedResearchProfileId] = useState<string>('');
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<string>('');
  const [selectedAuthorProfileId, setSelectedAuthorProfileId] = useState<string>('');

  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [currentWordCount, setCurrentWordCount] = useState<number>(0);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftIdParam);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const [rewriteInstruction, setRewriteInstruction] = useState<string>('');
  const [expandInstruction, setExpandInstruction] = useState<string>('');
  const [paragraphExpandInstruction, setParagraphExpandInstruction] = useState<string>('');
  const [expandTargetWords, setExpandTargetWords] = useState<number>(1000);
  const [openRewritePopover, setOpenRewritePopover] = useState(false);
  const [openExpandPopover, setOpenExpandPopover] = useState(false);
  const [expandingParagraphIndex, setExpandingParagraphIndex] = useState<number | null>(null);
  const [openExpandParagraphPopover, setOpenExpandParagraphPopover] = useState<number | null>(null);

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'projects');
  }, [user, firestore]);

  const contentIdeasDocRef = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return doc(firestore, 'users', user.uid, 'projectContentIdeas', selectedProjectId);
  }, [user, firestore, selectedProjectId]);

  const draftDocRef = useMemoFirebase(() => {
    if (!user || !selectedProjectId || !draftIdParam) return null;
    return doc(firestore, 'users', user.uid, 'projects', selectedProjectId, 'contentDrafts', draftIdParam);
  }, [user, firestore, selectedProjectId, draftIdParam]);

  const { data: loadedDraft, isLoading: draftLoading } = useDoc<ContentDraft>(draftDocRef);

  const researchProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'researchProfiles');
  }, [user, firestore]);

  const styleProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'styleProfiles');
  }, [user, firestore]);

  const authorProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'authorProfiles');
  }, [user, firestore]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const { data: projectContentIdeas, isLoading: ideasLoading } = useDoc<ProjectContentIdeas>(contentIdeasDocRef);
  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);
  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);
  const { data: authorProfiles } = useCollection<AuthorProfile>(authorProfilesQuery);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);
  const selectedProject = useMemo(
    () => projectsWithOutline.find(p => p.id === selectedProjectId),
    [projectsWithOutline, selectedProjectId]
  );

  const savedIdeas = useMemo(() => projectContentIdeas?.ideas || [], [projectContentIdeas]);
  const selectedIdea = useMemo(
    () => savedIdeas.find(i => i.id === selectedIdeaId),
    [savedIdeas, selectedIdeaId]
  );

  const isLoading = isUserLoading || projectsLoading;

  useEffect(() => {
    if (selectedIdea && !draftLoaded) {
      setContentTitle(selectedIdea.title);
      setContentDescription(selectedIdea.description);
      if (selectedIdea.category) {
        setContentCategory(selectedIdea.category);
      }
    }
  }, [selectedIdea, draftLoaded]);

  useEffect(() => {
    if (loadedDraft && !draftLoaded) {
      setContentTitle(loadedDraft.title || '');
      setGeneratedContent(loadedDraft.content || '');
      setTargetWordCount(loadedDraft.targetWordCount || 500);
      setSelectedLanguage(loadedDraft.language || 'English');
      setCustomInstructions(loadedDraft.customInstructions || '');
      setContentFramework(loadedDraft.contentFramework || '');
      setStorytellingFramework(loadedDraft.storytellingFramework || '');
      if (loadedDraft.contentIdeaId) {
        setSelectedIdeaId(loadedDraft.contentIdeaId);
      }
      setShowSettings(false);
      setDraftLoaded(true);
      toast({
        title: 'Draft Loaded',
        description: 'Your saved draft has been loaded.',
      });
    }
  }, [loadedDraft, draftLoaded, toast]);

  useEffect(() => {
    if (generatedContent) {
      const words = generatedContent.trim().split(/\s+/).filter(w => w.length > 0);
      setCurrentWordCount(words.length);
    } else {
      setCurrentWordCount(0);
    }
  }, [generatedContent]);

  const handleGenerate = async () => {
    if (!user || !selectedProject || !contentTitle.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a project and enter a content title.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const idToken = await getIdToken(user);

      const selectedResearch = researchProfiles?.find(r => r.id === selectedResearchProfileId);
      const selectedStyle = styleProfiles?.find(s => s.id === selectedStyleProfileId);
      const selectedAuthor = authorProfiles?.find(a => a.id === selectedAuthorProfileId);

      const researchContext = selectedResearch
        ? `Topic: ${selectedResearch.topic}\nAudience: ${selectedResearch.targetAudienceSuggestion}\nPain Points: ${selectedResearch.painPointAnalysis}`
        : undefined;

      const authorContext = selectedAuthor
        ? `Author: ${selectedAuthor.penName || selectedAuthor.fullName}\nBio: ${selectedAuthor.bio}\nCredentials: ${selectedAuthor.credentials}`
        : undefined;

      const result = await writeMarketingContent({
        userId: user.uid,
        idToken,
        bookTitle: selectedProject.title,
        bookOutline: selectedProject.outline || '',
        contentTitle: contentTitle,
        contentDescription: contentDescription || undefined,
        contentCategory: contentCategory || undefined,
        language: selectedLanguage,
        targetWordCount: targetWordCount,
        customInstructions: customInstructions || undefined,
        contentFramework: contentFramework || undefined,
        storytellingFramework: storytellingFramework || selectedProject.storytellingFramework,
        researchProfile: researchContext,
        styleProfile: selectedStyle?.styleAnalysis,
        authorProfile: authorContext,
      });

      if (!result || !result.content) {
        throw new Error('Failed to generate content. Please refresh the page and try again.');
      }

      setGeneratedContent(result.content);
      setShowSettings(false);
      refreshCredits();

      toast({
        title: 'Content Generated',
        description: `Generated ${result.wordCount} words of marketing content.`,
      });
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRewrite = async (instruction?: string) => {
    if (!user || !generatedContent) {
      toast({
        title: 'No Content',
        description: 'There is no content to rewrite.',
        variant: 'destructive',
      });
      return;
    }

    setIsRewriting(true);
    setOpenRewritePopover(false);
    try {
      const idToken = await getIdToken(user);
      const selectedStyle = styleProfiles?.find(s => s.id === selectedStyleProfileId);

      const result = await rewriteMarketingContent({
        userId: user.uid,
        idToken,
        content: generatedContent,
        language: selectedLanguage,
        bookTitle: selectedProject?.title,
        styleProfile: selectedStyle?.styleAnalysis,
        customInstructions: instruction || undefined,
      });

      if (!result || !result.content) {
        throw new Error('Failed to rewrite content. Please refresh the page and try again.');
      }

      setGeneratedContent(result.content);
      refreshCredits();

      toast({
        title: 'Content Rewritten',
        description: `Rewritten content: ${result.wordCount} words.`,
      });
    } catch (error: any) {
      console.error('Error rewriting content:', error);
      toast({
        title: 'Rewrite Failed',
        description: error.message || 'Failed to rewrite content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRewriting(false);
      setRewriteInstruction('');
    }
  };

  const handleExpand = async (instruction?: string) => {
    if (!user || !generatedContent) {
      toast({
        title: 'No Content',
        description: 'There is no content to expand.',
        variant: 'destructive',
      });
      return;
    }

    setIsExpanding(true);
    setOpenExpandPopover(false);
    try {
      const idToken = await getIdToken(user);
      const selectedStyle = styleProfiles?.find(s => s.id === selectedStyleProfileId);

      const response = await fetch('/api/co-writer/expand-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          content: generatedContent,
          language: selectedLanguage,
          targetWordCount: expandTargetWords,
          bookTitle: selectedProject?.title,
          bookOutline: selectedProject?.outline,
          styleProfile: selectedStyle?.styleAnalysis,
          customInstructions: instruction || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to expand content');
      }

      const result = await response.json();

      if (!result || !result.content) {
        throw new Error('Failed to expand content. Please refresh the page and try again.');
      }

      setGeneratedContent(result.content);
      refreshCredits();

      toast({
        title: 'Content Expanded',
        description: `Expanded content to ${result.wordCount} words.`,
      });
    } catch (error: any) {
      console.error('Error expanding content:', error);
      toast({
        title: 'Expand Failed',
        description: error.message || 'Failed to expand content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExpanding(false);
      setExpandInstruction('');
    }
  };

  const handleExtendParagraph = async (paragraph: string, paragraphIndex: number, instruction?: string) => {
    if (!user || !paragraph.trim()) {
      toast({
        title: 'No Content',
        description: 'There is no paragraph to extend.',
        variant: 'destructive',
      });
      return;
    }

    setExpandingParagraphIndex(paragraphIndex);
    setOpenExpandParagraphPopover(null);
    try {
      const idToken = await getIdToken(user);
      const selectedStyle = styleProfiles?.find(s => s.id === selectedStyleProfileId);

      const response = await fetch('/api/co-writer/extend-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          paragraph,
          language: selectedLanguage,
          bookTitle: selectedProject?.title,
          bookOutline: selectedProject?.outline,
          styleProfile: selectedStyle?.styleAnalysis,
          instruction: instruction || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extend paragraph');
      }

      const result = await response.json();

      setGeneratedContent(prevContent => {
        const paragraphs = prevContent.split('\n\n').filter(p => p.trim());
        if (paragraphIndex >= 0 && paragraphIndex < paragraphs.length) {
          paragraphs.splice(paragraphIndex + 1, 0, result.extendedContent);
        }
        return paragraphs.join('\n\n');
      });
      refreshCredits();

      toast({
        title: 'Content Extended',
        description: 'New content has been added after the paragraph.',
      });
    } catch (error: any) {
      console.error('Error extending paragraph:', error);
      toast({
        title: 'Extend Failed',
        description: error.message || 'Failed to extend content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExpandingParagraphIndex(null);
      setParagraphExpandInstruction('');
    }
  };

  const handleSave = async () => {
    if (!user || !selectedProjectId || !generatedContent) {
      toast({
        title: 'Cannot Save',
        description: 'Please generate content first.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const draftsCollection = collection(firestore, 'users', user.uid, 'projects', selectedProjectId, 'contentDrafts');

      const draftData: Record<string, any> = {
        userId: user.uid,
        projectId: selectedProjectId,
        title: contentTitle,
        content: generatedContent,
        wordCount: currentWordCount,
        targetWordCount: targetWordCount,
        language: selectedLanguage,
        updatedAt: serverTimestamp(),
      };

      if (selectedIdeaId && selectedIdeaId !== 'none') {
        draftData.contentIdeaId = selectedIdeaId;
      }
      if (selectedIdea?.title) {
        draftData.contentIdeaTitle = selectedIdea.title;
      }
      if (customInstructions) {
        draftData.customInstructions = customInstructions;
      }
      if (contentCategory) {
        draftData.contentCategory = contentCategory;
      }
      if (contentFramework) {
        draftData.contentFramework = contentFramework;
      }
      if (storytellingFramework) {
        draftData.storytellingFramework = storytellingFramework;
      }

      if (currentDraftId) {
        const draftRef = doc(firestore, 'users', user.uid, 'projects', selectedProjectId, 'contentDrafts', currentDraftId);
        await updateDoc(draftRef, draftData);
      } else {
        draftData.createdAt = serverTimestamp();
        const newDraftRef = await addDoc(draftsCollection, draftData);
        setCurrentDraftId(newDraftRef.id);
      }

      toast({
        title: 'Content Saved',
        description: 'Your content has been saved.',
      });
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save draft. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const isProcessing = isGenerating || isRewriting || isExpanding;

  return (
    <>
      <FloatingCreditWidget />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard/co-writer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Co-Writer
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Write Marketing Content</h1>
          <p className="text-muted-foreground mt-2">
            Generate and refine marketing content for your book.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Content Settings</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showSettings && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Book *</Label>
                    <Select value={selectedProjectId} onValueChange={(v) => { setSelectedProjectId(v); setSelectedIdeaId(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a book project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectsWithOutline.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              {project.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProjectId && savedIdeas.length > 0 && (
                    <div className="space-y-2">
                      <Label>From Saved Idea (Optional)</Label>
                      <Select value={selectedIdeaId} onValueChange={setSelectedIdeaId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a saved idea" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Write from scratch</SelectItem>
                          {savedIdeas.map(idea => (
                            <SelectItem key={idea.id} value={idea.id}>
                              {idea.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Content Category</Label>
                    <Select value={contentCategory} onValueChange={setContentCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content category" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentCategories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Auto-filled from saved idea. Helps AI tailor the content format.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Content Title *</Label>
                    <Input
                      placeholder="Enter content title"
                      value={contentTitle}
                      onChange={(e) => setContentTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Describe what the content should cover..."
                      value={contentDescription}
                      onChange={(e) => setContentDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Target Word Count</Label>
                      <span className="text-sm text-muted-foreground">{targetWordCount} words</span>
                    </div>
                    <Slider
                      value={[targetWordCount]}
                      onValueChange={([v]) => setTargetWordCount(v)}
                      min={200}
                      max={3000}
                      step={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Instructions (Optional)</Label>
                    <Textarea
                      placeholder="Any specific instructions for the AI..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Advanced Settings
                    </span>
                    {showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>

                  {showAdvancedSettings && (
                    <div className="space-y-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Content Framework (Optional)</Label>
                        <Select value={contentFramework} onValueChange={setContentFramework}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select content framework" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {contentFrameworks.map(fw => (
                              <SelectItem key={fw.value} value={fw.value}>
                                {fw.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Marketing/persuasion structure for your content.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Storytelling Framework (Optional)</Label>
                        <Select value={storytellingFramework} onValueChange={setStorytellingFramework}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select storytelling framework" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {STORYTELLING_FRAMEWORKS.map(fw => (
                              <SelectItem key={fw.value} value={fw.value}>
                                {fw.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {storytellingFramework && storytellingFramework !== 'none' && (
                          <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              <strong>Concept:</strong> {getFrameworkConcept(storytellingFramework)}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Narrative structure for your content.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Research Profile (Optional)</Label>
                        <Select value={selectedResearchProfileId} onValueChange={setSelectedResearchProfileId}>
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

                      <div className="space-y-2">
                        <Label>Style Profile (Optional)</Label>
                        <Select value={selectedStyleProfileId} onValueChange={setSelectedStyleProfileId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style profile" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {styleProfiles?.map(profile => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Author Profile (Optional)</Label>
                        <Select value={selectedAuthorProfileId} onValueChange={setSelectedAuthorProfileId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select author profile" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {authorProfiles?.map(profile => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.penName || profile.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={isProcessing || !selectedProjectId || !contentTitle.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <PenTool className="mr-2 h-4 w-4" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>{contentTitle || 'Generated Content'}</CardTitle>
                    <CardDescription>
                      {generatedContent ? 'Your generated marketing content' : 'Configure settings and generate content'}
                    </CardDescription>
                  </div>
                  {generatedContent && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Popover open={openRewritePopover} onOpenChange={setOpenRewritePopover}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" disabled={isProcessing}>
                            {isRewriting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Rewrite
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Rewrite Content</h4>
                              <p className="text-sm text-muted-foreground">
                                Improve and polish the generated content.
                              </p>
                            </div>
                            <div className="grid gap-2">
                              <Textarea
                                placeholder="Optional: Specific instructions for rewrite..."
                                value={rewriteInstruction}
                                onChange={(e) => setRewriteInstruction(e.target.value)}
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleRewrite()}
                                  disabled={isProcessing}
                                >
                                  Just Rewrite
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleRewrite(rewriteInstruction)}
                                  disabled={isProcessing || !rewriteInstruction.trim()}
                                >
                                  Guided Rewrite
                                </Button>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Popover open={openExpandPopover} onOpenChange={setOpenExpandPopover}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" disabled={isProcessing}>
                            {isExpanding ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Expand
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Expand Content</h4>
                              <p className="text-sm text-muted-foreground">
                                Add more valuable content and detail.
                              </p>
                            </div>
                            <div className="grid gap-2">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <Label>Target Word Count</Label>
                                  <span className="text-sm text-muted-foreground">{expandTargetWords} words</span>
                                </div>
                                <Slider
                                  value={[expandTargetWords]}
                                  onValueChange={([v]) => setExpandTargetWords(v)}
                                  min={currentWordCount + 100}
                                  max={currentWordCount + 2000}
                                  step={100}
                                />
                              </div>
                              <Textarea
                                placeholder="Optional: What to add or focus on..."
                                value={expandInstruction}
                                onChange={(e) => setExpandInstruction(e.target.value)}
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleExpand()}
                                  disabled={isProcessing}
                                >
                                  Just Expand
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => handleExpand(expandInstruction)}
                                  disabled={isProcessing || !expandInstruction.trim()}
                                >
                                  Guided Expand
                                </Button>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <span className="text-sm text-muted-foreground px-2">
                        {currentWordCount.toLocaleString()} words
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        disabled={isProcessing}
                      >
                        {copied ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isProcessing || isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Content
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Generating content...</p>
                    <p className="text-sm text-muted-foreground mt-1">This may take a moment.</p>
                  </div>
                ) : generatedContent ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {generatedContent.split('\n\n').filter(p => p.trim()).map((paragraph, pIndex) => {
                      const trimmed = paragraph.trim();
                      
                      if (trimmed.startsWith('### ')) {
                        return (
                          <h5 key={`heading-${pIndex}`} className="text-base font-semibold mt-6 mb-3">
                            {trimmed.substring(4)}
                          </h5>
                        );
                      }
                      if (trimmed.startsWith('## ')) {
                        return (
                          <h4 key={`heading-${pIndex}`} className="text-lg font-semibold mt-8 mb-4">
                            {trimmed.substring(3)}
                          </h4>
                        );
                      }
                      
                      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                        const items = trimmed.split('\n').filter(line => line.trim());
                        return (
                          <ul key={`list-${pIndex}`} className="list-disc list-inside space-y-1 mb-4 ml-4">
                            {items.map((item, idx) => (
                              <li key={idx} className="text-base leading-relaxed">
                                {item.replace(/^[-*]\s*/, '')}
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      
                      if (/^\d+\.\s/.test(trimmed)) {
                        const items = trimmed.split('\n').filter(line => line.trim());
                        return (
                          <ol key={`list-${pIndex}`} className="list-decimal list-inside space-y-1 mb-4 ml-4">
                            {items.map((item, idx) => (
                              <li key={idx} className="text-base leading-relaxed">
                                {item.replace(/^\d+\.\s*/, '')}
                              </li>
                            ))}
                          </ol>
                        );
                      }
                      
                      return (
                        <div key={`paragraph-${pIndex}`} className="mb-4 group/paragraph">
                          <p className="text-base leading-relaxed whitespace-pre-wrap">{paragraph}</p>
                          <div className="text-right opacity-0 group-hover/paragraph:opacity-100 transition-opacity mt-2">
                          <Popover 
                            open={openExpandParagraphPopover === pIndex} 
                            onOpenChange={(isOpen) => setOpenExpandParagraphPopover(isOpen ? pIndex : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs" 
                                disabled={expandingParagraphIndex === pIndex || isProcessing}
                              >
                                {expandingParagraphIndex === pIndex ? (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-2 h-3 w-3" />
                                )}
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
                                  <Label htmlFor={`extend-instruction-${pIndex}`} className="sr-only">Instruction</Label>
                                  <Textarea 
                                    id={`extend-instruction-${pIndex}`} 
                                    placeholder="e.g., Add a practical example" 
                                    value={paragraphExpandInstruction} 
                                    onChange={(e) => setParagraphExpandInstruction(e.target.value)} 
                                  />
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleExtendParagraph(paragraph, pIndex, paragraphExpandInstruction)} 
                                    disabled={!paragraphExpandInstruction || expandingParagraphIndex === pIndex}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" /> Write With My Instruction
                                  </Button>
                                </div>
                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                  </div>
                                  <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-popover px-2 text-muted-foreground">Or</span>
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="secondary" 
                                  onClick={() => handleExtendParagraph(paragraph, pIndex)} 
                                  disabled={expandingParagraphIndex === pIndex}
                                >
                                  <Wand2 className="mr-2 h-4 w-4" /> Just Write More
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-2">No content generated yet</p>
                    <p className="text-sm text-muted-foreground">
                      Select a book, enter a title, and click Generate to create marketing content.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default function WriteContentPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <WriteContentPageContent />
    </Suspense>
  );
}
