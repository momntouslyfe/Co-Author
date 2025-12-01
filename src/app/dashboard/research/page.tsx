
'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
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
import type { ResearchBookTopicOutput } from '@/ai/flows/research-book-topic';
import { Loader2, Save, Search, PenTool, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getIdToken } from '@/lib/client-auth';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';
import { Progress } from '@/components/ui/progress';

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

interface ResearchProgress {
  step: number;
  total: number;
  message: string;
  done?: boolean;
}

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
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  const [partialResults, setPartialResults] = useState<{
    deepTopicResearch?: string;
    painPointAnalysis?: string;
    targetAudienceSuggestion?: string;
  }>({});

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
    setPartialResults({});
    setProgress(null);
    setCurrentValues(values);
    
    try {
      const idToken = await getIdToken(user);
      const topicWithDescription = values.topicDescription 
        ? `${values.topic}\n\nAdditional Context: ${values.topicDescription}`
        : values.topic;
      
      const response = await fetch('/api/research/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          topic: topicWithDescription,
          language: values.language,
          targetMarket: values.targetMarket,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start research');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEventType = '';
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.substring(7);
            continue;
          }
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (currentEventType === 'progress') {
                setProgress({
                  step: data.step,
                  total: data.total,
                  message: data.message,
                  done: data.done,
                });
              }
              
              if (currentEventType === 'deepResearch' && data.content) {
                setPartialResults(prev => ({ ...prev, deepTopicResearch: data.content }));
              }
              
              if (currentEventType === 'painPoints' && data.content) {
                setPartialResults(prev => ({ ...prev, painPointAnalysis: data.content }));
              }
              
              if (currentEventType === 'audiences' && data.content) {
                setPartialResults(prev => ({ ...prev, targetAudienceSuggestion: data.content }));
              }
              
              if (currentEventType === 'complete' && data.deepTopicResearch) {
                setResult({
                  deepTopicResearch: data.deepTopicResearch,
                  painPointAnalysis: data.painPointAnalysis,
                  targetAudienceSuggestion: data.targetAudienceSuggestion,
                });
                refreshCredits();
              }
              
              if (currentEventType === 'error' && data.message) {
                throw new Error(data.message);
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) {
                continue;
              }
              throw parseError;
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      toast({
        title: 'Error during research',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress(null);
    }
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
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-lg font-medium">
                  {progress?.message || 'Starting research...'}
                </span>
              </div>
              
              {progress && (
                <div className="space-y-2">
                  <Progress value={(progress.step / progress.total) * 100} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Step {progress.step} of {progress.total}</span>
                    <span>{Math.round((progress.step / progress.total) * 100)}%</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className={`flex items-center gap-2 text-sm ${progress && progress.step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress && progress.step > 1 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : progress && progress.step === 1 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span>Planning</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${progress && progress.step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress && progress.step > 2 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : progress && progress.step === 2 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span>Deep Research</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${progress && progress.step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress && progress.step > 3 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : progress && progress.step === 3 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span>Pain Points</span>
                </div>
                <div className={`flex items-center gap-2 text-sm ${progress && progress.step >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {progress && progress.step > 4 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : progress && progress.step === 4 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span>Audiences</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {loading && partialResults.deepTopicResearch && (
        <div className="space-y-6 opacity-75">
          {partialResults.deepTopicResearch && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Deep Topic Research
                </CardTitle>
              </CardHeader>
              <CardContent className="prose max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{partialResults.deepTopicResearch}</div>
              </CardContent>
            </Card>
          )}
          {partialResults.painPointAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Pain Point Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{partialResults.painPointAnalysis}</div>
              </CardContent>
            </Card>
          )}
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
