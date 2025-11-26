'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useAuthUser } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc } from 'firebase/firestore';
import { Project, AuthorProfile } from '@/lib/definitions';
import { TEMPLATES, getTemplate, BookTemplate, TemplateStyles } from '@/lib/publish/templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, ArrowLeft, Download, Upload, ImageIcon, X, ChevronLeft, ChevronRight, BookOpen, ChevronDown, Settings } from 'lucide-react';
import { AVAILABLE_FONTS } from '@/lib/publish/fonts';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';
import { TemplateSelector } from '@/components/publish/template-selector';
import { ChapterPreview, FullBookPreview } from '@/components/publish/chapter-preview';
import { PaginatedChapterPreview } from '@/components/publish/paginated-chapter-preview';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

const LazyPDFExport = dynamic(
  () => import('@/components/publish/lazy-pdf-export'),
  { ssr: false }
);

interface Section {
  title: string;
  content: string;
}

interface ParsedChapter {
  id: string;
  title: string;
  partTitle: string;
  sections: Section[];
}

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

function parseChapterContent(rawContent: string): Section[] {
  if (!rawContent) return [];
  
  const sections: Section[] = [];
  const lines = rawContent.split('\n');
  
  let currentTitle = 'Introduction';
  let contentBuffer: string[] = [];
  let skipCurrentHeading = false;
  
  const flushSection = () => {
    const content = contentBuffer.join('\n').trim();
    if (content) {
      sections.push({ 
        title: currentTitle, 
        content: content 
      });
    }
    contentBuffer = [];
  };
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushSection();
      
      const heading = trimmed.startsWith('## ') 
        ? trimmed.substring(3) 
        : trimmed.substring(2);
      
      if (isExcludedHeading(heading)) {
        skipCurrentHeading = true;
      } else {
        currentTitle = heading;
        skipCurrentHeading = false;
      }
    } else if (!skipCurrentHeading) {
      contentBuffer.push(line);
    }
  }
  
  flushSection();
  
  if (sections.length === 0 && rawContent.trim()) {
    sections.push({ 
      title: 'Content', 
      content: rawContent.trim() 
    });
  }
  
  return sections;
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

