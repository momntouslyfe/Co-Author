
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2, Save, Trash2, Upload } from 'lucide-react';
import { analyzeWritingStyle } from '@/ai/flows/analyze-writing-style';
import type { StyleProfile } from '@/lib/definitions';
import { useAuthUser, useCollection, useFirestore } from '@/firebase';
import { useMemo } from 'react';
import { getIdToken } from '@/lib/client-auth';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from '@/lib/utils';


const formSchema = z.object({
  profileName: z.string().min(3, 'Profile name must be at least 3 characters.'),
  fileDataUri: z.string().min(1, 'Please upload a file.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function StyleProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [currentProfileName, setCurrentProfileName] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { user } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profileName: '',
      fileDataUri: '',
    },
  });

  const styleProfilesQuery = useMemo(() => {
    if (!user) return null;
    const c = collection(firestore, 'users', user.uid, 'styleProfiles');
    (c as any).__memo = true;
    return c;
  }, [user, firestore]);

  const { data: savedProfiles, isLoading: profilesLoading } = useCollection<StyleProfile>(styleProfilesQuery);
  
  const handleFile = (file: File | null) => {
    if (!file) return;

    if (file.type !== 'text/plain' && file.type !== 'application/pdf') {
        toast({
            title: "Invalid File Type",
            description: "Please upload a .txt or .pdf file.",
            variant: "destructive",
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        form.setValue('fileDataUri', dataUri);
        setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to analyze your writing style.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setAnalysisResult(null);
    setCurrentProfileName(values.profileName);

    try {
      const idToken = await getIdToken(user);
      const result = await analyzeWritingStyle({ 
        userId: user.uid,
        idToken,
        fileDataUri: values.fileDataUri 
      });
      setAnalysisResult(result.styleAnalysis);
      refreshCredits();
      toast({
        title: 'Analysis Complete',
        description: 'Your writing style has been analyzed.',
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while analyzing your style. Please try again.';
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveStyle() {
    if (!analysisResult || !currentProfileName || !user) {
        toast({ title: 'Cannot Save', description: 'No analysis result or profile name available.', variant: 'destructive'});
        return;
    }
    setSaving(true);
    try {
        const styleProfileCollection = collection(firestore, 'users', user.uid, 'styleProfiles');
        await addDoc(styleProfileCollection, {
            userId: user.uid,
            name: currentProfileName,
            styleAnalysis: analysisResult,
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Style profile saved successfully.' });
        setAnalysisResult(null);
        setCurrentProfileName("");
        setFileName(null);
        form.reset();
    } catch (error) {
        console.error("Error saving style profile:", error);
        toast({ title: 'Error Saving', description: 'Could not save the style profile.', variant: 'destructive'});
    } finally {
        setSaving(false);
    }
  }

  const handleDelete = async (profileId: string) => {
    if (!user) return;
    setDeleting(profileId);
    try {
        const profileDocRef = doc(firestore, 'users', user.uid, 'styleProfiles', profileId);
        await deleteDoc(profileDocRef);
        toast({
            title: "Profile Deleted",
            description: "The style profile has been successfully deleted.",
        });
    } catch (error) {
        console.error("Error deleting style profile: ", error);
        toast({
            title: "Error",
            description: "Failed to delete the style profile. Please try again.",
            variant: "destructive",
        });
    } finally {
        setDeleting(null);
    }
}


  return (
    <>
      <FloatingCreditWidget />
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline">Your Writing Style Profiles</h1>
        <p className="text-muted-foreground">
          Create and manage multiple writing style profiles. The AI will use these to learn your unique voice.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Saved Profiles</CardTitle>
        </CardHeader>
        <CardContent>
            {profilesLoading ? (
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading profiles...</span>
                </div>
            ) : savedProfiles && savedProfiles.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {savedProfiles.map(profile => (
                        <Card key={profile.id}>
                            <AccordionItem value={profile.id} className="border-b-0">
                                <div className="flex flex-row items-center justify-between p-2">
                                    <AccordionTrigger className="w-full text-left font-medium p-2 hover:no-underline">
                                        {profile.name}
                                    </AccordionTrigger>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={deleting === profile.id} className='mr-2 flex-shrink-0'>
                                                {deleting === profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete this style profile.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(profile.id)}>
                                                    Continue
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap border-t pt-4">
                                        {profile.styleAnalysis}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Card>
                    ))}
                </Accordion>
            ) : (
                <p className="text-sm text-muted-foreground">You haven't created any style profiles yet.</p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create a New Style Profile</CardTitle>
          <CardDescription>
            Provide a sample of your writing by uploading a .txt or .pdf file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="profileName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 'Conversational Blog Post Style'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fileDataUri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Writing Sample</FormLabel>
                    <FormControl>
                      <div 
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={cn(
                          "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary/80",
                          isDragging && "border-primary bg-primary/10"
                        )}>
                          <input 
                            type="file" 
                            accept=".txt,.pdf"
                            className="absolute w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleFile(e.target.files?.[0] || null)}
                          />
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">TXT or PDF</p>
                          </div>
                          {fileName && <p className="text-xs text-primary absolute bottom-4">{fileName}</p>}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Style'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex justify-center items-center p-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
      
      {analysisResult && (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        Style Analysis for "{currentProfileName}"
                    </CardTitle>
                    <CardDescription>Review the analysis below. If you're happy with it, save it as a profile.</CardDescription>
                </div>
                <Button onClick={handleSaveStyle} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Style Profile
                </Button>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                {analysisResult}
            </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
