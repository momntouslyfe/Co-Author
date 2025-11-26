
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useAuthUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Project } from '@/lib/definitions';
import { Loader2, Sparkles, Save, Lightbulb, CheckCircle2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { generateBookTitles } from '@/ai/flows/generate-book-titles';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getIdToken } from '@/lib/client-auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WorkflowNavigation } from '@/components/workflow-navigation';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

export default function TitleGeneratorPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');

  const projectDocRef = useMemo(() => {
    if (!user || !projectId) return null;
    const d = doc(firestore, 'users', user.uid, 'projects', projectId);
    (d as any).__memo = true;
    return d;
  }, [user, firestore, projectId]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectDocRef);

  useEffect(() => {
    if (project?.title && titles.length === 0) {
      setSelectedTitle(project.title);
    }
  }, [project?.title, titles.length]);

  const handleGenerateTitles = async () => {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to generate titles.',
        variant: 'destructive',
      });
      return;
    }
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
      const idToken = await getIdToken(user);
      const result = await generateBookTitles({
        userId: user.uid,
        idToken,
        outline: project.outline,
        language: project.language,
        storytellingFramework: project.storytellingFramework,
      });
      setTitles(result.titles);
      refreshCredits();
      if (result.titles.length > 0) {
        setSelectedTitle(result.titles[0]);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
      toast({
        title: 'Error Generating Titles',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    const trimmedTitle = selectedTitle?.trim();
    if (!trimmedTitle) {
      toast({
        title: 'No Title Selected',
        description: 'Please select or enter a title to save.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      if (!projectDocRef) throw new Error('Project reference not found.');
      await updateDoc(projectDocRef, {
        title: trimmedTitle,
        currentStep: 'chapters',
        lastUpdated: serverTimestamp(),
      });
      toast({
        title: 'Title Saved!',
        description: 'Your new project title has been saved.',
      });
      router.push(`/dashboard/co-author/${projectId}/chapters`);
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

  const handleKeepCurrentTitle = async () => {
    if (!projectDocRef) return;
    setKeeping(true);
    try {
      await updateDoc(projectDocRef, {
        currentStep: 'chapters',
        lastUpdated: serverTimestamp(),
      });
      router.push(`/dashboard/co-author/${projectId}/chapters`);
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: 'Error',
        description: 'Could not proceed to the next step.',
        variant: 'destructive',
      });
    } finally {
      setKeeping(false);
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
    <>
      <FloatingCreditWidget />
      <div className="space-y-8">
        <WorkflowNavigation
          projectId={projectId}
        currentStep="title"
        projectHasOutline={!!project?.outline}
        projectHasTitle={!!project?.title}
      />
      
      {project?.title && titles.length === 0 && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            <strong>Current Title:</strong> {project.title}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Step 2: Generate Your Book Title</CardTitle>
          <CardDescription>
            Let our AI craft the perfect, money-making title for your book based on your finalized blueprint.
            {project?.title && ' You can generate new titles or keep your current one.'}
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
                {project?.title ? 'Regenerate Titles' : 'Generate Titles'}
              </>
            )}
          </Button>
          {project?.title && titles.length === 0 && (
            <Button 
              variant="outline" 
              size="lg"
              className="ml-4"
              disabled={keeping}
              onClick={handleKeepCurrentTitle}
            >
              {keeping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Continuing...
                </>
              ) : (
                'Keep Current & Continue'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center h-full p-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Crafting compelling titles...</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            Enter Your Custom Title
          </CardTitle>
          <CardDescription>Type your own book title or generate suggestions using AI below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-title-input" className="sr-only">Custom Title</Label>
              <Input
                id="custom-title-input"
                type="text"
                placeholder="Type your custom book title here..."
                value={customTitle}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomTitle(value);
                  if (value.trim()) {
                    setSelectedTitle(value.trim());
                  } else if (titles.length > 0) {
                    setSelectedTitle(titles[0]);
                  } else {
                    setSelectedTitle('');
                  }
                }}
                className="text-lg"
              />
              <p className="text-sm text-muted-foreground mt-2">
                You can save this custom title directly or generate AI suggestions first.
              </p>
            </div>
            {customTitle.trim() && (
              <div className="flex justify-end">
                <Button onClick={handleSaveTitle} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Custom Title
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {titles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Or Select an AI-Generated Title
            </CardTitle>
            <CardDescription>Choose from the AI-generated suggestions below.</CardDescription>
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
    </>
  );
}
