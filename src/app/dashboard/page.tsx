'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, BookCopy, FileText, Search, Loader2, PenTool } from 'lucide-react';
import { useAuthUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Project } from '@/lib/definitions';
import { formatDistanceToNow } from 'date-fns';
import { CreditSummaryCard } from '@/components/dashboard/credit-summary-card';

export default function Dashboard() {
  const { user } = useAuthUser();
  const firestore = useFirestore();

  const projectsCollectionRef = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects'),
      orderBy('lastUpdated', 'desc'),
      limit(6)
    );
  }, [user, firestore]);

  const { data: recentProjects, isLoading } = useCollection<Project>(projectsCollectionRef);

  const getProjectLink = (project: Project) => {
    // Use the authoritative currentStep field to determine the correct workflow step
    if (project.currentStep === 'title') {
      return `/dashboard/co-author/${project.id}/title-generator`;
    } else if (project.currentStep === 'chapters') {
      return `/dashboard/co-author/${project.id}/chapters`;
    } else if (project.currentStep === 'blueprint') {
      return `/dashboard/co-author/${project.id}`;
    }
    
    // Fallback to blueprint step if currentStep is missing or unexpected
    return `/dashboard/co-author/${project.id}`;
  };

  const formatLastUpdated = (timestamp: any) => {
    try {
      if (!timestamp) return 'Unknown';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <CreditSummaryCard />
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold font-headline">Welcome Back!</CardTitle>
            <CardDescription>
              Here&apos;s a quick look at your authoring world.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/co-author">View All Projects</Link>
            </Button>
          </CardContent>
        </Card>
        <Card asChild>
          <Link href="/dashboard/co-author">
            <CardHeader>
              <CardDescription>New Book</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <BookCopy className="w-5 h-5 text-primary" />
                Create New Book
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Begin your next masterpiece from scratch.
              </p>
            </CardContent>
          </Link>
        </Card>
        <Card asChild>
          <Link href="/dashboard/style-profile">
            <CardHeader>
              <CardDescription>Writing Style</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <PenTool className="w-5 h-5 text-primary" />
                Clone A Writing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Replicate your unique writing style with AI.
              </p>
            </CardContent>
          </Link>
        </Card>
        <Card asChild>
          <Link href="/dashboard/research">
            <CardHeader>
              <CardDescription>Topic Research</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <Search className="w-5 h-5 text-primary" />
                Research a Topic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Explore ideas and discover your next book topic.
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold font-headline">Recent Projects</h2>
            <p className="text-sm text-muted-foreground">
              A quick look at the books you&apos;ve been working on.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/co-author">View All</Link>
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !recentProjects || recentProjects.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
            <p className="text-muted-foreground">No projects yet. Start by creating your first project!</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/co-author">Create Project</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentProjects.map((project) => (
              <Link key={project.id} href={getProjectLink(project)} className="group">
                <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]">
                  <div className="aspect-[3/4] w-full relative">
                    <Image
                      src={project.imageUrl || `https://picsum.photos/seed/${project.id}/600/800`}
                      alt={`Cover for ${project.title}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Badge 
                      variant={project.status === 'Completed' ? 'default' : 'secondary'}
                      className={`absolute top-2 right-2 text-xs ${project.status === 'Completed' ? 'bg-primary/90' : 'bg-background/90'}`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-1">{project.title || 'Untitled Project'}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{formatLastUpdated(project.lastUpdated)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
