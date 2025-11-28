'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { useAuthUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import type { OfferDraft, Project } from '@/lib/definitions';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { getIdToken } from '@/lib/client-auth';
import { OfferWorkflowNavigation } from '@/components/offer-workflow-navigation';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [offerDraft, setOfferDraft] = useState<OfferDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  useEffect(() => {
    const loadOfferDraft = async () => {
      if (!user || !projectId || !offerId) return;

      try {
        const draftRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'offerDrafts', offerId);
        const draftSnap = await getDoc(draftRef);

        if (draftSnap.exists()) {
          const draft = { id: draftSnap.id, ...draftSnap.data() } as OfferDraft;
          setOfferDraft(draft);
          if (draft.title) {
            setSelectedTitle(draft.title);
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
        setSelectedTitle(data.titles[0]);
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

    const titleToSave = customTitle.trim() || selectedTitle;
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

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Step 2: Title Your Offer</CardTitle>
            <CardDescription>
              Generate compelling titles for your offer or enter your own custom title.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button onClick={handleGenerateTitles} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Title Ideas
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleKeepCurrentTitle} disabled={keeping}>
                  {keeping ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Keep Current Title
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Current title: <strong>{offerDraft.title}</strong>
              </p>
            </div>

            {titles.length > 0 && (
              <div className="space-y-4">
                <Label>Select a Generated Title</Label>
                <RadioGroup value={selectedTitle} onValueChange={setSelectedTitle}>
                  {titles.map((title, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedTitle(title)}
                    >
                      <RadioGroupItem value={title} id={`title-${index}`} />
                      <Label htmlFor={`title-${index}`} className="flex-1 cursor-pointer">
                        {title}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customTitle">Or Enter a Custom Title</Label>
              <Input
                id="customTitle"
                placeholder="Enter your own title..."
                value={customTitle}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  if (e.target.value) setSelectedTitle('');
                }}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button onClick={handleSaveTitle} disabled={saving || (!selectedTitle && !customTitle.trim())}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Title & Continue'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
