'use client';

import { useState, useMemo } from 'react';
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
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  FileText,
  PenLine,
  BookOpen,
  FolderOpen,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import type { Project, ProjectOffers, OfferDraft, OfferCategory, OfferSection } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';

export default function OfferWorkspacePage() {
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'projects');
  }, [user, firestore]);

  const offersDocRef = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return doc(firestore, 'users', user.uid, 'projectOffers', selectedProjectId);
  }, [user, firestore, selectedProjectId]);

  const draftsQuery = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects', selectedProjectId, 'offerDrafts'),
      orderBy('updatedAt', 'desc')
    );
  }, [user, firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const { data: projectOffers, isLoading: offersLoading } = useDoc<ProjectOffers>(offersDocRef);
  const { data: offerDrafts, isLoading: draftsLoading } = useCollection<OfferDraft>(draftsQuery);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);
  const selectedProject = useMemo(
    () => projectsWithOutline.find(p => p.id === selectedProjectId),
    [projectsWithOutline, selectedProjectId]
  );

  const isLoading = isUserLoading || projectsLoading || offersLoading || draftsLoading;

  const savedOffers = projectOffers?.offers || [];
  const inProgressDrafts = offerDrafts?.filter(d => d.status === 'draft') || [];
  const completedDrafts = offerDrafts?.filter(d => d.status === 'completed') || [];

  return (
    <>
    <FloatingCreditWidget />
    <div className="container mx-auto py-8 px-4 max-w-5xl overflow-hidden">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/co-marketer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Co-Marketer
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Offer Workspace</h1>
        <p className="text-muted-foreground mt-2">
          Develop your saved offer ideas into full bonus materials - workbooks, guides, challenges, and more.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Book Project</CardTitle>
          <CardDescription>
            Choose a book project to view its saved offer ideas and develop bonus materials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="max-w-md">
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedProjectId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Select a Project</h3>
            <p className="text-muted-foreground">
              Choose a book project above to start developing bonus materials.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{selectedProject?.title}</h2>
              <p className="text-sm text-muted-foreground">
                {savedOffers.length} saved ideas, {inProgressDrafts.length} in progress, {completedDrafts.length} completed
              </p>
            </div>
          </div>

          {savedOffers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No Saved Offers</h3>
                <p className="text-muted-foreground mb-4">
                  You need to generate and save offer ideas first before developing them.
                </p>
                <Button asChild>
                  <Link href={`/dashboard/co-marketer/offer-creator/generate?projectId=${selectedProjectId}`}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Offer Ideas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Saved Offer Ideas
                      </CardTitle>
                      <CardDescription>
                        Select an offer idea to develop into a complete bonus material.
                      </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/co-marketer/offer-creator/saved?projectId=${selectedProjectId}`}>
                        View All Saved Ideas
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {savedOffers.slice(0, 5).map(offer => (
                      <div
                        key={offer.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                      >
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium truncate max-w-[200px] sm:max-w-none">{offer.title}</h4>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {OFFER_CATEGORY_LABELS[offer.category as OfferCategory] || offer.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {offer.description}
                          </p>
                        </div>
                        <Button asChild size="sm" className="shrink-0">
                          <Link href={`/dashboard/offer-workspace/blueprints?projectId=${selectedProjectId}&offerId=${offer.id}`}>
                            <Plus className="mr-2 h-4 w-4" />
                            Develop
                          </Link>
                        </Button>
                      </div>
                    ))}
                    {savedOffers.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        + {savedOffers.length - 5} more saved ideas
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {inProgressDrafts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PenLine className="h-5 w-5 text-orange-500" />
                      In Progress
                    </CardTitle>
                    <CardDescription>
                      Continue working on your offer drafts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {inProgressDrafts.map(draft => (
                        <div
                          key={draft.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                        >
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium truncate max-w-[200px] sm:max-w-none">{draft.title}</h4>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {OFFER_CATEGORY_LABELS[draft.category as OfferCategory] || draft.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {draft.sections.filter((s: OfferSection) => s.content).length} of {draft.sections.length} sections written
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="shrink-0">
                            <Link href={`/dashboard/offer-workspace/write/${draft.id}?projectId=${selectedProjectId}`}>
                              Continue
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {completedDrafts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-500" />
                      Completed Offers
                    </CardTitle>
                    <CardDescription>
                      Your finished bonus materials ready for use.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {completedDrafts.map(draft => (
                        <div
                          key={draft.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                        >
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-medium truncate max-w-[200px] sm:max-w-none">{draft.title}</h4>
                              <Badge className="text-xs shrink-0 bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                Completed
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {draft.sections.length} sections, ~{draft.sections.reduce((acc: number, s: OfferSection) => acc + (s.wordCount || 0), 0).toLocaleString()} words
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="shrink-0">
                            <Link href={`/dashboard/offer-workspace/write/${draft.id}?projectId=${selectedProjectId}`}>
                              View/Edit
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
    </>
  );
}
