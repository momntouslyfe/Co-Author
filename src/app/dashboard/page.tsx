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
import { ArrowUpRight, BookCopy, FileText, Search } from 'lucide-react';
import { mockProjects } from '@/lib/mock-data';

export default function Dashboard() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold font-headline">Welcome Back!</CardTitle>
            <CardDescription>
              Here&apos;s a quick look at your authoring world.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/projects">View All Projects</Link>
            </Button>
          </CardContent>
        </Card>
        <Card asChild>
          <Link href="/dashboard/projects">
            <CardHeader className="pb-2">
              <CardDescription>New Project</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <BookCopy className="w-5 h-5 text-primary" />
                Start Writing
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
          <Link href="/dashboard/research">
            <CardHeader className="pb-2">
              <CardDescription>New Research</CardDescription>
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
        <Card asChild>
          <Link href="/dashboard/blueprint">
            <CardHeader className="pb-2">
              <CardDescription>New Blueprint</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2 font-headline">
                <FileText className="w-5 h-5 text-primary" />
                Generate Outline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Let AI create a detailed book structure for you.
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
              {mockProjects.slice(0, 3).map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div className="font-medium">{project.title}</div>
                    <div className="text-sm text-muted-foreground md:inline">
                      {project.description}
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
                  <TableCell>{project.lastUpdated}</TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
