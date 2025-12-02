'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowDown,
  Loader2,
  Sparkles,
  BookOpen,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Settings2,
  PenTool,
  Search,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import type { Project, ResearchProfile, StyleProfile, AuthorProfile, ProjectFunnel, FunnelStep, BookIdea } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { generateFunnelIdeas } from '@/ai/flows/generate-funnel-ideas';
import { getIdToken } from '@/lib/client-auth';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';
import { STORYTELLING_FRAMEWORKS, getFrameworkConcept } from '@/lib/storytelling-frameworks';
import { CONTENT_FRAMEWORKS, getContentFrameworkConcept } from '@/lib/content-frameworks';

const STEP_LABELS: Record<number, { title: string; description: string }> = {
  1: { title: 'First Challenge', description: 'What readers struggle with immediately after finishing your book' },
  2: { title: 'Intermediate Growth', description: 'Leveling up from beginner to intermediate practitioner' },
  3: { title: 'Advanced Techniques', description: 'Going deeper and achieving better results' },
  4: { title: 'Optimization & Scale', description: 'Getting more results with less effort' },
  5: { title: 'Teaching & Systems', description: 'Sharing knowledge and building repeatable processes' },
  6: { title: 'Monetization', description: 'Turning expertise into income and building a business' },
  7: { title: 'Mastery & Legacy', description: 'Achieving ultimate mastery or exploring new frontiers' },
};

type GeneratedIdea = BookIdea & { selected: boolean };

