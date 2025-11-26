import { Chapter, Project } from '@/lib/definitions';

export type TransformedSection = {
  type: 'chapter-title' | 'subtopic' | 'content';
  text: string;
  chapterId: string;
  chapterTitle: string;
  partTitle: string;
};

export type TransformedChapter = {
  id: string;
  title: string;
  partTitle: string;
  sections: TransformedSection[];
};

export type ParsedPart = {
  title: string;
  chapters: { id: string; title: string; subtopics: string[] }[];
};

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

export function parseOutlineForTOC(outline: string): ParsedPart[] {
  if (!outline) return [];

  const lines = outline.split('\n');
  const parts: ParsedPart[] = [];
  let currentPart: ParsedPart | null = null;
  let currentChapter: { id: string; title: string; subtopics: string[] } | null = null;
  let chapterCounter = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('## ')) {
      if (currentChapter && currentPart) {
        currentPart.chapters.push(currentChapter);
      }
      if (currentPart) {
        parts.push(currentPart);
      }
      currentPart = { title: trimmedLine.substring(3), chapters: [] };
      currentChapter = null;
    } else if (trimmedLine.startsWith('### ') && currentPart) {
      if (currentChapter) {
        currentPart.chapters.push(currentChapter);
      }
      chapterCounter++;
      currentChapter = {
        id: `chapter-${chapterCounter}`,
        title: trimmedLine.substring(4),
        subtopics: [],
      };
    } else if (trimmedLine.startsWith('#### ') && currentChapter) {
      const subtopic = trimmedLine.substring(5);
      if (!isExcludedHeading(subtopic)) {
        currentChapter.subtopics.push(subtopic);
      }
    }
  }

  if (currentChapter && currentPart) {
    currentPart.chapters.push(currentChapter);
  }
  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}

export function transformChapterContent(
  chapter: Chapter,
  partTitle: string
): TransformedChapter {
  const sections: TransformedSection[] = [];
  const content = chapter.content || '';
  const lines = content.split('\n');
  
  let currentSection: TransformedSection | null = null;
  let contentBuffer: string[] = [];
  let skipContent = false;

  const flushContent = () => {
    if (contentBuffer.length > 0 && currentSection && !skipContent) {
      sections.push({
        ...currentSection,
        text: contentBuffer.join('\n').trim(),
      });
    }
    contentBuffer = [];
    skipContent = false;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('## ')) {
      flushContent();
      currentSection = {
        type: 'subtopic',
        text: '',
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        partTitle,
      };
      const heading = trimmedLine.substring(3);
      skipContent = isExcludedHeading(heading);
      if (!skipContent) {
        sections.push({
          type: 'subtopic',
          text: heading,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          partTitle,
        });
      }
    } else if (trimmedLine.startsWith('# ')) {
      flushContent();
      const heading = trimmedLine.substring(2);
      skipContent = isExcludedHeading(heading);
      if (!skipContent) {
        sections.push({
          type: 'subtopic',
          text: heading,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          partTitle,
        });
      }
      currentSection = {
        type: 'content',
        text: '',
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        partTitle,
      };
    } else if (trimmedLine) {
      if (!currentSection) {
        currentSection = {
          type: 'content',
          text: '',
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          partTitle,
        };
      }
      if (!skipContent) {
        contentBuffer.push(line);
      }
    }
  }
  
  flushContent();

  return {
    id: chapter.id,
    title: chapter.title,
    partTitle,
    sections,
  };
}

export function getSelectedChaptersData(
  project: Project,
  selectedChapterIds: string[]
): TransformedChapter[] {
  if (!project.chapters || !project.outline) return [];

  const lines = project.outline.split('\n');
  const chapterParts: Map<string, string> = new Map();
  let currentPartTitle = '';
  let chapterCounter = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('## ')) {
      currentPartTitle = trimmedLine.substring(3);
    } else if (trimmedLine.startsWith('### ')) {
      chapterCounter++;
      chapterParts.set(`chapter-${chapterCounter}`, currentPartTitle);
    }
  }

  const transformedChapters: TransformedChapter[] = [];

  for (const chapterId of selectedChapterIds) {
    const chapter = project.chapters.find(c => c.id === chapterId);
    if (chapter) {
      const partTitle = chapterParts.get(chapterId) || chapter.part || '';
      transformedChapters.push(transformChapterContent(chapter, partTitle));
    }
  }

  return transformedChapters;
}

export type EditorStyles = {
  chapterTitleFont: string;
  chapterTitleSize: number;
  chapterTitleColor: string;
  subtopicFont: string;
  subtopicSize: number;
  subtopicColor: string;
  bodyFont: string;
  bodySize: number;
  bodyColor: string;
  headerFont: string;
  headerSize: number;
  headerColor: string;
  footerFont: string;
  footerSize: number;
  footerColor: string;
};

export const defaultStyles: EditorStyles = {
  chapterTitleFont: 'Playfair Display',
  chapterTitleSize: 28,
  chapterTitleColor: '#1a1a1a',
  subtopicFont: 'Merriweather',
  subtopicSize: 18,
  subtopicColor: '#333333',
  bodyFont: 'Roboto',
  bodySize: 12,
  bodyColor: '#000000',
  headerFont: 'Roboto',
  headerSize: 10,
  headerColor: '#666666',
  footerFont: 'Roboto',
  footerSize: 10,
  footerColor: '#666666',
};

export const fontOptions = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Merriweather',
  'Playfair Display',
  'Source Sans Pro',
  'Noto Sans',
  'Noto Serif',
  'PT Sans',
  'PT Serif',
  'Raleway',
  'Ubuntu',
  'Oswald',
  'Poppins',
  'Nunito',
  'Work Sans',
  'Libre Baskerville',
  'Crimson Text',
  'EB Garamond',
];
