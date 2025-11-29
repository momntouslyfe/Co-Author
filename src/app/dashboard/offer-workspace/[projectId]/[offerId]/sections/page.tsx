'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ChevronRight, Check, FileText } from 'lucide-react';
import { useAuthUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import type { OfferDraft, Project, OfferSection } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { OfferWorkflowNavigation } from '@/components/offer-workflow-navigation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

export default function OfferSectionsPage() {
  const { toast } = useToast();
  const params = useParams<{ projectId: string; offerId: string }>();
  const projectId = params.projectId;
  const offerId = params.offerId;
  const { user } = useAuthUser();
  const firestore = useFirestore();

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

  const coreModules = useMemo(() => {
    if (!offerDraft?.sections) return [];
    return offerDraft.sections.filter(s => !isCanonicalSection(s));
  }, [offerDraft?.sections]);

  const groupedSections = useMemo(() => {
    if (!offerDraft?.sections) return [];

    const groups: { partTitle: string; partNumber: number; sections: OfferSection[] }[] = [];

    coreModules.forEach(section => {
      const existingGroup = groups.find(g => g.partNumber === section.partNumber);
      if (existingGroup) {
        existingGroup.sections.push(section);
      } else {
        groups.push({
          partTitle: section.partTitle,
          partNumber: section.partNumber,
          sections: [section],
        });
      }
    });

    return groups.sort((a, b) => a.partNumber - b.partNumber);
  }, [coreModules]);

  const progress = useMemo(() => {
    if (coreModules.length === 0) return 0;
    const completed = coreModules.filter(s => s.status === 'completed').length;
    return Math.round((completed / coreModules.length) * 100);
  }, [coreModules]);

  const completedSectionsCount = useMemo(() => {
    return coreModules.filter(s => s.status === 'completed').length;
  }, [coreModules]);

  const totalModulesCount = useMemo(() => {
    return coreModules.length;
  }, [coreModules]);

  const totalWordCount = useMemo(() => {
    if (!offerDraft?.sections) return 0;
    return offerDraft.sections.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  }, [offerDraft?.sections]);

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
              You need to create a master blueprint before viewing sections.
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
          <Link href={`/dashboard/offer-workspace/${projectId}/${offerId}/title-generator`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Title Generator
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

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="font-headline text-3xl">Step 3: Write Your Offer</CardTitle>
                {offerDraft.title && (
                  <p className="text-xl font-semibold text-primary mt-2">{offerDraft.title}</p>
                )}
                <CardDescription className="mt-2">
                  Your blueprint is ready. Select a section below to start writing with your AI co-author.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {OFFER_CATEGORY_LABELS[offerDraft.category]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {completedSectionsCount} of {totalModulesCount} modules completed
                </span>
                <span>
                  {totalWordCount.toLocaleString()} words generated
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {groupedSections.map(group => {
                const completedModules = group.sections.filter(s => s.status === 'completed').length;
                const totalModules = group.sections.length;
                // Calculate word count from ALL sections for this part (including canonical sections)
                const allPartSections = offerDraft.sections?.filter(s => s.partNumber === group.partNumber) || [];
                const partWordCount = allPartSections.reduce((acc, s) => acc + (s.wordCount || 0), 0);
                const isPartComplete = completedModules === totalModules && totalModules > 0;

                return (
                  <Link
                    key={group.partNumber}
                    href={`/dashboard/offer-workspace/${projectId}/${offerId}/sections/part-${group.partNumber}`}
                    className="block"
                  >
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {isPartComplete ? (
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="h-5 w-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold text-lg">
                                Part {group.partNumber}: {group.partTitle}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{totalModules} modules</span>
                                <span>{partWordCount.toLocaleString()} words</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={isPartComplete ? "default" : "secondary"}
                              className={isPartComplete ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                            >
                              {completedModules}/{totalModules} written
                            </Badge>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
