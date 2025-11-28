'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  FileText,
  Check,
  RefreshCw,
  BookOpen,
  Layers,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { getIdToken } from '@/lib/client-auth';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Project, ProjectOffers, OfferIdea, OfferBlueprint, OfferDraft, OfferCategory, ResearchProfile, StyleProfile, AuthorProfile } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';
import { Label } from '@/components/ui/label';

const languages = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Bangla', label: 'Bangla' },
  { value: 'Hindi', label: 'Hindi' },
];

export default function BlueprintSelectionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectIdParam = searchParams.get('projectId');
  const offerIdParam = searchParams.get('offerId');
  const { toast } = useToast();
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || '');
  const [selectedOfferId, setSelectedOfferId] = useState<string>(offerIdParam || '');
  const [blueprints, setBlueprints] = useState<OfferBlueprint[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [selectedBlueprintIndex, setSelectedBlueprintIndex] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [selectedResearchProfileId, setSelectedResearchProfileId] = useState<string>('none');
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<string>('none');
  const [selectedAuthorProfileId, setSelectedAuthorProfileId] = useState<string>('none');

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'projects');
  }, [user, firestore]);

  const offersDocRef = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return doc(firestore, 'users', user.uid, 'projectOffers', selectedProjectId);
  }, [user, firestore, selectedProjectId]);

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
  const { data: projectOffers, isLoading: offersLoading } = useDoc<ProjectOffers>(offersDocRef);
  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);
  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);
  const { data: authorProfiles } = useCollection<AuthorProfile>(authorProfilesQuery);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);
  const selectedProject = useMemo(
    () => projectsWithOutline.find(p => p.id === selectedProjectId),
    [projectsWithOutline, selectedProjectId]
  );

  const savedOffers = projectOffers?.offers || [];
  const selectedOffer = useMemo(
    () => savedOffers.find(o => o.id === selectedOfferId),
    [savedOffers, selectedOfferId]
  );

  const isLoading = isUserLoading || projectsLoading || offersLoading;

  useEffect(() => {
    setBlueprints([]);
    setSelectedBlueprintIndex(null);
  }, [selectedOfferId]);

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

  const selectedAuthorProfile = useMemo(() => {
    return selectedAuthorProfileId && selectedAuthorProfileId !== 'none'
      ? authorProfiles?.find(p => p.id === selectedAuthorProfileId)
      : undefined;
  }, [selectedAuthorProfileId, authorProfiles]);

  const handleGenerateBlueprints = async () => {
    if (!user || !selectedProject || !selectedOffer) return;

    setIsGenerating(true);
    setBlueprints([]);
    setSelectedBlueprintIndex(null);

    try {
      const idToken = await getIdToken(user);
      
      const response = await fetch('/api/offers/generate-blueprints', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bookTitle: selectedProject.title,
          bookDescription: selectedProject.description || '',
          offerCategory: selectedOffer.category,
          offerTitle: selectedOffer.title,
          offerDescription: selectedOffer.description,
          language: selectedLanguage,
          researchProfile: selectedResearchProfile
            ? `PAIN POINTS:\n${selectedResearchProfile.painPointAnalysis}\n\nDEEP RESEARCH:\n${selectedResearchProfile.deepTopicResearch}`
            : undefined,
          styleProfile: selectedStyleProfile?.styleAnalysis,
          authorProfile: selectedAuthorProfile
            ? `Author: ${selectedAuthorProfile.penName}\nBio: ${selectedAuthorProfile.bio}${selectedAuthorProfile.credentials ? `\nCredentials: ${selectedAuthorProfile.credentials}` : ''}`
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate blueprints');
      }

      const data = await response.json();
      setBlueprints(data.blueprints);

      toast({
        title: 'Blueprints Generated',
        description: `${data.blueprints.length} blueprint variations created for your offer.`,
      });
    } catch (error: any) {
      console.error('Blueprint generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate blueprints.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectBlueprint = async (index: number) => {
    if (!user || !selectedProject || !selectedOffer || !blueprints[index]) return;

    setIsCreatingDraft(true);
    const blueprint = blueprints[index];

    try {
      const idToken = await getIdToken(user);
      if (!idToken) {
        throw new Error('Please sign in to continue.');
      }

      const creditCheck = await fetch('/api/user/check-offer-credit', {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      if (!creditCheck.ok) {
        const errorData = await creditCheck.json().catch(() => ({ error: 'Failed to check credits' }));
        throw new Error(errorData.error || 'Failed to verify credit availability.');
      }
      const creditData = await creditCheck.json();
      if (!creditData.hasCredits) {
        throw new Error(creditData.error || 'Insufficient offer credits. Please purchase more credits or upgrade your plan.');
      }

      const draftId = `${selectedOfferId}-${Date.now()}`;
      const sections = blueprint.parts.flatMap((part, partIndex) =>
        part.modules.map((module, moduleIndex) => ({
          id: `${partIndex}-${moduleIndex}`,
          partTitle: part.title,
          partNumber: partIndex + 1,
          moduleTitle: module.title,
          moduleNumber: moduleIndex + 1,
          description: module.description,
          targetWordCount: module.targetWordCount,
          content: '',
          wordCount: 0,
          status: 'pending' as const,
        }))
      );

      const draft: Omit<OfferDraft, 'id'> = {
        projectId: selectedProjectId,
        sourceOfferId: selectedOfferId,
        category: selectedOffer.category as Exclude<OfferCategory, 'all'>,
        title: blueprint.title,
        subtitle: blueprint.subtitle,
        blueprint: blueprint,
        sections,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const draftRef = doc(firestore, 'users', user.uid, 'projects', selectedProjectId, 'offerDrafts', draftId);
      await setDoc(draftRef, {
        ...draft,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const trackResponse = await fetch('/api/user/track-offer-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          draftId,
          draftTitle: blueprint.title,
          projectId: selectedProjectId,
        }),
      });

      if (!trackResponse.ok) {
        const errorData = await trackResponse.json().catch(() => ({ error: 'Failed to track offer creation' }));
        throw new Error(errorData.error || 'Failed to deduct offer credits. Please try again.');
      }

      toast({
        title: 'Draft Created',
        description: 'Your offer draft is ready. Redirecting to the writing workspace...',
      });

      router.push(`/dashboard/offer-workspace/write/${draftId}?projectId=${selectedProjectId}`);
    } catch (error: any) {
      console.error('Draft creation error:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create draft.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingDraft(false);
    }
  };

  return (
    <div>
      <FloatingCreditWidget />
      <div className="container mx-auto py-8 px-4 max-w-5xl overflow-hidden">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/offer-workspace">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Offer Workspace
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Select Blueprint</h1>
        <p className="text-muted-foreground mt-2">
          Choose a structure for your bonus material. AI will generate 3 blueprint variations for you to pick from.
        </p>
      </div>

      <div className="grid gap-6 mb-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Book Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProjectId} onValueChange={(v) => {
              setSelectedProjectId(v);
              setSelectedOfferId('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a book project" />
              </SelectTrigger>
              <SelectContent>
                {projectsWithOutline.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Offer Idea</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedOfferId} 
              onValueChange={setSelectedOfferId}
              disabled={!selectedProjectId || savedOffers.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={savedOffers.length === 0 ? "No saved offers" : "Select an offer idea"} />
              </SelectTrigger>
              <SelectContent>
                {savedOffers.map(offer => (
                  <SelectItem key={offer.id} value={offer.id}>
                    <div className="flex items-center gap-2">
                      <span>{offer.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {OFFER_CATEGORY_LABELS[offer.category as OfferCategory] || offer.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedOffer && (
        <>
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Context Settings</CardTitle>
            <CardDescription>
              Optionally select profiles to help the AI generate better blueprints based on your research, style, and author identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Research Profile (Optional)</Label>
                <Select value={selectedResearchProfileId} onValueChange={setSelectedResearchProfileId}>
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
                <Label>Style Profile (Optional)</Label>
                <Select value={selectedStyleProfileId} onValueChange={setSelectedStyleProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {styleProfiles?.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Author Profile (Optional)</Label>
                <Select value={selectedAuthorProfileId} onValueChange={setSelectedAuthorProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {authorProfiles?.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>{profile.penName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="secondary" className="mb-2">
                  {OFFER_CATEGORY_LABELS[selectedOffer.category as OfferCategory] || selectedOffer.category}
                </Badge>
                <CardTitle>{selectedOffer.title}</CardTitle>
                <CardDescription className="mt-2">
                  {selectedOffer.description}
                </CardDescription>
              </div>
              <Button 
                onClick={handleGenerateBlueprints}
                disabled={isGenerating || isCreatingDraft}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : blueprints.length > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Blueprints
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>
        </>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedProjectId || !selectedOfferId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Select Project and Offer</h3>
            <p className="text-muted-foreground">
              Choose a book project and an offer idea above to generate blueprint options.
            </p>
          </CardContent>
        </Card>
      ) : blueprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Generate Blueprints</h3>
            <p className="text-muted-foreground mb-4">
              Click the Generate button above to create 3 structure options for your offer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Choose Your Blueprint</h2>
          <p className="text-sm text-muted-foreground">
            Select one of the 3 blueprint variations to begin writing your offer material.
          </p>

          <Tabs defaultValue="0" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="0">Option 1</TabsTrigger>
              <TabsTrigger value="1">Option 2</TabsTrigger>
              <TabsTrigger value="2">Option 3</TabsTrigger>
            </TabsList>

            {blueprints.map((blueprint, index) => (
              <TabsContent key={index} value={String(index)} className="mt-4">
                <Card className={selectedBlueprintIndex === index ? 'ring-2 ring-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{blueprint.title}</CardTitle>
                        {blueprint.subtitle && (
                          <CardDescription className="mt-1">{blueprint.subtitle}</CardDescription>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{blueprint.parts.length} parts</div>
                        <div>{blueprint.parts.reduce((acc, p) => acc + p.modules.length, 0)} modules</div>
                        <div>~{blueprint.estimatedWordCount.toLocaleString()} words</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {blueprint.parts.map((part, partIndex) => (
                        <div key={partIndex} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">
                            Part {partIndex + 1}: {part.title}
                          </h4>
                          <ul className="space-y-2">
                            {part.modules.map((module, modIndex) => (
                              <li key={modIndex} className="flex items-start gap-2 text-sm">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-medium">{module.title}</span>
                                  <span className="text-muted-foreground ml-2">
                                    (~{module.targetWordCount} words)
                                  </span>
                                  <p className="text-muted-foreground text-xs mt-0.5">
                                    {module.description}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button 
                        onClick={() => handleSelectBlueprint(index)}
                        disabled={isCreatingDraft}
                        size="lg"
                      >
                        {isCreatingDraft && selectedBlueprintIndex === index ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Draft...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Use This Blueprint
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
      </div>
    </div>
  );
}
