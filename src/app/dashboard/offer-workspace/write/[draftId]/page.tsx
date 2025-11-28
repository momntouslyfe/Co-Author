'use client';

import { useState, useMemo, useEffect, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  FileText,
  Check,
  RefreshCw,
  Expand,
  Copy,
  Save,
  ChevronLeft,
  ChevronRight,
  PenLine,
  Target,
} from 'lucide-react';
import { useAuthUser } from '@/firebase';
import { getIdToken } from '@/lib/client-auth';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { OfferDraft, OfferSection, OfferCategory, Project } from '@/lib/definitions';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';

export default function OfferWriteWorkspacePage({ params }: { params: Promise<{ draftId: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');
  const { toast } = useToast();
  const { user } = useAuthUser();
  const firestore = useFirestore();

  const [draft, setDraft] = useState<OfferDraft | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [expandWordCount, setExpandWordCount] = useState(700);
  const [expandFocus, setExpandFocus] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  useEffect(() => {
    async function loadDraft() {
      if (!user || !projectId) return;
      
      try {
        const draftRef = doc(
          firestore,
          'users',
          user.uid,
          'projects',
          projectId,
          'offerDrafts',
          resolvedParams.draftId
        );
        const draftDoc = await getDoc(draftRef);
        
        if (draftDoc.exists()) {
          const data = draftDoc.data() as Omit<OfferDraft, 'id'>;
          setDraft({ id: draftDoc.id, ...data });
          
          if (data.sections.length > 0) {
            setSelectedSectionId(data.sections[0].id);
            setEditorContent(data.sections[0].content || '');
          }
        }

        const projectRef = doc(firestore, 'users', user.uid, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);
        if (projectDoc.exists()) {
          setProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        toast({
          title: 'Error',
          description: 'Failed to load the offer draft.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDraft();
  }, [user, projectId, resolvedParams.draftId, firestore, toast]);

  const selectedSection = useMemo(() => {
    return draft?.sections.find(s => s.id === selectedSectionId);
  }, [draft, selectedSectionId]);

  const currentSectionIndex = useMemo(() => {
    if (!draft || !selectedSectionId) return -1;
    return draft.sections.findIndex(s => s.id === selectedSectionId);
  }, [draft, selectedSectionId]);

  const wordCount = useMemo(() => {
    return editorContent.split(/\s+/).filter(w => w.length > 0).length;
  }, [editorContent]);

  const handleSectionSelect = (sectionId: string) => {
    if (editorContent !== (selectedSection?.content || '')) {
      handleSave();
    }
    setSelectedSectionId(sectionId);
    const section = draft?.sections.find(s => s.id === sectionId);
    setEditorContent(section?.content || '');
  };

  const handleSave = async () => {
    if (!user || !projectId || !draft || !selectedSectionId) return;

    setIsSaving(true);
    try {
      const updatedSections = draft.sections.map(s =>
        s.id === selectedSectionId
          ? { ...s, content: editorContent, wordCount, status: editorContent ? 'completed' as const : 'pending' as const }
          : s
      );

      const allCompleted = updatedSections.every(s => s.status === 'completed');

      const draftRef = doc(
        firestore,
        'users',
        user.uid,
        'projects',
        projectId,
        'offerDrafts',
        draft.id
      );

      await updateDoc(draftRef, {
        sections: updatedSections,
        status: allCompleted ? 'completed' : 'draft',
        updatedAt: serverTimestamp(),
      });

      setDraft({
        ...draft,
        sections: updatedSections,
        status: allCompleted ? 'completed' : 'draft',
      });

      toast({
        title: 'Saved',
        description: 'Your changes have been saved.',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save changes.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWriteSection = async () => {
    if (!user || !draft || !selectedSection) return;

    setIsWriting(true);
    try {
      const idToken = await getIdToken(user);
      
      const allParts = draft.blueprint.parts.map((part, i) =>
        `Part ${i + 1}: ${part.title}\n${part.modules.map((m, j) => `  - Module ${j + 1}: ${m.title}`).join('\n')}`
      ).join('\n\n');

      const previousContent = draft.sections
        .filter(s => {
          if (s.partNumber < selectedSection.partNumber) return true;
          if (s.partNumber === selectedSection.partNumber && s.moduleNumber < selectedSection.moduleNumber) return true;
          return false;
        })
        .map(s => s.content)
        .filter(c => c)
        .slice(-2)
        .join('\n\n---\n\n');

      const response = await fetch('/api/offers/write-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          offerTitle: draft.title,
          offerCategory: draft.category,
          blueprintSummary: draft.blueprint.summary || '',
          partTitle: selectedSection.partTitle,
          moduleTitle: selectedSection.moduleTitle,
          allParts,
          targetWordCount: selectedSection.targetWordCount,
          previousContent: previousContent || undefined,
          bookContext: project ? `Book: ${project.title}\n${project.description || ''}` : undefined,
          language: project?.language || 'English',
          customInstructions: customInstructions || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to write section');
      }

      const data = await response.json();
      setEditorContent(data.sectionContent);

      toast({
        title: 'Section Generated',
        description: 'AI has written content for this section. Review and edit as needed.',
      });
    } catch (error: any) {
      console.error('Write error:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate section content.',
        variant: 'destructive',
      });
    } finally {
      setIsWriting(false);
    }
  };

  const handleRewriteSection = async () => {
    if (!user || !draft || !selectedSection || !editorContent) return;

    setIsRewriting(true);
    try {
      const idToken = await getIdToken(user);

      const response = await fetch('/api/offers/rewrite-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          originalContent: editorContent,
          moduleTitle: selectedSection.moduleTitle,
          language: project?.language || 'English',
          rewriteInstructions: rewriteInstructions || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rewrite section');
      }

      const data = await response.json();
      setEditorContent(data.rewrittenContent);

      toast({
        title: 'Section Rewritten',
        description: 'AI has rewritten the content. Review and edit as needed.',
      });
    } catch (error: any) {
      console.error('Rewrite error:', error);
      toast({
        title: 'Rewrite Failed',
        description: error.message || 'Failed to rewrite section.',
        variant: 'destructive',
      });
    } finally {
      setIsRewriting(false);
      setRewriteInstructions('');
    }
  };

  const handleExpandSection = async () => {
    if (!user || !draft || !selectedSection || !editorContent) return;

    setIsExpanding(true);
    try {
      const idToken = await getIdToken(user);

      const response = await fetch('/api/offers/expand-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          originalContent: editorContent,
          targetWordCount: expandWordCount,
          moduleTitle: selectedSection.moduleTitle,
          language: project?.language || 'English',
          expansionFocus: expandFocus || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to expand section');
      }

      const data = await response.json();
      setEditorContent(data.expandedContent);

      toast({
        title: 'Section Expanded',
        description: 'AI has expanded the content. Review and edit as needed.',
      });
    } catch (error: any) {
      console.error('Expand error:', error);
      toast({
        title: 'Expansion Failed',
        description: error.message || 'Failed to expand section.',
        variant: 'destructive',
      });
    } finally {
      setIsExpanding(false);
      setExpandFocus('');
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(editorContent);
    toast({
      title: 'Copied',
      description: 'Content copied to clipboard.',
    });
  };

  const navigateSection = (direction: 'prev' | 'next') => {
    if (!draft) return;
    const newIndex = direction === 'prev' ? currentSectionIndex - 1 : currentSectionIndex + 1;
    if (newIndex >= 0 && newIndex < draft.sections.length) {
      handleSectionSelect(draft.sections[newIndex].id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Draft Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The offer draft you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button asChild>
              <Link href="/dashboard/offer-workspace">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workspace
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = draft.sections.filter(s => s.status === 'completed').length;
  const totalCount = draft.sections.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/offer-workspace?projectId=${projectId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold truncate max-w-[300px]">{draft.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {OFFER_CATEGORY_LABELS[draft.category as OfferCategory] || draft.category}
                </Badge>
                <span>{completedCount}/{totalCount} sections</span>
                <span>({progressPercent}%)</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyContent} disabled={!editorContent}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r bg-muted/30 flex flex-col">
          <div className="p-3 border-b">
            <h2 className="font-medium text-sm">Sections</h2>
          </div>
          <ScrollArea className="flex-1">
            <Accordion type="multiple" className="px-2 py-2">
              {draft.blueprint.parts.map((part, partIndex) => (
                <AccordionItem key={partIndex} value={`part-${partIndex}`} className="border-none">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    Part {partIndex + 1}: {part.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 pl-2">
                      {part.modules.map((module, moduleIndex) => {
                        const section = draft.sections.find(
                          s => s.partNumber === partIndex + 1 && s.moduleNumber === moduleIndex + 1
                        );
                        const isSelected = section?.id === selectedSectionId;
                        const isCompleted = section?.status === 'completed';

                        return (
                          <button
                            key={moduleIndex}
                            onClick={() => section && handleSectionSelect(section.id)}
                            className={`w-full text-left text-xs p-2 rounded flex items-center gap-2 transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-3 w-3 shrink-0" />
                            ) : (
                              <PenLine className="h-3 w-3 shrink-0 opacity-50" />
                            )}
                            <span className="truncate">{module.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedSection && (
            <>
              <div className="p-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Part {selectedSection.partNumber}: {selectedSection.partTitle}
                    </div>
                    <h3 className="font-medium">{selectedSection.moduleTitle}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedSection.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateSection('prev')}
                      disabled={currentSectionIndex <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentSectionIndex + 1} / {draft.sections.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateSection('next')}
                      disabled={currentSectionIndex >= draft.sections.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Target:</span>
                    <span>{selectedSection.targetWordCount} words</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Current:</span>
                    <span className={wordCount >= selectedSection.targetWordCount ? 'text-green-600' : ''}>
                      {wordCount} words
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    onClick={handleWriteSection}
                    disabled={isWriting || isRewriting || isExpanding}
                    size="sm"
                  >
                    {isWriting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {editorContent ? 'Regenerate' : 'Write with AI'}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!editorContent || isWriting || isRewriting || isExpanding}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rewrite
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Rewrite Section</DialogTitle>
                        <DialogDescription>
                          Optionally provide instructions for how the content should be rewritten.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="rewrite-instructions">Rewrite Instructions (optional)</Label>
                        <Textarea
                          id="rewrite-instructions"
                          value={rewriteInstructions}
                          onChange={(e) => setRewriteInstructions(e.target.value)}
                          placeholder="e.g., Make it more conversational, add more examples, simplify the language..."
                          className="mt-2"
                          rows={3}
                        />
                      </div>
                      <DialogFooter>
                        <Button onClick={handleRewriteSection} disabled={isRewriting}>
                          {isRewriting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Rewrite
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!editorContent || isWriting || isRewriting || isExpanding}
                      >
                        <Expand className="mr-2 h-4 w-4" />
                        Expand
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Expand Section</DialogTitle>
                        <DialogDescription>
                          Add more content to reach your target word count.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div>
                          <Label htmlFor="expand-target">Target Word Count</Label>
                          <Input
                            id="expand-target"
                            type="number"
                            value={expandWordCount}
                            onChange={(e) => setExpandWordCount(parseInt(e.target.value) || 700)}
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Current: {wordCount} words
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="expand-focus">Expansion Focus (optional)</Label>
                          <Textarea
                            id="expand-focus"
                            value={expandFocus}
                            onChange={(e) => setExpandFocus(e.target.value)}
                            placeholder="e.g., Add more practical examples, expand on the benefits, include case studies..."
                            className="mt-2"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleExpandSection} disabled={isExpanding}>
                          {isExpanding ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Expand className="mr-2 h-4 w-4" />
                          )}
                          Expand
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="mt-3">
                  <Label htmlFor="custom-instructions" className="text-xs">Custom Instructions (optional)</Label>
                  <Input
                    id="custom-instructions"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Add specific instructions for AI generation..."
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 p-4 overflow-hidden">
                <Textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  placeholder="Start writing or use AI to generate content..."
                  className="h-full resize-none font-serif text-base leading-relaxed"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
