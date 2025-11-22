
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { researchBookTopic } from '@/ai/flows/research-book-topic';
import type { ResearchBookTopicOutput } from '@/ai/flows/research-book-topic';
import { Loader2, Save, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getIdToken } from '@/lib/client-auth';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

const formSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters.'),
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

export default function ResearchPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ResearchBookTopicOutput | null>(null);
  const [currentValues, setCurrentValues] = useState<FormValues | null>(null);
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      targetMarket: '',
    },
  });

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
    try {
      const idToken = await getIdToken(user);
      const researchData = await researchBookTopic({
        userId: user.uid,
        idToken,
        ...values
      });
      setResult(researchData);
      refreshCredits();
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
    }
  }

  async function handleSaveResearch() {
    if (!result || !currentValues || !user) {
      toast({ title: 'Cannot save', description: 'No research data or user session available.', variant: 'destructive'});
      return;
    }
    setSaving(true);
    try {
      const researchProfileCollection = collection(firestore, 'users', user.uid, 'researchProfiles');
      await addDoc(researchProfileCollection, {
        userId: user.uid,
        topic: currentValues.topic,
        language: currentValues.language,
        targetMarket: currentValues.targetMarket || '',
        ...result,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Research profile saved successfully.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error Saving', description: 'Could not save the research profile.', variant: 'destructive'});
    } finally {
      setSaving(false);
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
            <div className="flex justify-end">
              <Button onClick={handleSaveResearch} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Research
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
