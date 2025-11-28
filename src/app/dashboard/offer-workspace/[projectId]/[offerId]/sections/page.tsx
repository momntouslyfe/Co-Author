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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

  const groupedSections = useMemo(() => {
    if (!offerDraft?.sections) return [];

    const groups: { partTitle: string; partNumber: number; sections: OfferSection[] }[] = [];

    offerDraft.sections.forEach(section => {
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
  }, [offerDraft?.sections]);

  const progress = useMemo(() => {
    if (!offerDraft?.sections || offerDraft.sections.length === 0) return 0;
    const completed = offerDraft.sections.filter(s => s.status === 'completed' || s.content).length;
    return Math.round((completed / offerDraft.sections.length) * 100);
  }, [offerDraft?.sections]);

  const totalWordCount = useMemo(() => {
    if (!offerDraft?.sections) return 0;
    return offerDraft.sections.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  }, [offerDraft?.sections]);

  const targetWordCount = useMemo(() => {
    if (!offerDraft?.sections) return 0;
    return offerDraft.sections.reduce((acc, s) => acc + (s.targetWordCount || 0), 0);
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
                <CardDescription>
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
                  {offerDraft.sections?.filter(s => s.status === 'completed' || s.content).length || 0} of{' '}
                  {offerDraft.sections?.length || 0} sections written
                </span>
                <span>
                  {totalWordCount.toLocaleString()} / {targetWordCount.toLocaleString()} words
                </span>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full" defaultValue={`part-1`}>
              {groupedSections.map(group => (
                <AccordionItem key={group.partNumber} value={`part-${group.partNumber}`}>
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span>Part {group.partNumber}: {group.partTitle}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.sections.filter(s => s.status === 'completed' || s.content).length}/
                        {group.sections.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {group.sections.map(section => {
                        const isCompleted = section.status === 'completed' || !!section.content;
                        return (
                          <Link
                            key={section.id}
                            href={`/dashboard/offer-workspace/${projectId}/${offerId}/sections/${section.id}`}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isCompleted ? (
                                <Check className="h-5 w-5 text-green-500" />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium">{section.moduleTitle}</p>
                                <p className="text-sm text-muted-foreground">
                                  {section.wordCount || 0} / {section.targetWordCount} words
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isCompleted && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Completed
                                </Badge>
                              )}
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
