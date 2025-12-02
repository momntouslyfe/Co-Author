
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { researchBookTopic } from '@/ai/flows/research-book-topic';
import type { ResearchBookTopicOutput } from '@/ai/flows/research-book-topic';
import { Loader2, Save, Search, PenTool } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getIdToken } from '@/lib/client-auth';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

const formSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters.'),
  topicDescription: z.string().optional(),
  language: z.string({ required_error: 'Please select a language.' }),
  targetMarket: z.string().optional(),
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

function ResearchPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingBook, setCreatingBook] = useState(false);
  const [result, setResult] = useState<ResearchBookTopicOutput | null>(null);
  const [currentValues, setCurrentValues] = useState<FormValues | null>(null);
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();
  const [paramsCleared, setParamsCleared] = useState(false);

  const [funnelSource] = useState({
    projectId: searchParams.get('sourceFunnelProjectId') || '',
    ideaId: searchParams.get('sourceFunnelIdeaId') || '',
  });

  const [initialValues] = useState({
    topic: searchParams.get('topic') || '',
    description: searchParams.get('description') || '',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: initialValues.topic,
      topicDescription: initialValues.description,
      targetMarket: '',
    },
  });

  useEffect(() => {
    if (!paramsCleared && (initialValues.topic || initialValues.description || funnelSource.projectId)) {
      router.replace('/dashboard/research', { scroll: false });
      setParamsCleared(true);
    }
  }, [paramsCleared, initialValues, funnelSource, router]);

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to perform research.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setCurrentValues(values);
    const idToken = await getIdToken(user);
    const topicWithDescription = values.topicDescription 
      ? `${values.topic}\n\nAdditional Context: ${values.topicDescription}`
      : values.topic;
    
    const result = await researchBookTopic({
      userId: user.uid,
      idToken,
      topic: topicWithDescription,
      language: values.language,
      targetMarket: values.targetMarket,
    });
    
    if (result.success) {
      setResult(result.data);
      refreshCredits();
    } else {
      toast({
        title: 'Error during research',
        description: result.error,
        variant: 'destructive',
      });
    }
    setLoading(false);
  }

  async function saveResearchProfile(): Promise<string | null> {
    if (!result || !currentValues || !user) {
      return null;
    }
    
    try {
      const researchProfileCollection = collection(firestore, 'users', user.uid, 'researchProfiles');
      const docRef = await addDoc(researchProfileCollection, {
        userId: user.uid,
        topic: currentValues.topic,
        topicDescription: currentValues.topicDescription || null,
        language: currentValues.language,
        targetMarket: currentValues.targetMarket || '',
        ...result,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async function handleSaveResearch() {
    if (!result || !currentValues || !user) {
      toast({ title: 'Cannot save', description: 'No research data or user session available.', variant: 'destructive'});
      return;
    }
    setSaving(true);
    try {
      const profileId = await saveResearchProfile();
      if (profileId) {
        toast({ title: 'Success', description: 'Research profile saved successfully.' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error Saving', description: 'Could not save the research profile.', variant: 'destructive'});
    } finally {
      setSaving(false);
    }
  }

  async function handleWriteBook() {
    if (!result || !currentValues || !user) {
      toast({ 
        title: 'Cannot create book', 
        description: 'No research data or user session available.', 
        variant: 'destructive'
      });
      return;
    }

    setCreatingBook(true);

    try {
      const token = await user.getIdToken();

      const checkResponse = await fetch('/api/user/check-book-credit', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!checkResponse.ok) {
        const error = await checkResponse.json();
        toast({
          title: 'Insufficient Book Credits',
          description: error.error || "You don't have enough book credits to create a new book.",
          variant: 'destructive',
        });
        return;
      }

      const creditCheck = await checkResponse.json();
      if (!creditCheck.hasCredits) {
        toast({
          title: 'Insufficient Book Credits',
          description: creditCheck.message || "You don't have enough book credits to create a new book.",
          variant: 'destructive',
        });
        return;
      }

      const researchProfileId = await saveResearchProfile();
      if (!researchProfileId) {
        toast({
          title: 'Error Saving Research',
          description: 'Could not save the research profile before creating the book.',
          variant: 'destructive',
        });
        return;
      }

      const coreIdea = `Topic: ${currentValues.topic}

${currentValues.topicDescription ? `Description: ${currentValues.topicDescription}\n\n` : ''}Target Audience: ${result.targetAudienceSuggestion}

Pain Points: ${result.painPointAnalysis}

Research Summary: ${result.deepTopicResearch.substring(0, 1000)}${result.deepTopicResearch.length > 1000 ? '...' : ''}`;

      const projectData: any = {
        userId: user.uid,
        title: currentValues.topic,
        description: coreIdea,
        status: 'Draft',
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        imageUrl: `https://picsum.photos/seed/${Math.random()}/600/800`,
        imageHint: 'book cover',
        researchProfileId: researchProfileId,
        sourceType: 'research',
      };

      if (funnelSource.projectId) {
        projectData.sourceFunnelProjectId = funnelSource.projectId;
      }
      if (funnelSource.ideaId) {
        projectData.sourceFunnelIdeaId = funnelSource.ideaId;
      }

      const projectCollection = collection(firestore, 'users', user.uid, 'projects');
      const newProjectDoc = await addDoc(projectCollection, projectData);

      await fetch('/api/user/track-book-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: newProjectDoc.id,
          projectTitle: currentValues.topic,
        }),
      });

      await refreshCredits();

      toast({
        title: 'Book Project Created',
        description: `Successfully created "${currentValues.topic}" with research. Taking you to the workspace...`,
      });

      router.push(`/dashboard/co-author/${newProjectDoc.id}`);
    } catch (error: any) {
      console.error('Error creating book from research:', error);
      toast({
        title: 'Error Creating Project',
        description: error.message || 'Could not create the book project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCreatingBook(false);
    }
  }

  return (
    <>
      <FloatingCreditWidget />
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold font-headline tracking-tighter">AI Topic Research Assistant</h1>
          <p className="text-muted-foreground">
            Generate a comprehensive topic library and market analysis to build a foundation for your book.
          </p>
        </header>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic Idea</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 'The Future of Renewable Energy'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="topicDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide additional context about your topic to help the AI generate more relevant research..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Add more details about your topic, target audience, or specific angles you want to explore.
                    </FormDescription>
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
                      <FormLabel>Research Language</FormLabel>
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
                  name="targetMarket"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Market (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 'USA', 'Global Tech Industry'" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Run AI Research
                  </>
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

      {result && (
        <div className="space-y-6">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleSaveResearch} disabled={saving || creatingBook}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Research
              </Button>
              <Button onClick={handleWriteBook} disabled={saving || creatingBook}>
                {creatingBook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenTool className="mr-2 h-4 w-4" />}
                Write Book
              </Button>
            </div>
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                    <CardTitle className="font-headline">Target Audience</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                        <div className="whitespace-pre-wrap">{result.targetAudienceSuggestion}</div>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                    <CardTitle className="font-headline">Pain Point Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                       <div className="whitespace-pre-wrap">{result.painPointAnalysis}</div>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                <CardTitle className="font-headline">Deep Topic Research</CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap">{result.deepTopicResearch}</div>
                </CardContent>
            </Card>
        </div>
      )}
      </div>
    </>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <ResearchPageContent />
    </Suspense>
  );
}
