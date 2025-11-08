import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { mockProjects } from '@/lib/mock-data';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tighter">My Projects</h1>
            <p className="text-muted-foreground">
            Manage your books and continue your writing journey.
            </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockProjects.map((project) => (
          <Card key={project.id} className="flex flex-col">
            <CardHeader className="p-0">
              <Link href={`/dashboard/projects/${project.id}`}>
                <div className="aspect-[3/4] w-full relative">
                  <Image
                    src={project.imageUrl}
                    alt={`Cover for ${project.title}`}
                    fill
                    className="object-cover rounded-t-lg"
                    data-ai-hint={project.imageHint}
                  />
                </div>
              </Link>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <h3 className="font-bold font-headline text-lg">{project.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {project.description}
              </p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/dashboard/projects/${project.id}`}>Open Editor</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
