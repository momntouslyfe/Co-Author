'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  BookOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import type { Project, ProjectOffers, OfferIdea, OfferCategory } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';

export default function SavedOffersPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const { toast } = useToast();
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || '');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'projects');
  }, [user, firestore]);

  const offersDocRef = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return doc(firestore, 'users', user.uid, 'projectOffers', selectedProjectId);
  }, [user, firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const { data: projectOffers, isLoading: offersLoading } = useDoc<ProjectOffers>(offersDocRef);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);
  const selectedProject = useMemo(
    () => projectsWithOutline.find(p => p.id === selectedProjectId),
    [projectsWithOutline, selectedProjectId]
  );

  const isLoading = isUserLoading || projectsLoading || offersLoading;

  const groupedOffers = useMemo(() => {
    if (!projectOffers?.offers) return {};
    const groups: Record<string, OfferIdea[]> = {};
    for (const offer of projectOffers.offers) {
      if (!groups[offer.category]) {
        groups[offer.category] = [];
      }
      groups[offer.category].push(offer);
    }
    return groups;
  }, [projectOffers?.offers]);

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDeleteOffer = async (offer: OfferIdea) => {
    if (!user || !selectedProjectId || !offersDocRef) return;

    setDeletingId(offer.id);
    try {
      await updateDoc(offersDocRef, {
        offers: arrayRemove(offer),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Offer Deleted',
        description: 'The offer idea has been removed.',
      });
    } catch (error: any) {
      console.error('Error deleting offer:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete the offer idea.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const totalOffers = projectOffers?.offers?.length || 0;
  const categoryCount = Object.keys(groupedOffers).length;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/co-marketer/offer-creator">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Offer Creator
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Saved Offers</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your saved offer ideas for each book project.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Book Project</CardTitle>
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
              Choose a book project above to view its saved offer ideas.
            </p>
          </CardContent>
        </Card>
      ) : totalOffers === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No Saved Offers</h3>
            <p className="text-muted-foreground mb-4">
              You haven&apos;t saved any offer ideas for &quot;{selectedProject?.title}&quot; yet.
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{selectedProject?.title}</h2>
              <p className="text-sm text-muted-foreground">
                {totalOffers} saved ideas across {categoryCount} categories
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dashboard/co-marketer/offer-creator/generate?projectId=${selectedProjectId}`}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate More
              </Link>
            </Button>
          </div>

          {Object.entries(groupedOffers).map(([category, offers]) => (
            <Card key={category}>
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategoryExpansion(category)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {OFFER_CATEGORY_LABELS[category as OfferCategory] || category}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({offers.length} ideas)
                  </span>
                </div>
                {expandedCategories.has(category) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {expandedCategories.has(category) && (
                <CardContent className="pt-0 space-y-3">
                  {offers.map(offer => (
                    <div
                      key={offer.id}
                      className="p-4 border rounded-lg flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{offer.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {offer.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Saved on {new Date(offer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === offer.id}
                          >
                            {deletingId === offer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Offer Idea?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{offer.title}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteOffer(offer)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