export default function FunnelBuilderPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { toast } = useToast();
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();
  const router = useRouter();

  const [selectedResearchProfileId, setSelectedResearchProfileId] = useState<string>('');
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<string>('');
  const [selectedAuthorProfileId, setSelectedAuthorProfileId] = useState<string>('');
  const [selectedStorytellingFramework, setSelectedStorytellingFramework] = useState<string>('');
  const [selectedContentFramework, setSelectedContentFramework] = useState<string>('');
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingBook, setIsCreatingBook] = useState<string | null>(null);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [stepContext, setStepContext] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const funnelDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projectFunnels', projectId);
  }, [user, firestore, projectId]);

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

  const { data: project, isLoading: projectLoading } = useDoc<Project>(projectDocRef);
  const { data: funnel, isLoading: funnelLoading } = useDoc<ProjectFunnel>(funnelDocRef);
  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);
  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);
  const { data: authorProfiles } = useCollection<AuthorProfile>(authorProfilesQuery);

  const isLoading = isUserLoading || projectLoading || funnelLoading;

  useEffect(() => {
    if (project) {
      if (project.researchProfileId) setSelectedResearchProfileId(project.researchProfileId);
      if (project.styleProfileId) setSelectedStyleProfileId(project.styleProfileId);
      if (project.authorProfileId) setSelectedAuthorProfileId(project.authorProfileId);
    }
  }, [project]);

  const funnelSteps = useMemo(() => {
    const steps: FunnelStep[] = [];
    for (let i = 1; i <= 7; i++) {
      const existingStep = funnel?.steps?.find(s => s.step === i);
      steps.push(existingStep || { step: i, bookIdeas: [], selectedIdeas: [] });
    }
    return steps;
  }, [funnel?.steps]);

  const getPreviousStepsContext = (upToStep: number): string => {
    const contexts: string[] = [];
    for (let i = 1; i < upToStep; i++) {
      const step = funnelSteps[i - 1];
      const selectedIdeas = step.bookIdeas.filter(idea => step.selectedIdeas.includes(idea.id));
      if (selectedIdeas.length > 0) {
        contexts.push(`Step ${i} - ${STEP_LABELS[i].title}:`);
        selectedIdeas.forEach(idea => {
          contexts.push(`  - ${idea.title}: ${idea.description}`);
        });
      }
    }
    return contexts.join('\n');
  };

  const handleGenerate = async (step: number) => {
    if (!user || !project || !project.outline) {
      toast({
        title: 'Missing Information',
        description: 'Project blueprint is required to generate ideas.',
        variant: 'destructive',
      });
      return;
    }

    setActiveStep(step);
    setIsGenerating(true);
    setGeneratedIdeas([]);
    setStepContext('');

    try {
      const idToken = await getIdToken(user);

      const researchProfile = researchProfiles?.find(r => r.id === selectedResearchProfileId);
      const styleProfile = styleProfiles?.find(s => s.id === selectedStyleProfileId);
      const authorProfile = authorProfiles?.find(a => a.id === selectedAuthorProfileId);

      const researchContent = researchProfile
        ? `Topic: ${researchProfile.topic}\nResearch: ${researchProfile.deepTopicResearch}\nPain Points: ${researchProfile.painPointAnalysis}\nTarget Audience: ${researchProfile.targetAudienceSuggestion}`
        : undefined;

      const styleContent = styleProfile?.styleAnalysis;
      const authorContent = authorProfile
        ? `Author: ${authorProfile.penName}\nBio: ${authorProfile.bio}\nCredentials: ${authorProfile.credentials || 'N/A'}`
        : undefined;

      const previousContext = step > 1 ? getPreviousStepsContext(step) : undefined;

      const storytellingFw = selectedStorytellingFramework || project.storytellingFramework;
      const storytellingWithConcept = storytellingFw
        ? `${storytellingFw}\nConcept: ${getFrameworkConcept(storytellingFw)}`
        : undefined;
      
      const contentFw = selectedContentFramework;
      const contentWithConcept = contentFw
        ? `${contentFw}\nConcept: ${getContentFrameworkConcept(contentFw)}`
        : undefined;

      const result = await generateFunnelIdeas({
        userId: user.uid,
        idToken,
        bookTitle: project.title,
        bookOutline: project.outline,
        language: project.language || 'English',
        funnelStep: step,
        previousStepIdeas: previousContext,
        researchProfile: researchContent,
        styleProfile: styleContent,
        storytellingFramework: storytellingWithConcept,
        contentFramework: contentWithConcept,
        authorProfile: authorContent,
      });

      if (!result.success) {
        toast({
          title: 'Generation Failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      const ideas: GeneratedIdea[] = result.data.ideas.map(idea => ({
        id: `step${step}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: idea.title,
        subtitle: idea.subtitle,
        description: idea.description,
        targetProblem: idea.targetProblem,
        createdAt: new Date().toISOString(),
        selected: false,
      }));

      setGeneratedIdeas(ideas);
      setStepContext(result.data.stepContext);
      refreshCredits();

      toast({
        title: 'Ideas Generated',
        description: `Generated ${ideas.length} book ideas for Step ${step}.`,
      });
    } catch (error: any) {
      console.error('Error generating funnel ideas:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate book ideas. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveIdeas = async () => {
    if (!user || !projectId || activeStep === null || !funnelDocRef) return;

    const selectedIdeas = generatedIdeas.filter(idea => idea.selected);
    if (selectedIdeas.length === 0) {
      toast({
        title: 'No Ideas Selected',
        description: 'Please select at least one idea to save.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const funnelDoc = await getDoc(funnelDocRef);

      const newIdeas: BookIdea[] = selectedIdeas.map(({ selected, ...idea }) => ({
        id: idea.id,
        title: idea.title,
        subtitle: idea.subtitle || null,
        description: idea.description,
        targetProblem: idea.targetProblem,
        createdAt: idea.createdAt,
      }));
      const newSelectedIds = newIdeas.map(i => i.id);

      if (funnelDoc.exists()) {
        const existingFunnel = funnelDoc.data() as ProjectFunnel;
        const existingStep = existingFunnel.steps?.find(s => s.step === activeStep);

        const updatedStep: FunnelStep = {
          step: activeStep,
          bookIdeas: [...(existingStep?.bookIdeas || []), ...newIdeas],
          selectedIdeas: [...(existingStep?.selectedIdeas || []), ...newSelectedIds],
          generatedAt: new Date().toISOString(),
        };

        const updatedSteps = existingFunnel.steps?.filter(s => s.step !== activeStep) || [];
        updatedSteps.push(updatedStep);
        updatedSteps.sort((a, b) => a.step - b.step);

        await updateDoc(funnelDocRef, {
          steps: updatedSteps,
          updatedAt: serverTimestamp(),
        });
      } else {
        const newStep: FunnelStep = {
          step: activeStep,
          bookIdeas: newIdeas,
          selectedIdeas: newSelectedIds,
          generatedAt: new Date().toISOString(),
        };

        await setDoc(funnelDocRef, {
          userId: user.uid,
          projectId,
          steps: [newStep],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setGeneratedIdeas([]);
      setActiveStep(null);
      setExpandedSteps(prev => new Set([...prev, activeStep]));

      toast({
        title: 'Ideas Saved',
        description: `Saved ${selectedIdeas.length} book ideas to Step ${activeStep}.`,
      });
    } catch (error: any) {
      console.error('Error saving funnel ideas:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save book ideas.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleIdeaSelection = (id: string) => {
    setGeneratedIdeas(prev =>
      prev.map(idea =>
        idea.id === id ? { ...idea, selected: !idea.selected } : idea
      )
    );
  };

  const toggleStepExpansion = (step: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  };

  const handleWriteBook = async (idea: BookIdea) => {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to create a new book project.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingBook(idea.id);

    try {
      const token = await user.getIdToken();

      const checkResponse = await fetch('/api/user/check-book-credit', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!checkResponse.ok) {
        const error = await checkResponse.json();
        toast({
          title: 'Insufficient Book Credits',
          description: error.error || "You don't have enough book credits to create a new book. Please purchase more credits to continue.",
          variant: 'destructive',
        });
        return;
      }

      const creditCheck = await checkResponse.json();
      if (!creditCheck.hasCredits) {
        toast({
          title: 'Insufficient Book Credits',
          description: creditCheck.message || "You don't have enough book credits to create a new book. Please purchase more credits to continue.",
          variant: 'destructive',
        });
        return;
      }

      const coreIdea = `${idea.description}\n\nTarget Problem: ${idea.targetProblem}`;

      const projectData: any = {
        userId: user.uid,
        title: idea.title,
        description: coreIdea,
        status: 'Draft',
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        imageUrl: `https://picsum.photos/seed/${Math.random()}/600/800`,
        imageHint: 'book cover',
        sourceType: 'funnel',
        sourceFunnelProjectId: projectId,
        sourceFunnelIdeaId: idea.id,
      };

      if (selectedAuthorProfileId) {
        projectData.authorProfileId = selectedAuthorProfileId;
      }

      const projectCollection = collection(firestore, 'users', user.uid, 'projects');
      const newProjectDoc = await addDoc(projectCollection, projectData);

      await fetch('/api/user/track-book-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: newProjectDoc.id,
          projectTitle: idea.title,
        }),
      });

      await refreshCredits();

      toast({
        title: 'Book Project Created',
        description: `Successfully created "${idea.title}". Taking you to the workspace...`,
      });

      router.push(`/dashboard/co-author/${newProjectDoc.id}`);
    } catch (error: any) {
      console.error('Error creating book from funnel idea:', error);
      toast({
        title: 'Error Creating Project',
        description: error.message || 'Could not create the book project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBook(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return notFound();
  }

  const selectedCount = generatedIdeas.filter(i => i.selected).length;

  return (
    <>
      <FloatingCreditWidget />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard/co-marketer/funnel-creator">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Funnel Creator
            </Link>
          </Button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Book Funnel</h1>
              <p className="text-muted-foreground mt-1">{project.title}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Main Book</h3>
                  <p className="text-sm text-muted-foreground">{project.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>

          {funnelSteps.map((step, index) => {
            const stepInfo = STEP_LABELS[step.step];
            const hasIdeas = step.bookIdeas.length > 0;
            const selectedIdeas = step.bookIdeas.filter(idea => step.selectedIdeas.includes(idea.id));
            const isExpanded = expandedSteps.has(step.step);
            const isActive = activeStep === step.step;

            return (
              <div key={step.step}>
                <Card className={`${isActive ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          hasIdeas ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {hasIdeas ? <Check className="h-4 w-4" /> : step.step}
                        </div>
                        <div>
                          <CardTitle className="text-base">Step {step.step}: {stepInfo.title}</CardTitle>
                          <CardDescription className="text-xs">{stepInfo.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasIdeas && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStepExpansion(step.step)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={hasIdeas ? 'outline' : 'default'}
                          onClick={() => handleGenerate(step.step)}
                          disabled={isGenerating}
                        >
                          {isGenerating && isActive ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : hasIdeas ? (
                            <Plus className="mr-2 h-4 w-4" />
                          ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                          )}
                          {hasIdeas ? 'Add More' : 'Generate'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {hasIdeas && isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2 mt-2">
                        {selectedIdeas.map(idea => (
                          <div
                            key={idea.id}
                            className="p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{idea.title}</h4>
                                {idea.subtitle && (
                                  <p className="text-xs text-primary">{idea.subtitle}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">{idea.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  <strong>Problem Solved:</strong> {idea.targetProblem}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const params = new URLSearchParams({
                                      topic: idea.title,
                                      description: `${idea.description}\n\nTarget Problem: ${idea.targetProblem}`,
                                      sourceFunnelProjectId: projectId,
                                      sourceFunnelIdeaId: idea.id,
                                    });
                                    router.push(`/dashboard/research?${params.toString()}`);
                                  }}
                                  disabled={isCreatingBook !== null}
                                >
                                  <Search className="mr-2 h-4 w-4" />
                                  Research
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleWriteBook(idea)}
                                  disabled={isCreatingBook !== null}
                                >
                                  {isCreatingBook === idea.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <PenTool className="mr-2 h-4 w-4" />
                                  )}
                                  Write Book
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}

                  {isActive && generatedIdeas.length > 0 && (
                    <CardContent className="border-t pt-4">
                      {stepContext && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">{stepContext}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">
                          Generated Ideas ({generatedIdeas.length}) • {selectedCount} selected
                        </p>
                        {selectedCount > 0 && (
                          <Button size="sm" onClick={handleSaveIdeas} disabled={isSaving}>
                            {isSaving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Selected
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {generatedIdeas.map(idea => (
                          <div
                            key={idea.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              idea.selected
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => toggleIdeaSelection(idea.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={idea.selected}
                                onCheckedChange={() => toggleIdeaSelection(idea.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{idea.title}</h4>
                                {idea.subtitle && (
                                  <p className="text-xs text-primary">{idea.subtitle}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">{idea.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  <strong>Problem Solved:</strong> {idea.targetProblem}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {index < funnelSteps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Funnel Settings</DialogTitle>
              <DialogDescription>
                Configure profiles to use for generating book ideas.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Research Profile (Optional)</Label>
                <Select value={selectedResearchProfileId || '__none__'} onValueChange={(v) => setSelectedResearchProfileId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select research profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
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
                <Select value={selectedStyleProfileId || '__none__'} onValueChange={(v) => setSelectedStyleProfileId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
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
                <Select value={selectedAuthorProfileId || '__none__'} onValueChange={(v) => setSelectedAuthorProfileId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select author profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {authorProfiles?.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.penName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Storytelling Framework (Optional)</Label>
                <Select value={selectedStorytellingFramework || '__none__'} onValueChange={(v) => setSelectedStorytellingFramework(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select storytelling framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {STORYTELLING_FRAMEWORKS.map(fw => (
                      <SelectItem key={fw.value} value={fw.value}>
                        {fw.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStorytellingFramework && selectedStorytellingFramework !== '__none__' && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Concept:</strong> {getFrameworkConcept(selectedStorytellingFramework)}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Content Framework (Optional)</Label>
                <Select value={selectedContentFramework || '__none__'} onValueChange={(v) => setSelectedContentFramework(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select content framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {CONTENT_FRAMEWORKS.map(fw => (
                      <SelectItem key={fw.value} value={fw.value}>
                        {fw.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedContentFramework && selectedContentFramework !== '__none__' && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Concept:</strong> {getContentFrameworkConcept(selectedContentFramework)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowSettings(false)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
