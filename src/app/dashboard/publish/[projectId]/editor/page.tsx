'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useAuthUser } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc } from 'firebase/firestore';
import { Project, Chapter, AuthorProfile } from '@/lib/definitions';
import { 
  EditorStyles, 
  defaultStyles,
} from '@/lib/publish/content-transformer';
import { EditorChapter } from '@/lib/publish/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, BookOpen, List, Upload, ImageIcon, User, X } from 'lucide-react';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';
import { StylePanel } from '@/components/publish/style-panel';
import { BookEditor } from '@/components/publish/book-editor';
import { PDFPreview } from '@/components/publish/pdf-preview';
import { useToast } from '@/hooks/use-toast';

const EXCLUDED_HEADINGS = [
  'introduction',
  'action steps',
  'action step',
  'your action step',
  'coming up next',
];

function isExcludedHeading(heading: string): boolean {
  const normalized = heading.toLowerCase().trim();
  return EXCLUDED_HEADINGS.some(excluded => normalized.includes(excluded));
}

function convertMarkdownToHtml(content: string): string {
  if (!content) return '';
  
  const lines = content.split('\n');
  const result: string[] = [];
  let skipSection = false;
  let inList = false;
  let listItems: string[] = [];
  
  const flushList = () => {
    if (listItems.length > 0) {
      result.push('<ul>');
      listItems.forEach(item => {
        result.push(`<li>${item}</li>`);
      });
      result.push('</ul>');
      listItems = [];
      inList = false;
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      const headingText = trimmed.replace(/^#+\s*/, '');
      if (isExcludedHeading(headingText)) {
        skipSection = true;
        continue;
      } else {
        skipSection = false;
        result.push(`<h2>${headingText}</h2>`);
        continue;
      }
    }
    
    if (skipSection) continue;
    
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listContent = trimmed.substring(2);
      let formattedContent = listContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      listItems.push(formattedContent);
      inList = true;
      continue;
    }
    
    if (inList && !trimmed) {
      flushList();
      continue;
    }
    
    if (inList && trimmed && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
      flushList();
    }
    
    if (trimmed) {
      let formattedLine = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      result.push(`<p>${formattedLine}</p>`);
    }
  }
  
  flushList();
  
  return result.join('\n');
}

