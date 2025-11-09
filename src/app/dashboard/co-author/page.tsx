'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import type { Project } from '@/lib/definitions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


export default function CoAuthorPage() {
    const { user, isUserLoading } = useAuthUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [open, setOpen] = useState(false);

    const projectsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, 'users', user.uid, 'projects');
    }, [user, firestore]);

    const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
    
    const isLoading = isUserLoading || projectsLoading;

    const handleCreateProject = async () => {
        if (!user || !newProjectName.trim()) {
            toast({
                title: "Invalid Project Name",
                description: "Please provide a name for your new project.",
                variant: "destructive",
            });
            return;
        }

        setIsCreating(true);
        try {
            const projectCollection = collection(firestore, 'users', user.uid, 'projects');
            // Await the addDoc to ensure the write is complete before redirecting
            const newProjectDoc = await addDoc(projectCollection, {
                userId: user.uid,
                title: newProjectName,
                status: 'Draft',
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                imageUrl: `https://picsum.photos/seed/${Math.random()}/600/800`,
                imageHint: 'book cover'
            });
            toast({
                title: "Project Created",
                description: `Successfully created "${newProjectName}".`,
            });
            setOpen(false);
            setNewProjectName('');
            router.push(`/dashboard/co-author/${newProjectDoc.id}`);
        } catch (error) {
            console.error("Error creating project:", error);
            toast({
                title: "Error Creating Project",
                description: "Could not create the project. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!user) return;
        setIsDeleting(projectId);
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'projects', projectId));
            toast({
                title: 'Project Deleted',
                description: 'Your project has been successfully deleted.'
            });
        } catch (error) {
            console.error("Error deleting project:", error);
            toast({
                title: "Error Deleting Project",
                description: "Could not delete the project. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(null);
        }
    }


    return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tighter">Co-Author Projects</h1>
                <p className="text-muted-foreground">
                Manage your books and continue your writing journey.
                </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Project
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                        Give your new project a name. Click save when you're done.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                            Name
                            </Label>
                            <Input
                            id="name"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., 'My Next Bestseller'"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                    <Button onClick={handleCreateProject} disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save and Continue
                    </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
             <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {projects.map((project) => (
                <Card key={project.id} className="flex flex-col relative group">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isDeleting === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the project "{project.title}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProject(project.id)} disabled={isDeleting === project.id}>
                                    {isDeleting === project.id ? 'Deleting...' : 'Continue'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <CardHeader className="p-0">
                    <Link href={`/dashboard/co-author/${project.id}`}>
                        <div className="aspect-[3/4] w-full relative">
                        <Image
                            src={project.imageUrl || `https://picsum.photos/seed/${project.id}/600/800`}
                            alt={`Cover for ${project.title}`}
                            fill
                            className="object-cover rounded-t-lg"
                            data-ai-hint={project.imageHint || 'book cover'}
                        />
                        </div>
                    </Link>
                    </CardHeader>
                    <CardContent className="p-4 flex-grow">
                    <h3 className="font-bold font-headline text-lg">{project.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {project.description || 'No description yet.'}
                    </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                    <Button asChild variant="secondary" className="w-full">
                        <Link href={`/dashboard/co-author/${project.id}`}>Open Workspace</Link>
                    </Button>
                    </CardFooter>
                </Card>
                ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                <CardHeader>
                    <CardTitle>No Projects Yet</CardTitle>
                    <CardDescription>
                        Click "New Project" to start your next masterpiece.
                    </CardDescription>
                </CardHeader>
            </Card>
          )}

        </div>
    );
}
