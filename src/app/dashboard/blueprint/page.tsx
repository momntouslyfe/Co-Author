'use client';

import { useEffect, useState } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateBookBlueprint } from '@/ai/flows/generate-book-blueprint';
import type { GenerateBookBlueprintOutput } from '@/ai/flows/generate-book-blueprint';
import { Bot, Loader2 } from 'lucide-react';
import { useAuthUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { ResearchProfile } from '@/lib/definitions';
import { collection } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  topic: z.string().min(5, 'Topic must be at least 5 characters.'),
  targetAudience: z.string().min(5, 'Target audience must be at least 5 characters.'),
  marketAnalysis: z.string().optional(),
  userInput: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function BlueprintPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateBookBlueprintOutput | null>(null);
  const { user } = useAuthUser();
  const firestore = useFirestore();

  const researchProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'researchProfiles');
  }, [user, firestore]);

  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      targetAudience: '',
      marketAnalysis: '',
      userInput: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setResult(null);
    try {
      const blueprint = await generateBookBlueprint({
        ...values,
        marketAnalysis: values.marketAnalysis || 'Not provided',
        userInput: values.userInput || 'Not provided',
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

  const handleProfileSelect = (profileId: string) => {
    const profile = researchProfiles?.find(p => p.id === profileId);
    if (profile) {
      form.setValue('topic', profile.topic);
      form.setValue('targetAudience', profile.targetAudienceSuggestion);
      form.setValue('marketAnalysis', `PAIN POINTS:\n${profile.painPointAnalysis}\n\nDEEP RESEARCH:\n${profile.deepTopicResearch}`);
    }
  };


  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <header>
            <h1 className="text-3xl font-bold font-headline tracking-tighter">Co-Author Workspace</h1>
            <p className="text-muted-foreground">
            Generate a detailed book outline based on your ideas or a saved research profile.
            </p>
        </header>
        
        {researchProfiles && researchProfiles.length > 0 && (
          <Select onValueChange={handleProfileSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Or select a saved research profile..." />
            </SelectTrigger>
            <SelectContent>
              {researchProfiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>{profile.topic}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., The history of ancient Rome" {...field} />
                  </FormControl>
                  <FormDescription>What is the core subject of your book?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., History buffs and students" {...field} />
                  </FormControl>
                  <FormDescription>Who are you writing this book for?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="marketAnalysis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Analysis (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Similar books, unique selling points..." {...field} rows={5} />
                  </FormControl>
                  <FormDescription>Any research on competing books or market gaps.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other Preferences (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Tone, specific chapters to include..." {...field} />
                  </FormControl>
                  <FormDescription>Any other specific instructions for the AI.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Outline'
              )}
            </Button>
          </form>
        </Form>
      </div>
      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Bot className="w-5 h-5" />
              Generated Outline
            </CardTitle>
            <CardDescription>Your AI-generated book blueprint will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-headline whitespace-pre-wrap h-[60vh] overflow-y-auto">
            {loading && <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            {result ? (
              <p>{result.outline}</p>
            ) : (
              !loading && <p className="text-muted-foreground">Your outline is waiting to be created...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