export default function EditorPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.projectId;
  const chaptersParam = searchParams.get('chapters');
  const authorProfileParam = searchParams.get('authorProfile');
  const { user } = useAuthUser();
  const firestore = useFirestore();
  
  const [styles, setStyles] = useState<EditorStyles>(defaultStyles);
  const [showTOC, setShowTOC] = useState(true);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [chapterContents, setChapterContents] = useState<Map<string, string>>(new Map());
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('chapters');
  const [authorBioContent, setAuthorBioContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedChapterIds = useMemo(() => {
    if (!chaptersParam) return [];
    return chaptersParam.split(',');
  }, [chaptersParam]);

  const projectDocRef = useMemoFirebase(() => {
    if (!user || !projectId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId);
  }, [user, firestore, projectId]);

  const authorProfileDocRef = useMemoFirebase(() => {
    if (!user || !authorProfileParam || authorProfileParam === 'none') return null;
    return doc(firestore, 'users', user.uid, 'authorProfiles', authorProfileParam);
  }, [user, firestore, authorProfileParam]);

  const { data: project, isLoading } = useDoc<Project>(projectDocRef);
  const { data: authorProfile, isLoading: authorProfileLoading } = useDoc<AuthorProfile>(authorProfileDocRef);

  useEffect(() => {
    if (project?.coverImageUrl) {
      setCoverImageUrl(project.coverImageUrl);
    }
  }, [project?.coverImageUrl]);

  useEffect(() => {
    if (authorProfile && !authorBioContent) {
      let bioHtml = `<h2>About the Author</h2>`;
      if (authorProfile.photoUrl) {
        bioHtml += `<p><img src="${authorProfile.photoUrl}" alt="${authorProfile.penName}" style="max-width: 200px; border-radius: 8px;" /></p>`;
      }
      bioHtml += `<h3>${authorProfile.penName}</h3>`;
      if (authorProfile.fullName) {
        bioHtml += `<p><em>${authorProfile.fullName}</em></p>`;
      }
      bioHtml += `<p>${authorProfile.bio}</p>`;
      if (authorProfile.credentials) {
        bioHtml += `<p><strong>Credentials:</strong> ${authorProfile.credentials}</p>`;
      }
      if (authorProfile.website) {
        bioHtml += `<p><strong>Website:</strong> ${authorProfile.website}</p>`;
      }
      if (authorProfile.email) {
        bioHtml += `<p><strong>Contact:</strong> ${authorProfile.email}</p>`;
      }
      setAuthorBioContent(bioHtml);
    }
  }, [authorProfile, authorBioContent]);

  const editorChapters: EditorChapter[] = useMemo(() => {
    if (!project?.chapters) return [];
    
    return selectedChapterIds
      .map(chapterId => {
        const chapter = project.chapters?.find(c => c.id === chapterId);
        if (!chapter) return null;
        
        return {
          id: chapter.id,
          title: chapter.title,
          partTitle: chapter.part || '',
          content: chapter.content || '',
        };
      })
      .filter((c): c is EditorChapter => c !== null);
  }, [project?.chapters, selectedChapterIds]);

  useEffect(() => {
    if (editorChapters.length > 0 && !currentChapterId) {
      setCurrentChapterId(editorChapters[0].id);
    }
  }, [editorChapters, currentChapterId]);

  useEffect(() => {
    if (project?.chapters && selectedChapterIds.length > 0 && !initialized) {
      const initialContents = new Map<string, string>();
      selectedChapterIds.forEach(chapterId => {
        const chapter = project.chapters?.find(c => c.id === chapterId);
        if (chapter && chapter.content) {
          const htmlContent = convertMarkdownToHtml(chapter.content);
          initialContents.set(chapterId, htmlContent);
        }
      });
      setChapterContents(initialContents);
      setInitialized(true);
    }
  }, [project?.chapters, selectedChapterIds, initialized]);

  const currentChapter = useMemo(() => {
    return editorChapters.find(c => c.id === currentChapterId);
  }, [editorChapters, currentChapterId]);

  const handleContentChange = (content: string) => {
    if (currentChapterId) {
      setChapterContents(prev => {
        const newMap = new Map(prev);
        newMap.set(currentChapterId, content);
        return newMap;
      });
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingCover(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setCoverImageUrl(dataUrl);
        
        if (user && projectId) {
          const projectRef = doc(firestore, 'users', user.uid, 'projects', projectId);
          await updateDoc(projectRef, {
            coverImageUrl: dataUrl,
          });
          toast({
            title: "Cover Uploaded",
            description: "Your book cover has been saved.",
          });
        }
        setIsUploadingCover(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast({
        title: "Upload Failed",
        description: "Could not upload the cover image. Please try again.",
        variant: "destructive",
      });
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    setCoverImageUrl('');
    if (user && projectId) {
      try {
        const projectRef = doc(firestore, 'users', user.uid, 'projects', projectId);
        await updateDoc(projectRef, {
          coverImageUrl: null,
        });
        toast({
          title: "Cover Removed",
          description: "Your book cover has been removed.",
        });
      } catch (error) {
        console.error("Error removing cover:", error);
      }
    }
  };

  const chaptersForPDF = useMemo(() => {
    return editorChapters.map(ch => ({
      ...ch,
      content: chapterContents.get(ch.id) || convertMarkdownToHtml(ch.content),
    }));
  }, [editorChapters, chapterContents]);

  if (!chaptersParam || selectedChapterIds.length === 0) {
    router.replace(`/dashboard/publish/${projectId}`);
    return null;
  }

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

  const currentContent = currentChapterId 
    ? (chapterContents.get(currentChapterId) || (currentChapter ? convertMarkdownToHtml(currentChapter.content) : ''))
    : '';

  const hasAuthorProfile = authorProfileParam && authorProfileParam !== 'none' && authorProfile;

  return (
    <>
      <FloatingCreditWidget />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/publish/${projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-headline text-2xl font-bold">{project?.title}</h1>
            <p className="text-muted-foreground">Co-Editor - Edit and publish your ebook</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Book Cover
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {coverImageUrl ? (
                  <div className="relative">
                    <div className="aspect-[3/4] w-full relative rounded-lg overflow-hidden border">
                      <Image
                        src={coverImageUrl}
                        alt="Book cover"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveCover}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="aspect-[3/4] w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingCover ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground text-center">
                          Click to upload<br />book cover
                        </p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverImageUpload(file);
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Chapter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={currentChapterId} onValueChange={setCurrentChapterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {editorChapters.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-toc" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Table of Contents
                  </Label>
                  <Switch
                    id="show-toc"
                    checked={showTOC}
                    onCheckedChange={setShowTOC}
                  />
                </div>
              </CardContent>
            </Card>

            <StylePanel styles={styles} onStyleChange={setStyles} />

            <PDFPreview
              bookTitle={project?.title || 'Untitled Book'}
              chapters={chaptersForPDF}
              styles={styles}
              showTOC={showTOC}
              outline={project?.outline}
              selectedChapterIds={selectedChapterIds}
              authorProfile={hasAuthorProfile ? authorProfile : undefined}
              authorBioContent={authorBioContent}
              coverImageUrl={coverImageUrl}
            />
          </div>

          <div className="lg:col-span-3">
            {hasAuthorProfile ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="chapters">Chapters</TabsTrigger>
                  <TabsTrigger value="author" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    About the Author
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="chapters">
                  {currentChapter ? (
                    <BookEditor
                      content={currentContent}
                      onChange={handleContentChange}
                      styles={styles}
                      chapterTitle={currentChapter.title}
                    />
                  ) : (
                    <Card className="h-[600px] flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <BookOpen className="h-12 w-12 mx-auto mb-4" />
                        <p>Select a chapter to start editing</p>
                      </div>
                    </Card>
                  )}
                </TabsContent>
                <TabsContent value="author">
                  <BookEditor
                    content={authorBioContent}
                    onChange={setAuthorBioContent}
                    styles={styles}
                    chapterTitle="About the Author"
                  />
                </TabsContent>
              </Tabs>
            ) : currentChapter ? (
              <BookEditor
                content={currentContent}
                onChange={handleContentChange}
                styles={styles}
                chapterTitle={currentChapter.title}
              />
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4" />
                  <p>Select a chapter to start editing</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
