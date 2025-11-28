'use client';

import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2, Save, Info, ArrowLeft } from 'lucide-react';
import { useAuthUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import type { ResearchProfile, StyleProfile, Project, OfferDraft, OfferIdea, ProjectOffers, OfferBlueprint, OfferSection } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS, OFFER_CATEGORY_STRUCTURE } from '@/lib/definitions';
import { collection, doc, updateDoc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { getIdToken } from '@/lib/client-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OfferWorkflowNavigation } from '@/components/offer-workflow-navigation';
import { useCreditSummary } from '@/contexts/credit-summary-context';

const formSchema = z.object({
  description: z.string().min(10, 'Please describe your offer in at least 10 characters.'),
  language: z.string({ required_error: 'Please select a language.' }),
  storytellingFramework: z.string().optional(),
  researchProfileId: z.string().optional(),
  styleProfileId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const languages = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Bangla', label: 'Bangla' },
  { value: 'Hindi', label: 'Hindi' },
];

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

export default function OfferDraftPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const params = useParams<{ projectId: string; offerId: string }>();
  const { refreshCredits } = useCreditSummary();
  const projectId = params.projectId;
  const offerId = params.offerId;
  const router = useRouter();

  const [blueprintResult, setBlueprintResult] = useState<OfferBlueprint[] | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [offerDraft, setOfferDraft] = useState<OfferDraft | null>(null);
  const [sourceOffer, setSourceOffer] = useState<OfferIdea | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  const selectedResearchProfileId = form.watch('researchProfileId');
  const selectedStyleProfileId = form.watch('styleProfileId');

  const selectedResearchProfile = useMemo(() => {
    return selectedResearchProfileId && selectedResearchProfileId !== 'none'
      ? researchProfiles?.find(p => p.id === selectedResearchProfileId)
      : undefined;
  }, [selectedResearchProfileId, researchProfiles]);

  const selectedStyleProfile = useMemo(() => {
    return selectedStyleProfileId && selectedStyleProfileId !== 'none'
      ? styleProfiles?.find(p => p.id === selectedStyleProfileId)
      : undefined;
  }, [selectedStyleProfileId, styleProfiles]);

  useEffect(() => {
    const initializeOfferDraft = async () => {
      if (!user || !projectId || !offerId) return;

      try {
        const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
        const draftSnap = await getDoc(draftRef);

        if (draftSnap.exists()) {
          const draft = { id: draftSnap.id, ...draftSnap.data() } as OfferDraft;
          setOfferDraft(draft);
          form.reset({
            description: draft.description || '',
            language: draft.language || undefined,
            storytellingFramework: draft.storytellingFramework || undefined,
            researchProfileId: draft.researchProfileId || undefined,
            styleProfileId: draft.styleProfileId || undefined,
          });
        } else {
          const offersRef = doc(firestore, 'users', user.uid, 'projectOffers', projectId);
          const offersSnap = await getDoc(offersRef);
          
          if (offersSnap.exists()) {
            const projectOffers = offersSnap.data() as ProjectOffers;
            const offer = projectOffers.offers.find(o => o.id === offerId);
            
            if (offer) {
              setSourceOffer(offer);
              form.reset({
                description: offer.description || '',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error initializing offer draft:', error);
        toast({
          title: 'Error',
          description: 'Failed to load offer data.',
          variant: 'destructive',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeOfferDraft();
  }, [user, firestore, projectId, offerId, form, toast]);

  const offerTitle = offerDraft?.title || sourceOffer?.title || 'Offer';
  const offerCategory = offerDraft?.category || sourceOffer?.category;

  async function onSubmit(values: FormValues) {
    if (!user || !project) {
      toast({
        title: 'Not Ready',
        description: 'Please wait for data to load.',
        variant: 'destructive',
      });
      return;
    }

    if (!offerCategory) {
      toast({
        title: 'Missing Category',
        description: 'Offer category is required.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setBlueprintResult(null);
    setSelectedBlueprint(null);
    setIsEditing(false);

    const selectedResearchProfile = values.researchProfileId && values.researchProfileId !== 'none'
      ? researchProfiles?.find(p => p.id === values.researchProfileId)
      : undefined;

    const researchProfileContent = selectedResearchProfile
      ? `PAIN POINTS:\n${selectedResearchProfile.painPointAnalysis}\n\nDEEP RESEARCH:\n${selectedResearchProfile.deepTopicResearch}`
      : undefined;

    const selectedStyleProfile = values.styleProfileId && values.styleProfileId !== 'none'
      ? styleProfiles?.find(p => p.id === values.styleProfileId)
      : undefined;

    const styleProfileContent = selectedStyleProfile?.styleAnalysis;

    try {
      const idToken = await getIdToken(user);
      const response = await fetch('/api/offers/generate-blueprints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bookTitle: project.title,
          bookDescription: project.outline || project.description || '',
          offerCategory: offerCategory,
          offerTitle: offerTitle,
          offerDescription: values.description,
          language: values.language,
          researchProfile: researchProfileContent,
          styleProfile: styleProfileContent,
          storytellingFramework: values.storytellingFramework,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate blueprints');
      }

      const data = await response.json();
      setBlueprintResult(data.blueprints);
      refreshCredits();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      toast({
        title: 'Error Generating Blueprint',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleSelectBlueprint = (blueprint: OfferBlueprint) => {
    const blueprintText = formatBlueprintAsText(blueprint);
    setSelectedBlueprint(blueprintText);
    setIsEditing(true);
  };

  const formatBlueprintAsText = (blueprint: OfferBlueprint): string => {
    let text = `# ${blueprint.title}\n\n`;
    if (blueprint.summary) {
      text += `${blueprint.summary}\n\n`;
    }
    blueprint.parts.forEach((part, partIndex) => {
      text += `## Part ${partIndex + 1}: ${part.title}\n\n`;
      part.modules.forEach((module, moduleIndex) => {
        text += `### ${module.title}\n`;
        text += `${module.description}\n\n`;
      });
    });
    return text;
  };

  async function handleSaveBlueprint() {
    if (!selectedBlueprint || !user || !project) {
      toast({ title: 'Cannot save', description: 'No blueprint data available.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const idToken = await getIdToken(user);
      
      if (!offerDraft) {
        const checkResponse = await fetch('/api/user/check-offer-credit', {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const checkData = await checkResponse.json();
        
        if (!checkResponse.ok || !checkData.hasCredits) {
          toast({
            title: 'Insufficient Credits',
            description: checkData.error || "You don't have enough offer creation credits.",
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
      }

      const currentFormValues = form.getValues();
      const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
      
      const structure = OFFER_CATEGORY_STRUCTURE[offerCategory!];
      const sections: OfferSection[] = [];
      
      const selectedBp = blueprintResult?.find(bp => formatBlueprintAsText(bp) === selectedBlueprint) || blueprintResult?.[0];
      
      if (selectedBp) {
        let sectionCounter = 0;
        selectedBp.parts.forEach((part, partIndex) => {
          part.modules.forEach((module, moduleIndex) => {
            sectionCounter++;
            sections.push({
              id: `section-${sectionCounter}`,
              partNumber: partIndex + 1,
              moduleNumber: moduleIndex + 1,
              partTitle: part.title,
              moduleTitle: module.title,
              description: module.description,
              targetWordCount: module.targetWordCount || structure?.wordsPerModule || 500,
              content: '',
              wordCount: 0,
              status: 'pending',
            });
          });
        });
      }

      const draftData: Partial<OfferDraft> = {
        projectId,
        sourceOfferId: offerId,
        category: offerCategory!,
        title: offerTitle,
        subtitle: '',
        description: currentFormValues.description,
        blueprint: selectedBp || {
          id: 'custom',
          title: offerTitle,
          parts: [],
          estimatedWordCount: 0,
        },
        masterBlueprint: selectedBlueprint,
        sections,
        status: 'draft',
        currentStep: 'title',
        updatedAt: new Date().toISOString(),
      };

      if (currentFormValues.language) {
        draftData.language = currentFormValues.language;
      }
      if (currentFormValues.storytellingFramework) {
        draftData.storytellingFramework = currentFormValues.storytellingFramework;
      }
      if (currentFormValues.researchProfileId && currentFormValues.researchProfileId !== 'none') {
        draftData.researchProfileId = currentFormValues.researchProfileId;
      }
      if (currentFormValues.styleProfileId && currentFormValues.styleProfileId !== 'none') {
        draftData.styleProfileId = currentFormValues.styleProfileId;
      }

      const isNewDraft = !offerDraft;
      
      if (isNewDraft) {
        (draftData as any).createdAt = new Date().toISOString();
      }

      await setDoc(draftRef, draftData, { merge: true });

      if (isNewDraft) {
        const trackResponse = await fetch('/api/user/track-offer-creation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ 
            draftId: offerId,
            draftTitle: offerTitle,
            projectId: projectId,
          }),
        });

        if (!trackResponse.ok) {
          const error = await trackResponse.json();
          console.error('Failed to track offer creation:', error);
        }
        
        refreshCredits();
      }

      toast({ title: 'Success', description: 'Master Blueprint saved successfully.' });
      setIsEditing(false);
      setBlueprintResult(null);
      setIsRegenerating(false);
      
      setOfferDraft(prev => ({
        ...prev,
        ...draftData,
        id: offerId,
      } as OfferDraft));

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Could not save the blueprint.';
      toast({ title: 'Error Saving', description: errorMessage, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (isProjectLoading || isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!project && !isProjectLoading) {
    return notFound();
  }

  const showBlueprintGenerator = (!offerDraft?.masterBlueprint || isRegenerating) && !isEditing;
  const showMasterBlueprint = !!offerDraft?.masterBlueprint && !isEditing && !isRegenerating;
  const showEditor = isEditing;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/offer-workspace">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Offer Workspace
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <OfferWorkflowNavigation
          projectId={projectId}
          offerId={offerId}
          currentStep="blueprint"
          offerHasBlueprint={!!offerDraft?.masterBlueprint}
          offerHasTitle={!!offerDraft?.title && offerDraft?.currentStep !== 'blueprint'}
        />

        {(showBlueprintGenerator && !blueprintResult) && (
          <div className="space-y-6">
            <header>
              <h1 className="text-3xl font-bold font-headline tracking-tighter">
                Offer Blueprint: {offerTitle}
              </h1>
              <p className="text-muted-foreground">
                Step 1: Generate your offer's blueprint. This structure will guide all content generation.
              </p>
              {offerCategory && (
                <p className="text-sm text-primary mt-1">
                  Category: {OFFER_CATEGORY_LABELS[offerCategory]}
                </p>
              )}
            </header>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this offer should cover, the main topics, and what readers will gain..."
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Language</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages.map(lang => (
                              <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="storytellingFramework"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storytelling Framework (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a framework" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {frameworks.map(fw => (
                              <SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="researchProfileId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Research Profile (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {researchProfiles?.map(profile => (
                              <SelectItem key={profile.id} value={profile.id}>{profile.topic}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Provides audience insights and topic research context.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="styleProfileId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>AI Style Profile (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {styleProfiles?.map(profile => (
                              <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Guides the AI's writing tone and style.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(selectedResearchProfile || selectedStyleProfile) && (
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-600 dark:text-blue-400">
                      <strong>AI Context Active:</strong>{' '}
                      {selectedResearchProfile &&
                        `Research profile "${selectedResearchProfile.topic}" will provide audience insights.`}
                      {selectedResearchProfile && selectedStyleProfile && ' '}
                      {selectedStyleProfile &&
                        `Style profile "${selectedStyleProfile.name}" will guide the writing tone.`}
                    </AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Blueprints...
                    </>
                  ) : (
                    'Generate Blueprints'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full p-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating three distinct blueprints...</p>
          </div>
        )}

        {blueprintResult && !isEditing && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="font-headline">Select Your Blueprint</CardTitle>
                <CardDescription>
                  Review the three AI-generated outlines below. Choose the one that best fits your vision.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setBlueprintResult(null);
                  setSelectedBlueprint(null);
                  setIsEditing(false);
                }}
              >
                Try Again
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="blueprint-0" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  {blueprintResult.map((_, index) => (
                    <TabsTrigger key={index} value={`blueprint-${index}`}>
                      Option {index + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {blueprintResult.map((blueprint, index) => (
                  <TabsContent key={index} value={`blueprint-${index}`}>
                    <BlueprintDisplay blueprint={blueprint} onSelect={() => handleSelectBlueprint(blueprint)} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {showEditor && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 font-headline">
                  <Bot className="w-5 h-5" />
                  Finalize Your Master Blueprint
                </CardTitle>
                <CardDescription>
                  Make any final edits to your chosen outline, then save it to proceed.
                </CardDescription>
              </div>
              <Button onClick={handleSaveBlueprint} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Master Blueprint
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={selectedBlueprint || offerDraft?.masterBlueprint || ''}
                onChange={(e) => setSelectedBlueprint(e.target.value)}
                className="h-[60vh] font-mono text-sm"
              />
            </CardContent>
          </Card>
        )}

        {showMasterBlueprint && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 font-headline">
                  Master Blueprint for "{offerTitle}"
                </CardTitle>
                <CardDescription>
                  Your offer's structure is set. Proceed to title generation and section writing.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBlueprintResult(null);
                    setSelectedBlueprint(null);
                    setIsEditing(false);
                    setIsRegenerating(true);
                  }}
                >
                  Regenerate Blueprint
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedBlueprint(offerDraft?.masterBlueprint || '');
                    setIsEditing(true);
                    setIsRegenerating(false);
                  }}
                >
                  Edit Blueprint
                </Button>
                <Button asChild>
                  <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}/title-generator`}>
                    Next: Generate Titles
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              <p>{offerDraft?.masterBlueprint}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function BlueprintDisplay({ blueprint, onSelect }: { blueprint: OfferBlueprint; onSelect: () => void }) {
  return (
    <div className="relative p-4 border rounded-lg h-[60vh] overflow-y-auto">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold">{blueprint.title}</h3>
          {blueprint.summary && (
            <p className="text-muted-foreground mt-2">{blueprint.summary}</p>
          )}
        </div>
        <div className="space-y-4">
          {blueprint.parts.map((part, partIndex) => (
            <div key={partIndex}>
              <h4 className="font-semibold text-lg">Part {partIndex + 1}: {part.title}</h4>
              <ul className="mt-2 space-y-1">
                {part.modules.map((module, moduleIndex) => (
                  <li key={moduleIndex} className="text-sm text-muted-foreground ml-4">
                    • {module.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Estimated: ~{blueprint.estimatedWordCount.toLocaleString()} words
        </p>
      </div>
      <div className="absolute bottom-4 right-4">
        <Button onClick={onSelect}>Select & Edit This Blueprint</Button>
      </div>
    </div>
  );
}
