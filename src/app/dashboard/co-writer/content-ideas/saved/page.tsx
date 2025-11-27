'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  BookOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  PenTool,
  Sparkles,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import type { Project, ProjectContentIdeas, ContentIdea } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';

function SavedContentIdeasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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

  const contentIdeasDocRef = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return doc(firestore, 'users', user.uid, 'projectContentIdeas', selectedProjectId);
  }, [user, firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const { data: projectContentIdeas, isLoading: ideasLoading } = useDoc<ProjectContentIdeas>(contentIdeasDocRef);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);
  const selectedProject = useMemo(
    () => projectsWithOutline.find(p => p.id === selectedProjectId),
    [projectsWithOutline, selectedProjectId]
  );

  const ideasByCategory = useMemo(() => {
    if (!projectContentIdeas?.ideas) return new Map<string, ContentIdea[]>();

    const grouped = new Map<string, ContentIdea[]>();
    for (const idea of projectContentIdeas.ideas) {
      const category = idea.category || 'Uncategorized';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(idea);
    }
    return grouped;
  }, [projectContentIdeas]);

  const isLoading = isUserLoading || projectsLoading;

  const toggleCategory = (category: string) => {
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

  const handleDeleteIdea = async (idea: ContentIdea) => {
    if (!user || !selectedProjectId) return;

    setDeletingId(idea.id);
    try {
      const contentIdeasRef = doc(firestore, 'users', user.uid, 'projectContentIdeas', selectedProjectId);
      await updateDoc(contentIdeasRef, {
        ideas: arrayRemove(idea),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Idea Deleted',
        description: 'Content idea has been removed.',
      });
    } catch (error: any) {
      console.error('Error deleting idea:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the idea. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleWriteContent = (idea: ContentIdea) => {
    router.push(`/dashboard/co-writer/write-content?projectId=${selectedProjectId}&ideaId=${idea.id}`);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/co-writer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Co-Writer
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Saved Content Ideas</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your saved content ideas for each book project.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Book Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full max-w-md">
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
          {projectsWithOutline.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground mt-2">
              No projects with blueprints found.
            </p>
          )}
        </CardContent>
      </Card>

      {!selectedProjectId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Select a project to view saved content ideas</p>
          </CardContent>
        </Card>
      ) : ideasLoading ? (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : ideasByCategory.size === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">No saved content ideas yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate content ideas and save them to see them here.
            </p>
            <Button asChild>
              <Link href={`/dashboard/co-writer/content-ideas/generate?projectId=${selectedProjectId}`}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Ideas
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(ideasByCategory.entries()).map(([category, ideas]) => (
            <Card key={category}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <CardDescription>{ideas.length} idea{ideas.length !== 1 ? 's' : ''}</CardDescription>
                  </div>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {expandedCategories.has(category) && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {ideas.map(idea => (
                      <div
                        key={idea.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium">{idea.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {idea.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleWriteContent(idea)}
                            >
                              <PenTool className="mr-2 h-3 w-3" />
                              Write
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  disabled={deletingId === idea.id}
                                >
                                  {deletingId === idea.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Content Idea?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete &quot;{idea.title}&quot;. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteIdea(idea)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SavedContentIdeasPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <SavedContentIdeasContent />
    </Suspense>
  );
}
