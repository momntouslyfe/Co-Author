export type EditorChapter = {
  id: string;
  title: string;
  partTitle: string;
  content: string;
};

export type TOCItem = {
  type: 'chapter' | 'subtopic';
  title: string;
  chapterId: string;
  pageNumber?: number;
};

export type PageSettings = {
  pageSize: 'A4' | 'Letter';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export type PublishState = {
  projectId: string;
  bookTitle: string;
  selectedChapterIds: string[];
  chapters: EditorChapter[];
  styles: import('./content-transformer').EditorStyles;
  pageSettings: PageSettings;
  showTOC: boolean;
};

export const defaultPageSettings: PageSettings = {
  pageSize: 'A4',
  margins: {
    top: 72,
    right: 72,
    bottom: 72,
    left: 72,
  },
};
