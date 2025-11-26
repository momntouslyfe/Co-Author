'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useAuthUser } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useCollection } from '@/firebase/firestore/use-collection';
import { doc, collection } from 'firebase/firestore';
import { Project, Chapter, AuthorProfile } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, BookOpen, FileText, ChevronRight, User } from 'lucide-react';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

type GroupedChapters = {
  part: string;
  chapters: Chapter[];
};

function groupChaptersByPart(chapters: Chapter[]): GroupedChapters[] {
  const groups: Map<string, Chapter[]> = new Map();
  
  chapters.forEach(chapter => {
    const part = chapter.part || 'Ungrouped';
    if (!groups.has(part)) {
      groups.set(part, []);
    }
    groups.get(part)!.push(chapter);
  });
  
  return Array.from(groups.entries()).map(([part, chapters]) => ({
    part,
    chapters,
  }));
}

export default function ChapterSelectionPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const { user } = useAuthUser();
  const firestore = useFirestore();
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [selectedAuthorProfileId, setSelectedAuthorProfileId] = useState<string>('');

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const authorProfilesRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'users', user.uid, 'authorProfiles');
  }, [user, firestore]);

  const { data: project, isLoading } = useDoc<Project>(projectDocRef);
  const { data: authorProfiles, isLoading: authorProfilesLoading } = useCollection<AuthorProfile>(authorProfilesRef);

  const groupedChapters = useMemo(() => {
    if (!project?.chapters) return [];
    return groupChaptersByPart(project.chapters);
  }, [project?.chapters]);

  const chaptersWithContent = useMemo(() => {
    if (!project?.chapters) return [];
    return project.chapters.filter(c => c.content && c.content.trim().length > 0);
  }, [project?.chapters]);

  const toggleChapter = (chapterId: string) => {
    setSelectedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedChapters.size === chaptersWithContent.length) {
      setSelectedChapters(new Set());
    } else {
      setSelectedChapters(new Set(chaptersWithContent.map(c => c.id)));
    }
  };

  const handleContinue = () => {
    if (selectedChapters.size === 0) return;
    const chaptersParam = Array.from(selectedChapters).join(',');
    let url = `/dashboard/publish/${projectId}/editor?chapters=${encodeURIComponent(chaptersParam)}`;
    if (selectedAuthorProfileId) {
      url += `&authorProfile=${encodeURIComponent(selectedAuthorProfileId)}`;
    }
    router.push(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!project && !isLoading) {
    return notFound();
  }

  return (
    <>
      <FloatingCreditWidget />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/publish">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-headline text-2xl font-bold">{project?.title}</h1>
            <p className="text-muted-foreground">Select chapters to include in your ebook</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Author Profile (Optional)
            </CardTitle>
            <CardDescription>
              Select an author profile to include an "About the Author" page in your ebook.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="author-profile">Author Profile</Label>
              <Select
                value={selectedAuthorProfileId}
                onValueChange={setSelectedAuthorProfileId}
              >
                <SelectTrigger id="author-profile">
                  <SelectValue placeholder="Select an author profile (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No author profile</SelectItem>
                  {authorProfiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.penName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!authorProfilesLoading && (!authorProfiles || authorProfiles.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  No author profiles found.{' '}
                  <Link href="/dashboard/author-profile" className="text-primary hover:underline">
                    Create one
                  </Link>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Chapters</CardTitle>
                <CardDescription>
                  Choose which chapters to include in your published ebook. Only chapters with content can be selected.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={toggleAll}
                disabled={chaptersWithContent.length === 0}
              >
                {selectedChapters.size === chaptersWithContent.length && chaptersWithContent.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {groupedChapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No chapters found in this project.</p>
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={groupedChapters.map(g => g.part)} className="w-full space-y-2">
                {groupedChapters.map((group) => (
                  <Card key={group.part} className="border">
                    <AccordionItem value={group.part} className="border-0">
                      <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">
                        {group.part}
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0">
                        <div className="space-y-2">
                          {group.chapters.map((chapter) => {
                            const hasContent = chapter.content && chapter.content.trim().length > 0;
                            return (
                              <div
                                key={chapter.id}
                                className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                                  hasContent
                                    ? 'hover:bg-secondary cursor-pointer'
                                    : 'opacity-50 cursor-not-allowed bg-muted/30'
                                } ${selectedChapters.has(chapter.id) ? 'bg-primary/10 border-primary' : ''}`}
                                onClick={() => hasContent && toggleChapter(chapter.id)}
                              >
                                <Checkbox
                                  checked={selectedChapters.has(chapter.id)}
                                  disabled={!hasContent}
                                  onCheckedChange={() => hasContent && toggleChapter(chapter.id)}
                                />
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium flex-1">{chapter.title}</span>
                                {!hasContent && (
                                  <span className="text-xs text-muted-foreground">No content</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Card>
                ))}
              </Accordion>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <p className="text-sm text-muted-foreground">
              {selectedChapters.size} of {chaptersWithContent.length} chapters selected
            </p>
            <Button
              onClick={handleContinue}
              disabled={selectedChapters.size === 0}
              className="gap-2"
            >
              Continue to Editor
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
