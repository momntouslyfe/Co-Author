
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateBookBlueprint } from '@/ai/flows/generate-book-blueprint';
import type { GenerateBookBlueprintOutput } from '@/ai/flows/generate-book-blueprint';
import { Bot, Loader2, Save } from 'lucide-react';
import { useAuthUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import type { ResearchProfile, StyleProfile, Project } from '@/lib/definitions';
import { collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParams, notFound, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';


const formSchema = z.object({
  topic: z.string().min(10, 'Please describe your core idea in at least 10 characters.'),
  language: z.string({ required_error: 'Please select a language.' }),
  storytellingFramework: z.string({ required_error: 'Please select a framework.' }),
  researchProfileId: z.string().optional(),
  styleProfileId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const languages = [
    { value: 'English', label: 'English' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'French', label: 'French' },
    { value: 'German', label: 'German' },
    { value: 'Bangla', label: 'Bangla' },
    { value: 'Hindi', label: 'Hindi' },
];

const frameworks = [
    { value: 'The Hero\'s Journey', label: 'The Hero\'s Journey' },
    { value: 'The Mentor\'s Journey', label: 'The Mentor\'s Journey' },
    { value: 'Three-Act Structure', label: 'Three-Act Structure' },
    { value: 'Fichtean Curve', label: 'Fichtean Curve' },
    { value: 'Save the Cat', label: 'Save the Cat' },
];

export default function CoAuthorWorkspacePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [result, setResult] = useState<GenerateBookBlueprintOutput | null>(null);
  const [selectedOutline, setSelectedOutline] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);


  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading, error } = useDoc<Project>(projectDocRef);

  const researchProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'researchProfiles');
  }, [user, firestore]);

  const styleProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'styleProfiles');
  }, [user, firestore]);

  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);
  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
    },
  });
  
  useEffect(() => {
    if (project) {
        form.reset({ 
            topic: project.description || '',
            language: project.language || '',
        });
    }
  }, [project, form]);


  async function onSubmit(values: FormValues) {
    setLoading(true);
    setResult(null);
    setSelectedOutline(null);
    setIsEditing(false);

    const selectedResearchProfile = researchProfiles?.find(p => p.id === values.researchProfileId);
    const researchProfileContent = selectedResearchProfile 
      ? `PAIN POINTS:\n${selectedResearchProfile.painPointAnalysis}\n\nDEEP RESEARCH:\n${selectedResearchProfile.deepTopicResearch}`
      : undefined;

    const selectedStyleProfile = styleProfiles?.find(p => p.id === values.styleProfileId);
    const styleProfileContent = selectedStyleProfile?.styleAnalysis;

    try {
      const blueprint = await generateBookBlueprint({
        topic: values.topic,
        language: values.language,
        storytellingFramework: values.storytellingFramework,
        researchProfile: researchProfileContent,
        styleProfile: styleProfileContent,
      });
      setResult(blueprint);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Blueprint',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleSelectOutline = (outline: string) => {
    setSelectedOutline(outline);
    setIsEditing(true);
  }

  async function handleSaveBlueprint() {
    if (!selectedOutline) {
        toast({ title: 'Cannot save', description: 'No blueprint data available.', variant: 'destructive'});
        return;
    }
    setSaving(true);
    try {
      if (!projectDocRef) throw new Error("Project reference not found.");
      const currentFormValues = form.getValues();
      await updateDoc(projectDocRef, {
        outline: selectedOutline,
        language: currentFormValues.language,
        description: currentFormValues.topic,
        lastUpdated: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Master Blueprint saved successfully.' });
      setIsEditing(false); // Lock it in
    } catch (error) {
      console.error(error);
      toast({ title: 'Error Saving', description: 'Could not save the blueprint.', variant: 'destructive'});
    } finally {
      setSaving(false);
    }
  }

  if (isProjectLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!project && !isProjectLoading) {
    return notFound();
  }
  
  const showBlueprintGenerator = !project?.outline;
  const showMasterBlueprint = !!project?.outline && !isEditing;
  const showEditor = !!project?.outline && isEditing;


  return (
    <div className="space-y-8">
      {(showBlueprintGenerator && !result && !isEditing) && (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tighter">Co-Author Workspace: {project?.title}</h1>
                <p className="text-muted-foreground">
                Step 1: Generate your book's blueprint. This strategy will guide all future AI generation.
                </p>
            </header>
            
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Your Core Idea</FormLabel>
                    <FormControl>
                        <Textarea 
                            placeholder={"e.g., 'A book about street food in Dhaka' or 'A mini-course on the basics of investing.'"}
                            {...field}
                            rows={3} 
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Project Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {languages.map(lang => (
                                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="storytellingFramework"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Storytelling Framework</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a framework" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {frameworks.map(fw => (
                                <SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="researchProfileId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>AI Research Profile (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {researchProfiles?.map(profile => (
                                <SelectItem key={profile.id} value={profile.id}>{profile.topic}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            Select a research profile to give the AI more context for generating the blueprint.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="styleProfileId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>AI Style Profile (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="None" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {styleProfiles?.map(profile => (
                                <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            Select a style profile to guide the AI's writing voice.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <Button type="submit" disabled={loading} size="lg">
                {loading ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Blueprints...
                    </>
                ) : (
                    'Generate Blueprints'
                )}
                </Button>
            </form>
            </Form>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center h-full p-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Generating three distinct blueprints...</p>
        </div>
      )}

      {result && !isEditing && (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Select Your Blueprint</CardTitle>
                <CardDescription>Review the three AI-generated outlines below. Choose the one that best fits your vision to proceed.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="outlineA" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="outlineA">Outline A</TabsTrigger>
                        <TabsTrigger value="outlineB">Outline B</TabsTrigger>
                        <TabsTrigger value="outlineC">Outline C</TabsTrigger>
                    </TabsList>
                    <TabsContent value="outlineA">
                        <BlueprintDisplay outline={result.outlineA} onSelect={() => handleSelectOutline(result.outlineA)} />
                    </TabsContent>
                    <TabsContent value="outlineB">
                        <BlueprintDisplay outline={result.outlineB} onSelect={() => handleSelectOutline(result.outlineB)} />
                    </TabsContent>
                    <TabsContent value="outlineC">
                        <BlueprintDisplay outline={result.outlineC} onSelect={() => handleSelectOutline(result.outlineC)} />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      )}

      {showEditor && (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                <CardTitle className="flex items-center gap-2 font-headline">
                    <Bot className="w-5 h-5" />
                    Finalize Your Master Blueprint
                </CardTitle>
                <CardDescription>Make any final edits to your chosen outline, then save it to lock it in.</CardDescription>
                </div>
                <Button onClick={handleSaveBlueprint} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Master Blueprint
                </Button>
            </CardHeader>
            <CardContent>
                <Textarea
                    value={selectedOutline || project?.outline || ''}
                    onChange={(e) => setSelectedOutline(e.target.value)}
                    className="h-[60vh] font-mono text-sm"
                />
            </CardContent>
        </Card>
      )}

       {showMasterBlueprint && (
         <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                <CardTitle className="flex items-center gap-2 font-headline">
                    Master Blueprint for "{project?.title}"
                </CardTitle>
                <CardDescription>Your book's structure is locked in. You can now proceed to title generation and chapter writing.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        setSelectedOutline(project?.outline || '');
                        setIsEditing(true);
                    }}>
                        Edit Blueprint
                    </Button>
                     <Button asChild>
                        <Link href={`/dashboard/co-author/${projectId}/title-generator`}>Next: Generate Titles</Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              <p>{project?.outline}</p>
            </CardContent>
        </Card>
       )}

    </div>
  );
}

function BlueprintDisplay({ outline, onSelect }: { outline: string, onSelect: () => void }) {
    return (
        <div className="relative p-4 border rounded-lg h-[60vh] overflow-y-auto">
             <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                <p>{outline}</p>
             </div>
             <div className="absolute bottom-4 right-4">
                <Button onClick={onSelect}>Select & Edit This Outline</Button>
             </div>
        </div>
    )
}

    