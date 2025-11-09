
'use client';

import { useState } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Project } from '@/lib/definitions';
import { Loader2, Sparkles, Save, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateBookTitles } from '@/ai/flows/generate-book-titles';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function TitleGeneratorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { user } = useAuthUser();
  const firestore = useFirestore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  const handleGenerateTitles = async () => {
    if (!project?.outline) {
      toast({
        title: 'Outline Missing',
        description: 'A saved Master Blueprint is required to generate titles.',
        variant: 'destructive',
      });
      return;
    }
    if (!project?.language) {
      toast({
        title: 'Language Missing',
        description: 'A project language must be set to generate titles.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setTitles([]);
    try {
      const result = await generateBookTitles({
        outline: project.outline,
        language: project.language,
      });
      setTitles(result.titles);
      if (result.titles.length > 0) {
        setSelectedTitle(result.titles[0]);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Titles',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!selectedTitle) {
      toast({
        title: 'No Title Selected',
        description: 'Please select a title to save.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      if (!projectDocRef) throw new Error('Project reference not found.');
      await updateDoc(projectDocRef, {
        title: selectedTitle,
        lastUpdated: serverTimestamp(),
      });
      toast({
        title: 'Title Saved!',
        description: 'Your new project title has been saved.',
      });
      // Navigate to the next step, e.g., the chapter list
      // router.push(`/dashboard/co-author/${projectId}/chapters`);
    } catch (error) {
      console.error('Error saving title:', error);
      toast({
        title: 'Error Saving Title',
        description: 'Could not save the selected title.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
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

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Step 2: Generate Your Book Title</CardTitle>
          <CardDescription>
            Let our AI craft the perfect, money-making title for your book based on your finalized blueprint.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={handleGenerateTitles} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Titles
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center h-full p-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Crafting compelling titles...</p>
        </div>
      )}

      {titles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Select Your Favorite Title
            </CardTitle>
            <CardDescription>Choose the title that best captures the essence of your book.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedTitle}
              onValueChange={setSelectedTitle}
              className="space-y-4"
            >
              {titles.map((title, index) => (
                <div key={index} className="flex items-center space-x-3 border rounded-md p-4 has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                  <RadioGroupItem value={title} id={`title-${index}`} />
                  <Label htmlFor={`title-${index}`} className="font-medium text-lg cursor-pointer flex-1">
                    {title}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
          <CardContent className="flex justify-end">
            <Button onClick={handleSaveTitle} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save and Continue
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
