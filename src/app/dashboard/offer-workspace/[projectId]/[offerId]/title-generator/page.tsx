'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Sparkles, Check, Trophy, Edit3, Lightbulb } from 'lucide-react';
import { useAuthUser, useFirestore, useMemoFirebase, useDoc, useCollection } from '@/firebase';
import type { OfferDraft, Project, StyleProfile, ResearchProfile } from '@/lib/definitions';
import { doc, updateDoc, getDoc, collection } from 'firebase/firestore';
import Link from 'next/link';
import { getIdToken } from '@/lib/client-auth';
import { OfferWorkflowNavigation } from '@/components/offer-workflow-navigation';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

interface GeneratedTitle {
  mainTitle: string;
  subtitle: string;
  formula: string;
}

export default function OfferTitleGeneratorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ projectId: string; offerId: string }>();
  const projectId = params.projectId;
  const offerId = params.offerId;
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [titles, setTitles] = useState<GeneratedTitle[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number>(-1);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [offerDraft, setOfferDraft] = useState<OfferDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  const styleProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'styleProfiles');
  }, [user, firestore]);

  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);

  const researchProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'researchProfiles');
  }, [user, firestore]);

  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);

  const selectedStyle = useMemo(() => {
    if (!offerDraft?.styleProfileId || !styleProfiles) return null;
    return styleProfiles.find(p => p.id === offerDraft.styleProfileId);
  }, [offerDraft?.styleProfileId, styleProfiles]);

  const selectedResearch = useMemo(() => {
    if (!offerDraft?.researchProfileId || !researchProfiles) return null;
    return researchProfiles.find(p => p.id === offerDraft.researchProfileId);
  }, [offerDraft?.researchProfileId, researchProfiles]);

  const researchPrompt = useMemo(() => {
    if (!selectedResearch) return undefined;
    return `Target Audience: ${selectedResearch.targetAudienceSuggestion}\nPain Points: ${selectedResearch.painPointAnalysis}\nDeep Research:\n${selectedResearch.deepTopicResearch}`;
  }, [selectedResearch]);

  const getFullTitle = (title: GeneratedTitle) => {
    return `${title.mainTitle}: ${title.subtitle}`;
  };

  const getSelectedFullTitle = () => {
    if (customTitle.trim()) {
      return customTitle.trim();
    }
    if (selectedTitleIndex >= 0 && titles[selectedTitleIndex]) {
      return getFullTitle(titles[selectedTitleIndex]);
    }
    return '';
  };

  useEffect(() => {
    const loadOfferDraft = async () => {
      if (!user || !projectId || !offerId) return;

      try {
        const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
        const draftSnap = await getDoc(draftRef);

        if (draftSnap.exists()) {
          const draft = { id: draftSnap.id, ...draftSnap.data() } as OfferDraft;
          setOfferDraft(draft);
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
  }, [user, firestore, projectId, offerId, toast]);

  const handleGenerateTitles = async () => {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to generate titles.',
        variant: 'destructive',
      });
      return;
    }

    if (!offerDraft?.masterBlueprint) {
      toast({
        title: 'Blueprint Missing',
        description: 'A saved Master Blueprint is required to generate titles.',
        variant: 'destructive',
      });
      return;
    }

    if (!offerDraft?.language) {
      toast({
        title: 'Language Missing',
        description: 'Content language must be set to generate titles.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setTitles([]);
    setSelectedTitleIndex(-1);

    try {
      const idToken = await getIdToken(user);
      const response = await fetch('/api/offers/generate-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          offerTitle: offerDraft.title,
          offerDescription: offerDraft.description || '',
          offerCategory: offerDraft.category,
          masterBlueprint: offerDraft.masterBlueprint,
          language: offerDraft.language,
          storytellingFramework: offerDraft.storytellingFramework,
          researchProfile: researchPrompt,
          styleProfile: selectedStyle?.styleAnalysis,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate titles');
      }

      const data = await response.json();
      setTitles(data.titles || []);
      refreshCredits();

      if (data.titles && data.titles.length > 0) {
        setSelectedTitleIndex(0);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast({
        title: 'Error Generating Titles',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!user || !offerDraft) return;

    const titleToSave = getSelectedFullTitle();
    if (!titleToSave) {
      toast({
        title: 'No Title Selected',
        description: 'Please select or enter a title.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
      await updateDoc(draftRef, {
        title: titleToSave,
        currentStep: 'sections',
        updatedAt: new Date().toISOString(),
      });

      toast({ title: 'Success', description: 'Title saved successfully.' });
      router.push(`/dashboard/offer-workspace/${projectId}/${offerId}/sections`);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Saving',
        description: 'Could not save the title.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeepCurrentTitle = async () => {
    if (!user || !offerDraft) return;

    setKeeping(true);
    try {
      const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
      await updateDoc(draftRef, {
        currentStep: 'sections',
        updatedAt: new Date().toISOString(),
      });

      toast({ title: 'Success', description: 'Proceeding with current title.' });
      router.push(`/dashboard/offer-workspace/${projectId}/${offerId}/sections`);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Could not update the offer.',
        variant: 'destructive',
      });
    } finally {
      setKeeping(false);
    }
  };

  if (isLoading || isProjectLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!offerDraft) {
    return notFound();
  }

  if (!offerDraft.masterBlueprint) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-medium text-lg mb-2">Blueprint Required</h3>
            <p className="text-muted-foreground mb-4">
              You need to create a master blueprint before generating titles.
            </p>
            <Button asChild>
              <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}`}>
                Go to Blueprint
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
          <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blueprint
          </Link>
        </Button>
      </div>

      <div className="space-y-8">
        <OfferWorkflowNavigation
          projectId={projectId}
          offerId={offerId}
          currentStep="title"
          offerHasBlueprint={!!offerDraft?.masterBlueprint}
          offerHasTitle={offerDraft?.currentStep === 'sections'}
        />

        {offerDraft?.title && titles.length === 0 && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              <strong>Current Title:</strong> {offerDraft.title}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Step 2: Generate High-Converting Offer Title
            </CardTitle>
            <CardDescription>
              Our AI uses proven psychological triggers and bestseller formulas to craft titles that convert 5-7x better than generic ones.
              {offerDraft?.title && ' You can generate new titles or keep your current one.'}
            </CardDescription>
            {(selectedStyle || selectedResearch) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedStyle && (
                  <Badge variant="secondary" className="text-xs">
                    Style: {selectedStyle.name}
                  </Badge>
                )}
                {selectedResearch && (
                  <Badge variant="secondary" className="text-xs">
                    Research: {selectedResearch.topic}
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleGenerateTitles} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Crafting High-Converting Titles...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {offerDraft?.title ? 'Generate New Titles' : 'Generate Titles'}
                </>
              )}
            </Button>
            {offerDraft?.title && titles.length === 0 && (
              <Button 
                variant="outline" 
                size="lg"
                className="ml-4"
                disabled={keeping}
                onClick={handleKeepCurrentTitle}
              >
                {keeping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Continuing...
                  </>
                ) : (
                  'Keep Current & Continue'
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center h-full p-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Applying Three Gateways Framework...</p>
            <p className="text-xs text-muted-foreground mt-1">Positioning • Curiosity • Hook</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" />
              Enter Your Custom Title
            </CardTitle>
            <CardDescription>Type your own offer title or generate suggestions using AI below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-title-input" className="sr-only">Custom Title</Label>
                <Input
                  id="custom-title-input"
                  type="text"
                  placeholder="Type your custom offer title here..."
                  value={customTitle}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomTitle(value);
                    if (value.trim()) {
                      setSelectedTitleIndex(-1);
                    } else if (titles.length > 0) {
                      setSelectedTitleIndex(0);
                    }
                  }}
                  className="text-lg"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  You can save this custom title directly or generate AI suggestions first.
                </p>
              </div>
              {customTitle.trim() && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveTitle} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Save Custom Title
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {titles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                High-Converting Title Suggestions
              </CardTitle>
              <CardDescription>Each title uses proven psychological formulas. Choose the one that resonates with your vision.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedTitleIndex.toString()}
                onValueChange={(value) => {
                  setSelectedTitleIndex(parseInt(value));
                  setCustomTitle('');
                }}
                className="space-y-4"
              >
                {titles.map((title, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-4 transition-all cursor-pointer ${
                      selectedTitleIndex === index 
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedTitleIndex(index);
                      setCustomTitle('');
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={index.toString()} id={`title-${index}`} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={`title-${index}`} className="font-bold text-lg cursor-pointer block text-primary">
                          {title.mainTitle}
                        </Label>
                        <p className="text-muted-foreground mt-1">
                          {title.subtitle}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {title.formula}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
            <CardContent className="flex justify-end border-t pt-6">
              <Button onClick={handleSaveTitle} disabled={saving} size="lg">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save and Continue
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
