'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BookOpen, Loader2, TrendingUp } from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Project } from '@/lib/definitions';

export default function FunnelCreatorPage() {
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'projects');
  }, [user, firestore]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const isLoading = isUserLoading || projectsLoading;

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/co-marketer">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Co-Marketer
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Funnel Creator</h1>
        <p className="text-muted-foreground mt-2">
          Build a 7-step book funnel that guides readers through their complete learning journey.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Value Ladder Concept
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The Value Ladder is based on a simple principle: <strong>solving one problem creates a new problem</strong>. 
            When readers finish your book, they gain new skills and knowledge, but this opens up new challenges 
            and opportunities they couldn&apos;t see before.
          </p>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className="p-2 bg-primary/10 rounded-lg"
                style={{ height: `${40 + step * 10}px` }}
              >
                <span className="font-medium">Step {step}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Each step builds on the previous, creating a natural progression for your readers.
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Select a Book Project</h2>
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
                You need to create a book project with a blueprint first before building a funnel.
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
                  <Button asChild className="w-full">
                    <Link href={`/dashboard/co-marketer/funnel-creator/${project.id}`}>
                      Build Funnel
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
