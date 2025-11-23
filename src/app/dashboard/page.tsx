'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      limit(3)
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

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Recent Projects</CardTitle>
          <CardDescription>
            A quick look at the books you&apos;ve been working on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : !recentProjects || recentProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No projects yet. Start by creating your first project!
                  </TableCell>
                </TableRow>
              ) : (
                recentProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="font-medium">{project.title || 'Untitled Project'}</div>
                      <div className="text-sm text-muted-foreground md:inline">
                        {project.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={project.status === 'Completed' ? 'default' : 'secondary'}
                        className={project.status === 'Completed' ? 'bg-primary/80' : ''}
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatLastUpdated(project.lastUpdated)}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={getProjectLink(project)}>
                          <ArrowUpRight className="h-4 w-4" />
                          <span className="sr-only">Continue</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
