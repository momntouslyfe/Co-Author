'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  Sparkles,
  Copy,
  Check,
  Gift,
  Target,
  Info,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuthUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Project, ResearchProfile, StyleProfile, AuthorProfile, OfferDraft } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { getIdToken } from '@/lib/client-auth';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

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

export default function LandingPageCopyPage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useAuthUser();
  const firestore = useFirestore();
  const { refreshCredits } = useCreditSummary();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [targetWordCount, setTargetWordCount] = useState<number>(2000);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [storytellingFramework, setStorytellingFramework] = useState<string>('');
  const [selectedResearchProfileId, setSelectedResearchProfileId] = useState<string>('');
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState<string>('');
  const [selectedAuthorProfileId, setSelectedAuthorProfileId] = useState<string>('');

  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [currentWordCount, setCurrentWordCount] = useState<number>(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const offerDraftsQuery = useMemoFirebase(() => {
    if (!user || !selectedProjectId) return null;
    return collection(firestore, 'users', user.uid, 'projects', selectedProjectId, 'offerDrafts');
  }, [user, firestore, selectedProjectId]);

  const { data: projects, isLoading: projectsLoading } = useCollection<Project>(projectsQuery);
  const { data: researchProfiles } = useCollection<ResearchProfile>(researchProfilesQuery);
  const { data: styleProfiles } = useCollection<StyleProfile>(styleProfilesQuery);
  const { data: authorProfiles } = useCollection<AuthorProfile>(authorProfilesQuery);
  const { data: offerDrafts, isLoading: offersLoading } = useCollection<OfferDraft>(offerDraftsQuery);

  const projectsWithOutline = useMemo(() => projects?.filter(p => p.outline && p.title) || [], [projects]);
  const selectedProject = useMemo(
    () => projectsWithOutline.find(p => p.id === selectedProjectId),
    [projectsWithOutline, selectedProjectId]
  );

  const completedOffers = useMemo(() => 
    offerDrafts?.filter(o => o.masterBlueprint && o.title) || [], 
    [offerDrafts]
  );

  const selectedOffers = useMemo(() => 
    completedOffers.filter(o => selectedOfferIds.includes(o.id)),
    [completedOffers, selectedOfferIds]
  );

  const isLoading = isUserLoading || projectsLoading;

  useEffect(() => {
    if (generatedContent) {
      const words = generatedContent.trim().split(/\s+/).filter(w => w.length > 0);
      setCurrentWordCount(words.length);
    } else {
      setCurrentWordCount(0);
    }
  }, [generatedContent]);

  useEffect(() => {
    setSelectedOfferIds([]);
  }, [selectedProjectId]);

  const handleOfferToggle = (offerId: string) => {
    setSelectedOfferIds(prev => {
      if (prev.includes(offerId)) {
        return prev.filter(id => id !== offerId);
      }
      if (prev.length >= 3) {
        toast({
          title: 'Maximum Offers Reached',
          description: 'You can select up to 3 offers as bonuses.',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, offerId];
    });
  };

  const handleGenerate = async () => {
    if (!user || !selectedProject) {
      toast({
        title: 'Missing Information',
        description: 'Please select a book project.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const idToken = await getIdToken(user);

      const selectedResearch = researchProfiles?.find(r => r.id === selectedResearchProfileId);
      const selectedStyle = styleProfiles?.find(s => s.id === selectedStyleProfileId);
      const selectedAuthor = authorProfiles?.find(a => a.id === selectedAuthorProfileId);

      const researchContext = selectedResearch
        ? `Topic: ${selectedResearch.topic}\nAudience: ${selectedResearch.targetAudienceSuggestion}\nPain Points: ${selectedResearch.painPointAnalysis}`
        : undefined;

      const authorContext = selectedAuthor
        ? `Author: ${selectedAuthor.penName || selectedAuthor.fullName}\nBio: ${selectedAuthor.bio}\nCredentials: ${selectedAuthor.credentials || ''}`
        : undefined;

      const offersPayload = selectedOffers.length > 0
        ? selectedOffers.map(offer => ({
            title: offer.title,
            subtitle: offer.subtitle,
            description: offer.description,
            category: offer.category,
            blueprint: offer.masterBlueprint,
          }))
        : undefined;

      const response = await fetch('/api/co-writer/generate-landing-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bookTitle: selectedProject.title,
          bookOutline: selectedProject.outline,
          bookDescription: selectedProject.description,
          language: selectedLanguage,
          targetWordCount: targetWordCount,
          offers: offersPayload,
          customInstructions: customInstructions || undefined,
          researchProfile: researchContext,
          styleProfile: selectedStyle?.styleAnalysis,
          authorProfile: authorContext,
          storytellingFramework: storytellingFramework || selectedProject.storytellingFramework,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate landing page copy');
      }

      const result = await response.json();

      if (!result || !result.content) {
        throw new Error('Failed to generate landing page copy. Please try again.');
      }

      setGeneratedContent(result.content);
      refreshCredits();

      toast({
        title: 'Landing Page Copy Generated',
        description: `Generated ${result.wordCount} words of high-converting copy.`,
      });
    } catch (error: any) {
      console.error('Error generating landing page copy:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate landing page copy. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedContent) return;
    try {
      const htmlContent = generatedContent
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^\* (.+)$/gm, '<li>$1</li>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const plainBlob = new Blob([generatedContent], { type: 'text/plain' });

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': plainBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(generatedContent);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Landing page copy copied to clipboard.',
      });
    } catch (error) {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Content copied as plain text.',
      });
    }
  };

  const renderContent = (content: string) => {
    const paragraphs = content.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();

      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={index} className="text-2xl font-bold mt-8 mb-4 text-foreground">
            {trimmed.slice(3)}
          </h2>
        );
      }

      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={index} className="text-xl font-semibold mt-6 mb-3 text-foreground">
            {trimmed.slice(4)}
          </h3>
        );
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listItems = trimmed.split('\n').filter(line => line.trim());
        return (
          <ul key={index} className="list-disc list-inside space-y-2 my-4 text-muted-foreground">
            {listItems.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item.replace(/^[-*]\s*/, '')}
              </li>
            ))}
          </ul>
        );
      }

      if (/^\d+\.\s/.test(trimmed)) {
        const listItems = trimmed.split('\n').filter(line => line.trim());
        return (
          <ol key={index} className="list-decimal list-inside space-y-2 my-4 text-muted-foreground">
            {listItems.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {item.replace(/^\d+\.\s*/, '')}
              </li>
            ))}
          </ol>
        );
      }

      return (
        <p key={index} className="text-muted-foreground leading-relaxed mb-4">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <>
      <FloatingCreditWidget />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard/co-writer">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Co-Writer
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Landing Page Copy Generator</h1>
          <p className="text-muted-foreground mt-2">
            Create high-converting landing page copy for your book using the Value Equation framework.
          </p>
        </div>

        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-600 dark:text-blue-400">
            <strong>Value Equation Framework:</strong> VALUE = (Dream Outcome x Perceived Likelihood) / (Time Delay x Effort). 
            This AI uses proven conversion strategies to maximize perceived value and minimize friction.
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Book Selection
                </CardTitle>
                <CardDescription>Select the book for your landing page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Book *</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a book project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsWithOutline.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProject && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium">{selectedProject.title}</p>
                    {selectedProject.description && (
                      <p className="text-muted-foreground line-clamp-2">{selectedProject.description}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Word Count: {targetWordCount}</Label>
                  <Slider
                    value={[targetWordCount]}
                    onValueChange={([value]) => setTargetWordCount(value)}
                    min={1000}
                    max={5000}
                    step={100}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: 2000-3000 words for comprehensive landing pages
                  </p>
                </div>
              </CardContent>
            </Card>

            {selectedProjectId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Bonus Offers (Optional)
                  </CardTitle>
                  <CardDescription>
                    Select up to 3 offers to include as bonuses in your landing page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {offersLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : completedOffers.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No completed offers found for this book.</p>
                      <p className="text-xs mt-1">Create offers in the Offer Workspace first.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedOffers.map((offer) => (
                        <div
                          key={offer.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedOfferIds.includes(offer.id)
                              ? 'bg-primary/10 border-primary'
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                          onClick={() => handleOfferToggle(offer.id)}
                        >
                          <Checkbox
                            checked={selectedOfferIds.includes(offer.id)}
                            onCheckedChange={() => handleOfferToggle(offer.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{offer.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {offer.category}
                            </p>
                          </div>
                        </div>
                      ))}
                      {selectedOfferIds.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {selectedOfferIds.length}/3 offers selected
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">AI Context Options</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  >
                    {showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {showAdvancedSettings && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Research Profile</Label>
                    <Select value={selectedResearchProfileId} onValueChange={setSelectedResearchProfileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select research profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {researchProfiles?.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.topic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Style Profile</Label>
                    <Select value={selectedStyleProfileId} onValueChange={setSelectedStyleProfileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {styleProfiles?.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Author Profile</Label>
                    <Select value={selectedAuthorProfileId} onValueChange={setSelectedAuthorProfileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select author profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {authorProfiles?.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.penName || profile.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Storytelling Framework</Label>
                    <Select value={storytellingFramework} onValueChange={setStorytellingFramework}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select framework (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {storytellingFrameworks.map((framework) => (
                          <SelectItem key={framework.value} value={framework.value}>
                            {framework.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Instructions</Label>
                    <Textarea
                      placeholder="Add any specific instructions for the AI..."
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedProjectId}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Landing Page Copy...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Landing Page Copy
                </>
              )}
            </Button>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Landing Page Copy
                    </CardTitle>
                    {currentWordCount > 0 && (
                      <CardDescription>{currentWordCount} words</CardDescription>
                    )}
                  </div>
                  {generatedContent && (
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Generating high-converting copy...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Applying Value Equation and Offer Stack frameworks...
                    </p>
                  </div>
                ) : generatedContent ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {renderContent(generatedContent)}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Target className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Ready to Create Your Landing Page</h3>
                    <p className="text-muted-foreground max-w-md">
                      Select a book project and optionally add bonus offers. The AI will generate 
                      high-converting copy using the Value Equation framework.
                    </p>
                    <div className="mt-6 p-4 bg-muted rounded-lg text-left max-w-md">
                      <h4 className="font-medium text-sm mb-2">Your landing page will include:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>Compelling headline and subheadline</li>
                        <li>Problem/pain point agitation</li>
                        <li>Solution and benefits presentation</li>
                        <li>Book contents preview</li>
                        <li>About the author section</li>
                        <li>Offer stack with bonuses</li>
                        <li>Testimonial placeholders</li>
                        <li>Guarantee and risk reversal</li>
                        <li>Urgency and scarcity elements</li>
                        <li>Strong calls to action</li>
                      </ul>
                    </div>
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
