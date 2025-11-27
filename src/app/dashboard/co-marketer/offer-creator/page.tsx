'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, Sparkles, ArrowRight, ArrowLeft, BookOpen } from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Project } from '@/lib/definitions';
import { Loader2 } from 'lucide-react';

export default function OfferCreatorPage() {
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'projects');
  }, [user, firestore]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const isLoading = isUserLoading || projectsLoading;

  const projectsWithOutline = projects?.filter(p => p.outline) || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/co-marketer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Co-Marketer
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Offer Creator</h1>
        <p className="text-muted-foreground mt-2">
          Generate irresistible bonus material ideas for your book projects.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Archive className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Saved Offers</CardTitle>
                <CardDescription>View your saved offer ideas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Browse and manage offer ideas you&apos;ve previously saved for your book projects.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/co-marketer/offer-creator/saved">
                View Saved Offers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle>Generate New Offers</CardTitle>
                <CardDescription>Create fresh offer ideas with AI</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Select a book project and generate new bonus material ideas using AI.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/co-marketer/offer-creator/generate">
                Generate New Ideas
                <Sparkles className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Book Projects</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projectsWithOutline.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No Book Projects Yet</h3>
              <p className="text-muted-foreground mb-4">
                You need to create a book project with a blueprint first before generating offer ideas.
              </p>
              <Button asChild>
                <Link href="/dashboard/co-author">
                  Go to Co-Author
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectsWithOutline.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-2">{project.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {project.language || 'English'} • {project.storytellingFramework || 'Standard'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/dashboard/co-marketer/offer-creator/saved?projectId=${project.id}`}>
                        Saved
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/dashboard/co-marketer/offer-creator/generate?projectId=${project.id}`}>
                        Generate
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
