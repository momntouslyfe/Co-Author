'use client';

import { useState, useMemo } from 'react';
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
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  FileText,
  Trash2,
  Edit,
  Clock,
  Target,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { Project, ContentDraft } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function SavedLandingPagesPage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'projects');
  }, [user, firestore]);

  const draftsQuery = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects', selectedProjectId, 'contentDrafts'),
      orderBy('updatedAt', 'desc')
    );
  }, [user, firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const { data: allDrafts, isLoading: draftsLoading } = useCollection<ContentDraft>(draftsQuery);
  
  const drafts = useMemo(() => {
    if (!allDrafts) return [];
    return allDrafts.filter(draft => draft.contentType === 'landing-page');
  }, [allDrafts]);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);
  const selectedProject = useMemo(
    () => projectsWithOutline.find(p => p.id === selectedProjectId),
    [projectsWithOutline, selectedProjectId]
  );

  const isLoading = isUserLoading || projectsLoading;

  const handleDelete = async (draftId: string) => {
    if (!user || !selectedProjectId) return;

    setDeletingId(draftId);
    try {
      const draftRef = doc(firestore, 'users', user.uid, 'projects', selectedProjectId, 'contentDrafts', draftId);
      await deleteDoc(draftRef);

      toast({
        title: 'Landing Page Deleted',
        description: 'The saved landing page copy has been deleted.',
      });
    } catch (error: any) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete landing page copy.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string | any) => {
    try {
      if (!dateStr) return 'Unknown date';
      if (dateStr.toDate) {
        return format(dateStr.toDate(), 'MMM d, yyyy h:mm a');
      }
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Unknown date';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please sign in to view your saved landing pages.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/co-writer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Co-Writer
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Target className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Landing Pages</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage your saved landing page copies.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Book</CardTitle>
          <CardDescription>Choose a book project to view its saved landing page copies</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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
        </CardContent>
      </Card>

      {selectedProjectId && (
        <div className="space-y-4">
          {draftsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : drafts && drafts.length > 0 ? (
            drafts.map(draft => (
              <Card key={draft.id} className="hover:shadow-md transition-shadow border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-green-600 shrink-0" />
                        <h3 className="font-semibold text-lg truncate">{draft.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {draft.content?.substring(0, 200)}...
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(draft.updatedAt)}
                        </span>
                        <span>{draft.wordCount || 0} words</span>
                        {draft.language && <span>{draft.language}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/co-writer/landing-page?projectId=${selectedProjectId}&draftId=${draft.id}`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            {deletingId === draft.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Landing Page</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{draft.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(draft.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Saved Landing Pages</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You haven't saved any landing page copies for "{selectedProject?.title}" yet.
                  </p>
                  <Button asChild>
                    <Link href={`/dashboard/co-writer/landing-page?projectId=${selectedProjectId}`}>
                      Write Landing Page Copy
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!selectedProjectId && projectsWithOutline.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No Books Available</h3>
              <p className="text-sm text-muted-foreground">
                Create a book project with a blueprint first to use Co-Writer features.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
