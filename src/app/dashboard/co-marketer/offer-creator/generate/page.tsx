'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import type { Project, ResearchProfile, StyleProfile, AuthorProfile, OfferCategory, OfferIdea, ProjectOffers } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS, OFFER_CATEGORY_DESCRIPTIONS } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { generateOfferIdeas } from '@/ai/flows/generate-offer-ideas';
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

export default function GenerateOffersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectIdParam = searchParams.get('projectId');
  const { toast } = useToast();
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || '');
  const [selectedCategory, setSelectedCategory] = useState<OfferCategory>('workbook');
  const [selectedResearchProfileId, setSelectedResearchProfileId] = useState<string>('');
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<string>('');
  const [selectedAuthorProfileId, setSelectedAuthorProfileId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

  const authorProfilesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'authorProfiles');
  }, [user, firestore]);

  const selectedProjectDocRef = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', selectedProjectId);
  }, [user, firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);
  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);
  const { data: authorProfiles } = useCollection<AuthorProfile>(authorProfilesQuery);
  const { data: selectedProject } = useDoc<Project>(selectedProjectDocRef);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline) || [], [projects]);

  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.researchProfileId) {
        setSelectedResearchProfileId(selectedProject.researchProfileId);
      }
      if (selectedProject.styleProfileId) {
        setSelectedStyleProfileId(selectedProject.styleProfileId);
      }
      if (selectedProject.authorProfileId) {
        setSelectedAuthorProfileId(selectedProject.authorProfileId);
      }
    }
  }, [selectedProject]);

  const isLoading = isUserLoading || projectsLoading;

  const handleGenerate = async () => {
    if (!user || !selectedProject || !selectedProject.outline) {
      toast({
        title: 'Missing Information',
        description: 'Please select a project with a blueprint.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const idToken = await getIdToken(user);

      const researchProfile = researchProfiles?.find(r => r.id === selectedResearchProfileId);
      const styleProfile = styleProfiles?.find(s => s.id === selectedStyleProfileId);
      const authorProfile = authorProfiles?.find(a => a.id === selectedAuthorProfileId);

      const researchContent = researchProfile
        ? `Topic: ${researchProfile.topic}\nResearch: ${researchProfile.deepTopicResearch}\nPain Points: ${researchProfile.painPointAnalysis}\nTarget Audience: ${researchProfile.targetAudienceSuggestion}`
        : undefined;

      const styleContent = styleProfile?.styleAnalysis;
      const authorContent = authorProfile
        ? `Author: ${authorProfile.penName}\nBio: ${authorProfile.bio}\nCredentials: ${authorProfile.credentials || 'N/A'}`
        : undefined;

      const apiResult = await generateOfferIdeas({
        userId: user.uid,
        idToken,
        bookTitle: selectedProject.title,
        bookOutline: selectedProject.outline,
        language: selectedProject.language || 'English',
        category: selectedCategory,
        researchProfile: researchContent,
        styleProfile: styleContent,
        storytellingFramework: selectedProject.storytellingFramework,
        authorProfile: authorContent,
      });

      if (!apiResult.success) {
        toast({
          title: 'Generation Failed',
          description: apiResult.error,
          variant: 'destructive',
        });
        return;
      }

      const newIdeas: GeneratedIdea[] = [];
      for (const result of apiResult.data) {
        for (const idea of result.ideas) {
          newIdeas.push({
            id: `${result.category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: result.category,
            title: idea.title,
            description: idea.description,
            selected: false,
          });
        }
        setExpandedCategories(prev => new Set([...prev, result.category]));
      }

      setGeneratedIdeas(prev => [...prev, ...newIdeas]);
      refreshCredits();

      toast({
        title: 'Ideas Generated',
        description: `Generated ${newIdeas.length} new offer ideas.`,
      });
    } catch (error: any) {
      console.error('Error generating ideas:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate offer ideas. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!user || !selectedProjectId) return;

    const selectedIdeas = generatedIdeas.filter(idea => idea.selected);
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
      const offersDocRef = doc(firestore, 'users', user.uid, 'projectOffers', selectedProjectId);
      const offersDoc = await getDoc(offersDocRef);

      const newOffers: OfferIdea[] = selectedIdeas.map(idea => ({
        id: idea.id,
        category: idea.category as Exclude<OfferCategory, 'all'>,
        title: idea.title,
        description: idea.description,
        createdAt: new Date().toISOString(),
      }));

      if (offersDoc.exists()) {
        await updateDoc(offersDocRef, {
          offers: arrayUnion(...newOffers),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(offersDocRef, {
          userId: user.uid,
          projectId: selectedProjectId,
          offers: newOffers,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setGeneratedIdeas(prev => prev.filter(idea => !idea.selected));

      toast({
        title: 'Ideas Saved',
        description: `Saved ${selectedIdeas.length} offer ideas to your project.`,
      });
    } catch (error: any) {
      console.error('Error saving ideas:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save offer ideas. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleIdeaSelection = (id: string) => {
    setGeneratedIdeas(prev =>
      prev.map(idea =>
        idea.id === id ? { ...idea, selected: !idea.selected } : idea
      )
    );
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const groupedIdeas = useMemo(() => {
    const groups: Record<string, GeneratedIdea[]> = {};
    for (const idea of generatedIdeas) {
      if (!groups[idea.category]) {
        groups[idea.category] = [];
      }
      groups[idea.category].push(idea);
    }
    return groups;
  }, [generatedIdeas]);

  const selectedCount = generatedIdeas.filter(i => i.selected).length;

  const categoryOptions = Object.entries(OFFER_CATEGORY_LABELS).filter(([key]) => key !== 'all') as [Exclude<OfferCategory, 'all'>, string][];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <FloatingCreditWidget />
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard/co-marketer/offer-creator">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Offer Creator
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Generate Offer Ideas</h1>
          <p className="text-muted-foreground mt-2">
            Configure your settings and generate bonus material ideas for your book.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
                <CardDescription>Select your book and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Book Project</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a book project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsWithOutline.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProject && (
                  <>
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                      <p><strong>Language:</strong> {selectedProject.language || 'English'}</p>
                      <p><strong>Framework:</strong> {selectedProject.storytellingFramework || 'Standard'}</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Offer Category</Label>
                      <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as OfferCategory)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories (3 ideas each)</SelectItem>
                          {categoryOptions.map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCategory !== 'all' && OFFER_CATEGORY_DESCRIPTIONS[selectedCategory as Exclude<OfferCategory, 'all'>] && (
                        <p className="text-xs text-muted-foreground">
                          {OFFER_CATEGORY_DESCRIPTIONS[selectedCategory as Exclude<OfferCategory, 'all'>]}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Research Profile (Optional)</Label>
                      <Select value={selectedResearchProfileId || '__none__'} onValueChange={(v) => setSelectedResearchProfileId(v === '__none__' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select research profile" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
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
                      <Select value={selectedStyleProfileId || '__none__'} onValueChange={(v) => setSelectedStyleProfileId(v === '__none__' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select style profile" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {styleProfiles?.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Author Profile (Optional)</Label>
                      <Select value={selectedAuthorProfileId || '__none__'} onValueChange={(v) => setSelectedAuthorProfileId(v === '__none__' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select author profile" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {authorProfiles?.map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.penName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={!selectedProjectId || isGenerating}
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
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Generated Ideas</CardTitle>
                  <CardDescription>
                    {generatedIdeas.length === 0
                      ? 'Ideas will appear here after generation'
                      : `${generatedIdeas.length} ideas • ${selectedCount} selected`}
                  </CardDescription>
                </div>
                {selectedCount > 0 && (
                  <Button onClick={handleSaveSelected} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Selected ({selectedCount})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {generatedIdeas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No ideas generated yet.</p>
                    <p className="text-sm">Select a project and click Generate Ideas to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedIdeas).map(([category, ideas]) => (
                      <div key={category} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                          onClick={() => toggleCategoryExpansion(category)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {OFFER_CATEGORY_LABELS[category as OfferCategory] || category}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({ideas.length} ideas)
                            </span>
                          </div>
                          {expandedCategories.has(category) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {expandedCategories.has(category) && (
                          <div className="p-4 space-y-3">
                            {ideas.map(idea => (
                              <div
                                key={idea.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                  idea.selected
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:border-primary/50'
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
                                    <h4 className="font-medium">{idea.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {idea.description}
                                    </p>
                                  </div>
                                  {idea.selected && (
                                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