export default function VisualEditorPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.projectId;
  const chaptersParam = searchParams.get('chapters');
  const authorProfileParam = searchParams.get('authorProfile');
  const { user } = useAuthUser();
  const firestore = useFirestore();
  
  const [selectedTemplate, setSelectedTemplate] = useState<BookTemplate>(TEMPLATES[0]);
  const [showTOC, setShowTOC] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [customStyles, setCustomStyles] = useState({
    chapterTitleFont: '',
    chapterTitleSize: 0,
    chapterTitleColor: '',
    sectionTitleFont: '',
    sectionTitleSize: 0,
    sectionTitleColor: '',
    bodyFont: '',
    bodySize: 0,
    bodyColor: '',
    headerFont: '',
    headerSize: 0,
    headerColor: '',
    footerFont: '',
    footerSize: 0,
    footerColor: '',
  });
  
  useEffect(() => {
    setCustomStyles({
      chapterTitleFont: selectedTemplate.styles.chapterTitleFont,
      chapterTitleSize: selectedTemplate.styles.chapterTitleSize,
      chapterTitleColor: selectedTemplate.styles.chapterTitleColor,
      sectionTitleFont: selectedTemplate.styles.sectionTitleFont,
      sectionTitleSize: selectedTemplate.styles.sectionTitleSize,
      sectionTitleColor: selectedTemplate.styles.sectionTitleColor,
      bodyFont: selectedTemplate.styles.bodyFont,
      bodySize: selectedTemplate.styles.bodySize,
      bodyColor: selectedTemplate.styles.bodyColor,
      headerFont: selectedTemplate.styles.headerFont,
      headerSize: selectedTemplate.styles.headerSize,
      headerColor: selectedTemplate.styles.headerColor,
      footerFont: selectedTemplate.styles.footerFont,
      footerSize: selectedTemplate.styles.footerSize,
      footerColor: selectedTemplate.styles.footerColor,
    });
  }, [selectedTemplate]);
  
  const updateCustomStyle = (key: keyof typeof customStyles, value: string | number) => {
    setCustomStyles(prev => ({ ...prev, [key]: value }));
  };
  
  const mergedTemplateStyles: TemplateStyles = useMemo(() => ({
    ...selectedTemplate.styles,
    chapterTitleFont: customStyles.chapterTitleFont || selectedTemplate.styles.chapterTitleFont,
    chapterTitleSize: customStyles.chapterTitleSize || selectedTemplate.styles.chapterTitleSize,
    chapterTitleColor: customStyles.chapterTitleColor || selectedTemplate.styles.chapterTitleColor,
    sectionTitleFont: customStyles.sectionTitleFont || selectedTemplate.styles.sectionTitleFont,
    sectionTitleSize: customStyles.sectionTitleSize || selectedTemplate.styles.sectionTitleSize,
    sectionTitleColor: customStyles.sectionTitleColor || selectedTemplate.styles.sectionTitleColor,
    bodyFont: customStyles.bodyFont || selectedTemplate.styles.bodyFont,
    bodySize: customStyles.bodySize || selectedTemplate.styles.bodySize,
    bodyColor: customStyles.bodyColor || selectedTemplate.styles.bodyColor,
    headerFont: customStyles.headerFont || selectedTemplate.styles.headerFont,
    headerSize: customStyles.headerSize || selectedTemplate.styles.headerSize,
    headerColor: customStyles.headerColor || selectedTemplate.styles.headerColor,
    footerFont: customStyles.footerFont || selectedTemplate.styles.footerFont,
    footerSize: customStyles.footerSize || selectedTemplate.styles.footerSize,
    footerColor: customStyles.footerColor || selectedTemplate.styles.footerColor,
  }), [selectedTemplate.styles, customStyles]);

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
  const { data: authorProfile } = useDoc<AuthorProfile>(authorProfileDocRef);

  useEffect(() => {
    if (project?.coverImageUrl) {
      setCoverImageUrl(project.coverImageUrl);
    }
  }, [project?.coverImageUrl]);

  const parsedChapters: ParsedChapter[] = useMemo(() => {
    if (!project?.chapters) return [];
    
    return selectedChapterIds
      .map(chapterId => {
        const chapter = project.chapters?.find(c => c.id === chapterId);
        if (!chapter) return null;
        
        return {
          id: chapter.id,
          title: chapter.title,
          partTitle: chapter.part || '',
          sections: parseChapterContent(chapter.content || ''),
        };
      })
      .filter((c): c is ParsedChapter => c !== null);
  }, [project?.chapters, selectedChapterIds]);

  const currentChapter = parsedChapters[currentChapterIndex];

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < parsedChapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  const MAX_COVER_SIZE = 2 * 1024 * 1024; // 2MB

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectDocRef) return;

    if (file.size > MAX_COVER_SIZE) {
      toast({ 
        title: 'File too large', 
        description: 'Book cover must be less than 2MB. Please choose a smaller image.', 
        variant: 'destructive' 
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploadingCover(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        setCoverImageUrl(dataUrl);
        await updateDoc(projectDocRef, { coverImageUrl: dataUrl });
        toast({ title: 'Cover uploaded', description: 'Your book cover has been saved.' });
        setIsUploadingCover(false);
      };
      reader.onerror = () => {
        toast({ title: 'Upload failed', description: 'Could not read the cover image.', variant: 'destructive' });
        setIsUploadingCover(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast({ title: 'Upload failed', description: 'Could not upload the cover image.', variant: 'destructive' });
      setIsUploadingCover(false);
    }
  };

  const removeCover = async () => {
    if (!projectDocRef) return;
    setCoverImageUrl('');
    await updateDoc(projectDocRef, { coverImageUrl: '' });
    toast({ title: 'Cover removed', description: 'Book cover has been removed.' });
  };

  const editorChapters = useMemo(() => {
    return parsedChapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      partTitle: ch.partTitle,
      content: ch.sections.map(s => {
        const sectionHtml = convertSectionToHtml(s.content);
        return `<h3 class="section-title">${s.title}</h3>\n${sectionHtml}`;
      }).join('\n'),
    }));
  }, [parsedChapters]);

  function convertSectionToHtml(content: string): string {
    if (!content) return '';
    
    const lines = content.split('\n');
    const result: string[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        result.push(`<p>${text}</p>`);
        currentParagraph = [];
      }
    };
    
    const flushList = () => {
      if (listItems.length > 0) {
        result.push('<ul>');
        listItems.forEach(item => {
          result.push(`<li>${item}</li>`);
        });
        result.push('</ul>');
        listItems = [];
      }
    };
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushParagraph();
        const itemContent = trimmed.substring(2)
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
        listItems.push(itemContent);
        continue;
      }
      
      if (listItems.length > 0 && trimmed === '') {
        flushList();
        continue;
      }
      
      if (listItems.length > 0 && trimmed && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
        flushList();
      }
      
      if (trimmed === '') {
        flushParagraph();
        continue;
      }
      
      currentParagraph.push(trimmed);
    }
    
    flushParagraph();
    flushList();
    
    return result.join('\n');
  }

  const editorStyles = useMemo(() => ({
    chapterTitleFont: mergedTemplateStyles.chapterTitleFont,
    chapterTitleSize: mergedTemplateStyles.chapterTitleSize,
    chapterTitleColor: mergedTemplateStyles.chapterTitleColor,
    subtopicFont: mergedTemplateStyles.sectionTitleFont,
    subtopicSize: mergedTemplateStyles.sectionTitleSize,
    subtopicColor: mergedTemplateStyles.sectionTitleColor,
    bodyFont: mergedTemplateStyles.bodyFont,
    bodySize: mergedTemplateStyles.bodySize,
    bodyColor: mergedTemplateStyles.bodyColor,
    headerFont: mergedTemplateStyles.headerFont,
    headerSize: mergedTemplateStyles.headerSize,
    headerColor: mergedTemplateStyles.headerColor,
    footerFont: mergedTemplateStyles.footerFont,
    footerSize: mergedTemplateStyles.footerSize,
    footerColor: mergedTemplateStyles.footerColor,
  }), [mergedTemplateStyles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Project not found</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/publish">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <FloatingCreditWidget />
      
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/publish/${projectId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{project.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {parsedChapters.length} chapter{parsedChapters.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'single' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('single')}
                >
                  Single
                </Button>
                <Button
                  variant={viewMode === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('all')}
                >
                  Full Book
                </Button>
              </div>
              
              <LazyPDFExport
                bookTitle={project.title}
                chapters={editorChapters}
                styles={editorStyles}
                showTOC={showTOC}
                authorProfile={authorProfile || undefined}
                coverImageUrl={coverImageUrl}
                templateStyles={mergedTemplateStyles}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <div className="sticky top-24 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <TemplateSelector
                    selectedTemplateId={selectedTemplate.id}
                    onSelect={setSelectedTemplate}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Book Cover</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {coverImageUrl ? (
                    <div className="relative">
                      <img 
                        src={coverImageUrl} 
                        alt="Book Cover" 
                        className="w-full aspect-[8.5/11] object-cover rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={removeCover}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[8.5/11] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      disabled={isUploadingCover}
                    >
                      {isUploadingCover ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-sm">Upload Cover</span>
                        </>
                      )}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-toc" className="text-sm">Table of Contents</Label>
                    <Switch
                      id="show-toc"
                      checked={showTOC}
                      onCheckedChange={setShowTOC}
                    />
                  </div>
                  
                  {authorProfile && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>Author: {authorProfile.penName}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Typography
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary">
                      Chapter Title
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Font</Label>
                        <Select value={customStyles.chapterTitleFont} onValueChange={(v) => updateCustomStyle('chapterTitleFont', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FONTS.map(font => (
                              <SelectItem key={font.name} value={font.name} className="text-xs">
                                {font.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input 
                            type="number" 
                            value={customStyles.chapterTitleSize} 
                            onChange={(e) => updateCustomStyle('chapterTitleSize', parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Color</Label>
                          <Input 
                            type="color" 
                            value={customStyles.chapterTitleColor} 
                            onChange={(e) => updateCustomStyle('chapterTitleColor', e.target.value)}
                            className="h-8 p-1"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary">
                      Sub-Topics
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Font</Label>
                        <Select value={customStyles.sectionTitleFont} onValueChange={(v) => updateCustomStyle('sectionTitleFont', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FONTS.map(font => (
                              <SelectItem key={font.name} value={font.name} className="text-xs">
                                {font.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input 
                            type="number" 
                            value={customStyles.sectionTitleSize} 
                            onChange={(e) => updateCustomStyle('sectionTitleSize', parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Color</Label>
                          <Input 
                            type="color" 
                            value={customStyles.sectionTitleColor} 
                            onChange={(e) => updateCustomStyle('sectionTitleColor', e.target.value)}
                            className="h-8 p-1"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary">
                      Body Text
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Font</Label>
                        <Select value={customStyles.bodyFont} onValueChange={(v) => updateCustomStyle('bodyFont', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FONTS.map(font => (
                              <SelectItem key={font.name} value={font.name} className="text-xs">
                                {font.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input 
                            type="number" 
                            value={customStyles.bodySize} 
                            onChange={(e) => updateCustomStyle('bodySize', parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Color</Label>
                          <Input 
                            type="color" 
                            value={customStyles.bodyColor} 
                            onChange={(e) => updateCustomStyle('bodyColor', e.target.value)}
                            className="h-8 p-1"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary">
                      Page Header
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Font</Label>
                        <Select value={customStyles.headerFont} onValueChange={(v) => updateCustomStyle('headerFont', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FONTS.map(font => (
                              <SelectItem key={font.name} value={font.name} className="text-xs">
                                {font.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input 
                            type="number" 
                            value={customStyles.headerSize} 
                            onChange={(e) => updateCustomStyle('headerSize', parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Color</Label>
                          <Input 
                            type="color" 
                            value={customStyles.headerColor} 
                            onChange={(e) => updateCustomStyle('headerColor', e.target.value)}
                            className="h-8 p-1"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary">
                      Page Footer
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Font</Label>
                        <Select value={customStyles.footerFont} onValueChange={(v) => updateCustomStyle('footerFont', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AVAILABLE_FONTS.map(font => (
                              <SelectItem key={font.name} value={font.name} className="text-xs">
                                {font.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input 
                            type="number" 
                            value={customStyles.footerSize} 
                            onChange={(e) => updateCustomStyle('footerSize', parseInt(e.target.value) || 0)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Color</Label>
                          <Input 
                            type="color" 
                            value={customStyles.footerColor} 
                            onChange={(e) => updateCustomStyle('footerColor', e.target.value)}
                            className="h-8 p-1"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              {viewMode === 'single' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Chapters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {parsedChapters.map((chapter, index) => (
                          <button
                            key={chapter.id}
                            onClick={() => setCurrentChapterIndex(index)}
                            className={`
                              w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                              ${currentChapterIndex === index 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                              }
                            `}
                          >
                            <span className="font-medium">Ch. {index + 1}:</span> {chapter.title}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="col-span-9">
            {viewMode === 'single' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevChapter}
                    disabled={currentChapterIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Chapter {currentChapterIndex + 1} of {parsedChapters.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextChapter}
                    disabled={currentChapterIndex === parsedChapters.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {currentChapter && (
                  <div className="flex justify-center">
                    <div className="w-full max-w-2xl">
                      <PaginatedChapterPreview
                        chapterNumber={currentChapterIndex + 1}
                        chapterTitle={currentChapter.title}
                        sections={currentChapter.sections}
                        styles={mergedTemplateStyles}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="w-full max-w-2xl mx-auto space-y-8 pb-8">
                    {coverImageUrl && (
                      <div
                        className="bg-white shadow-lg mx-auto"
                        style={{
                          width: 612 * 0.75,
                          height: 792 * 0.75,
                        }}
                      >
                        <img 
                          src={coverImageUrl} 
                          alt="Book Cover" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    {parsedChapters.map((chapter, index) => (
                      <div key={chapter.id}>
                        <div className="text-center text-sm text-muted-foreground mb-2 font-medium">
                          Chapter {index + 1}: {chapter.title}
                        </div>
                        <PaginatedChapterPreview
                          chapterNumber={index + 1}
                          chapterTitle={chapter.title}
                          sections={chapter.sections}
                          styles={mergedTemplateStyles}
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
