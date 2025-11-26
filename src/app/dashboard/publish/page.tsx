'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useAuthUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy } from 'firebase/firestore';
import { Project } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, ChevronRight, FileText, Calendar } from 'lucide-react';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

export default function PublishPage() {
  const { user } = useAuthUser();
  const firestore = useFirestore();

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects'),
      orderBy('lastUpdated', 'desc')
    );
  }, [user, firestore]);

  const { data: projects, isLoading } = useCollection<Project>(projectsQuery);

  const projectsWithChapters = useMemo(() => {
    if (!projects) return [];
    return projects.filter(p => p.chapters && p.chapters.length > 0 && p.title);
  }, [projects]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <FloatingCreditWidget />
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold">Co-Editor Workspace</h1>
          <p className="text-muted-foreground mt-2">
            Select a book project to edit and publish as a professional PDF ebook.
          </p>
        </div>

        {projectsWithChapters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Books Ready for Publishing</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                You need to create a book project with chapters in Co-Author before you can publish it.
              </p>
              <Link href="/dashboard/co-author">
                <Button>Go to Co-Author</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectsWithChapters.map((project) => (
              <Link key={project.id} href={`/dashboard/publish/${project.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="font-headline text-lg truncate group-hover:text-primary transition-colors">
                          {project.title}
                        </CardTitle>
                        {project.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {project.description}
                          </CardDescription>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{project.chapters?.length || 0} chapters</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(project.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
