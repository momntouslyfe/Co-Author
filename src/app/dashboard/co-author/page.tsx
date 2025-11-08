'use client';

import { useState } from 'react';
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
import { Bot, Loader2 } from 'lucide-react';
import { useAuthUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { ResearchProfile } from '@/lib/definitions';
import { collection } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  topic: z.string().min(10, 'Please describe your core idea in at least 10 characters.'),
  language: z.string({ required_error: 'Please select a language.' }),
  storytellingFramework: z.string({ required_error: 'Please select a framework.' }),
  researchProfileId: z.string().optional(),
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

export default function CoAuthorPage() {
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
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setResult(null);

    const selectedProfile = researchProfiles?.find(p => p.id === values.researchProfileId);
    const researchProfileContent = selectedProfile 
      ? `PAIN POINTS:\n${selectedProfile.painPointAnalysis}\n\nDEEP RESEARCH:\n${selectedProfile.deepTopicResearch}`
      : undefined;

    try {
      const blueprint = await generateBookBlueprint({
        topic: values.topic,
        language: values.language,
        storytellingFramework: values.storytellingFramework,
        researchProfile: researchProfileContent,
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

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <header>
            <h1 className="text-3xl font-bold font-headline tracking-tighter">Create a New Project (Step 1 & 2)</h1>
            <p className="text-muted-foreground">
              Lock in the "DNA" of your project. This strategy will guide all future AI generation.
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
                    <Textarea placeholder="e.g., 'A book about street food in Dhaka' or 'A mini-course on the basics of investing.'" {...field} rows={3} />
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
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Blueprint'
              )}
            </Button>
          </form>
        </Form>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Bot className="w-5 h-5" />
              Generated Blueprint
            </CardTitle>
            <CardDescription>Your AI-generated book blueprint will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-headline whitespace-pre-wrap h-[60vh] overflow-y-auto">
            {loading && <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            {result ? (
              <p>{result.outline}</p>
            ) : (
              !loading && <p className="text-muted-foreground">Your blueprint is waiting to be created...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
