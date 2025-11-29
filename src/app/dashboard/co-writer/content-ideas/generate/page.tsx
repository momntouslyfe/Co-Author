'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  BookOpen,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import type { Project, ResearchProfile, StyleProfile, ProjectContentIdeas, ContentIdea } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { generateContentIdeas } from '@/ai/flows/generate-content-ideas';
import { getIdToken } from '@/lib/client-auth';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

type GeneratedIdea = {
  id: string;
  category: string;
  title: string;
  description: string;
  selected: boolean;
};

const languages = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Bangla', label: 'Bangla' },
  { value: 'Hindi', label: 'Hindi' },
];

const storytellingFrameworks = [
  { value: "The Hero's Journey", label: "The Hero's Journey" },
  { value: "The Mentor's Journey", label: "The Mentor's Journey" },
  { value: 'Three-Act Structure', label: 'Three-Act Structure' },
  { value: 'Fichtean Curve', label: 'Fichtean Curve' },
  { value: 'Save the Cat', label: 'Save the Cat' },
];

const contentFrameworks = [
  { value: 'AIDA (Attention, Interest, Desire, Action)', label: 'AIDA - Attention, Interest, Desire, Action' },
  { value: 'PAS (Problem, Agitation, Solution)', label: 'PAS - Problem, Agitation, Solution' },
  { value: 'BAB (Before, After, Bridge)', label: 'BAB - Before, After, Bridge' },
  { value: 'FAB (Features, Advantages, Benefits)', label: 'FAB - Features, Advantages, Benefits' },
  { value: '4Ps (Promise, Picture, Proof, Push)', label: '4Ps - Promise, Picture, Proof, Push' },
  { value: 'PASTOR (Problem, Amplify, Story, Transformation, Offer, Response)', label: 'PASTOR - Problem to Response' },
  { value: 'QUEST (Qualify, Understand, Educate, Stimulate, Transition)', label: 'QUEST - Qualify to Transition' },
  { value: 'SLAP (Stop, Look, Act, Purchase)', label: 'SLAP - Stop, Look, Act, Purchase' },
  { value: 'ACCA (Awareness, Comprehension, Conviction, Action)', label: 'ACCA - Awareness to Action' },
  { value: 'PPPP (Picture, Promise, Prove, Push)', label: '4P - Picture, Promise, Prove, Push' },
  { value: 'SSS (Star, Story, Solution)', label: 'SSS - Star, Story, Solution' },
  { value: 'APP (Agree, Promise, Preview)', label: 'APP - Agree, Promise, Preview' },
];

const contentCategories = [
  { value: 'Blog Post', label: 'Blog Post' },
  { value: 'Email Newsletter', label: 'Email Newsletter' },
  { value: 'Social Media Post', label: 'Social Media Post' },
  { value: 'Video Script', label: 'Video Script' },
  { value: 'Podcast Show Notes', label: 'Podcast Show Notes' },
  { value: 'Press Release', label: 'Press Release' },
  { value: 'Book Description', label: 'Book Description/Blurb' },
  { value: 'Author Bio', label: 'Author Bio' },
  { value: 'Landing Page Copy', label: 'Landing Page Copy' },
  { value: 'Lead Magnet', label: 'Lead Magnet' },
  { value: 'Case Study', label: 'Case Study' },
  { value: 'Sales Page', label: 'Sales Page' },
  { value: 'Testimonial Request', label: 'Testimonial Request' },
  { value: 'Book Review Request', label: 'Book Review Request' },
  { value: 'Media Kit', label: 'Media Kit' },
];

function GenerateContentIdeasContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const { toast } = useToast();
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || '');
  const [contentCategory, setContentCategory] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [selectedResearchProfileId, setSelectedResearchProfileId] = useState<string>('');
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<string>('');
  const [selectedStorytellingFramework, setSelectedStorytellingFramework] = useState<string>('');
  const [selectedContentFramework, setSelectedContentFramework] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [showSettings, setShowSettings] = useState(true);

  const projectsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'projects');
  }, [user, firestore]);

  const researchProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'researchProfiles');
  }, [user, firestore]);

  const styleProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'styleProfiles');
  }, [user, firestore]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);
  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);
  const selectedProject = useMemo(
    () => projectsWithOutline.find(p => p.id === selectedProjectId),
    [projectsWithOutline, selectedProjectId]
  );

  const isLoading = isUserLoading || projectsLoading;

  const handleGenerate = async () => {
    if (!user || !selectedProject || !contentCategory.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please select a project and enter a content category.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const idToken = await getIdToken(user);

      const selectedResearch = researchProfiles?.find(r => r.id === selectedResearchProfileId);
      const selectedStyle = styleProfiles?.find(s => s.id === selectedStyleProfileId);

      const researchContext = selectedResearch
        ? `Topic: ${selectedResearch.topic}\nAudience: ${selectedResearch.targetAudienceSuggestion}\nPain Points: ${selectedResearch.painPointAnalysis}`
        : undefined;

      const frameworkContext = [
        selectedStorytellingFramework && selectedStorytellingFramework !== 'none' ? `Storytelling Framework: ${selectedStorytellingFramework}` : '',
        selectedContentFramework && selectedContentFramework !== 'none' ? `Content Framework: ${selectedContentFramework}` : '',
      ].filter(Boolean).join('\n');

      const result = await generateContentIdeas({
        userId: user.uid,
        idToken,
        bookTitle: selectedProject.title,
        bookOutline: selectedProject.outline || '',
        language: selectedLanguage,
        category: contentCategory,
        researchProfile: researchContext,
        styleProfile: selectedStyle?.styleAnalysis,
        storytellingFramework: frameworkContext || selectedProject.storytellingFramework,
      });

      const ideas: GeneratedIdea[] = result.ideas.map((idea, idx) => ({
        id: `idea-${Date.now()}-${idx}`,
        category: result.category,
        title: idea.title,
        description: idea.description,
        selected: false,
      }));

      setGeneratedIdeas(ideas);
      refreshCredits();
      setShowSettings(false);

      toast({
        title: 'Ideas Generated',
        description: `Generated ${ideas.length} content ideas for "${contentCategory}".`,
      });
    } catch (error: any) {
      console.error('Error generating content ideas:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate content ideas. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleIdeaSelection = (ideaId: string) => {
    setGeneratedIdeas(prev =>
      prev.map(idea =>
        idea.id === ideaId ? { ...idea, selected: !idea.selected } : idea
      )
    );
  };

  const handleSaveSelected = async () => {
    if (!user || !selectedProjectId) return;

    const selectedIdeas = generatedIdeas.filter(i => i.selected);
    if (selectedIdeas.length === 0) {
      toast({
        title: 'No Ideas Selected',
        description: 'Please select at least one idea to save.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const contentIdeasRef = doc(firestore, 'users', user.uid, 'projectContentIdeas', selectedProjectId);
      const existingDoc = await getDoc(contentIdeasRef);

      const ideasToSave: ContentIdea[] = selectedIdeas.map(idea => ({
        id: idea.id,
        category: idea.category,
        title: idea.title,
        description: idea.description,
        createdAt: new Date().toISOString(),
      }));

      if (existingDoc.exists()) {
        await setDoc(contentIdeasRef, {
          ideas: arrayUnion(...ideasToSave),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await setDoc(contentIdeasRef, {
          userId: user.uid,
          projectId: selectedProjectId,
          ideas: ideasToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setGeneratedIdeas(prev => prev.filter(i => !i.selected));

      toast({
        title: 'Ideas Saved',
        description: `Saved ${selectedIdeas.length} content ideas to your project.`,
      });
    } catch (error: any) {
      console.error('Error saving content ideas:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save content ideas. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = generatedIdeas.filter(i => i.selected).length;

  return (
    <>
      <FloatingCreditWidget />
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard/co-writer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Co-Writer
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Generate Content Ideas</h1>
          <p className="text-muted-foreground mt-2">
            Create compelling content ideas to promote your book.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Settings</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showSettings && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Book *</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a book project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectsWithOutline.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              {project.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {projectsWithOutline.length === 0 && !isLoading && (
                      <p className="text-xs text-muted-foreground">
                        No projects with blueprints found. Create a blueprint first.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Content Category *</Label>
                    <Select value={contentCategory} onValueChange={setContentCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content category" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentCategories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the type of content you want to create.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Research Profile (Optional)</Label>
                    <Select value={selectedResearchProfileId} onValueChange={setSelectedResearchProfileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select research profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {researchProfiles?.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.topic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Style Profile (Optional)</Label>
                    <Select value={selectedStyleProfileId} onValueChange={setSelectedStyleProfileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {styleProfiles?.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Storytelling Framework (Optional)</Label>
                    <Select value={selectedStorytellingFramework} onValueChange={setSelectedStorytellingFramework}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select storytelling framework" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {storytellingFrameworks.map(fw => (
                          <SelectItem key={fw.value} value={fw.value}>
                            {fw.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Narrative structure for your content.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Content Framework (Optional)</Label>
                    <Select value={selectedContentFramework} onValueChange={setSelectedContentFramework}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content framework" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {contentFrameworks.map(fw => (
                          <SelectItem key={fw.value} value={fw.value}>
                            {fw.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Marketing/persuasion structure for your content.
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedProjectId || !contentCategory.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Ideas
                      </>
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Generated Ideas</CardTitle>
                    <CardDescription>
                      {generatedIdeas.length > 0
                        ? `${selectedCount} of ${generatedIdeas.length} ideas selected`
                        : 'Configure settings and generate content ideas'}
                    </CardDescription>
                  </div>
                  {generatedIdeas.length > 0 && (
                    <Button
                      onClick={handleSaveSelected}
                      disabled={isSaving || selectedCount === 0}
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Selected ({selectedCount})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Generating content ideas...</p>
                  </div>
                ) : generatedIdeas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-2">No ideas generated yet</p>
                    <p className="text-sm text-muted-foreground">
                      Select a book, enter a content category, and click Generate to create ideas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {generatedIdeas.map(idea => (
                      <div
                        key={idea.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          idea.selected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleIdeaSelection(idea.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={idea.selected}
                            onCheckedChange={() => toggleIdeaSelection(idea.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                {idea.category}
                              </span>
                              {idea.selected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <h4 className="font-medium">{idea.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {idea.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default function GenerateContentIdeasPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <GenerateContentIdeasContent />
    </Suspense>
  );
}
