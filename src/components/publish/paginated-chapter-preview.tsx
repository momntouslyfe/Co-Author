'use client';

import { useMemo } from 'react';
import { TemplateStyles } from '@/lib/publish/templates';

interface Section {
  title: string;
  content: string;
}

interface PaginatedChapterPreviewProps {
  chapterNumber: number;
  chapterTitle: string;
  sections: Section[];
  styles: TemplateStyles;
}

const PAGE_HEIGHT = 792;
const PAGE_WIDTH = 612;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 72;
const MARGIN_LEFT = 72;
const MARGIN_RIGHT = 72;
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const SCALE = 0.75;

function estimateTextHeight(text: string, fontSize: number, lineHeight: number, containerWidth: number): number {
  const avgCharWidth = fontSize * 0.5;
  const charsPerLine = Math.floor(containerWidth / avgCharWidth);
  const lines = text.split('\n').reduce((total, paragraph) => {
    if (!paragraph.trim()) return total + 1;
    const paragraphLines = Math.ceil(paragraph.length / charsPerLine);
    return total + Math.max(1, paragraphLines);
  }, 0);
  return lines * fontSize * lineHeight;
}

interface PageContent {
  type: 'chapter-title' | 'section-title' | 'paragraph';
  text: string;
  height: number;
}

function paginateContent(
  chapterTitle: string,
  sections: Section[],
  styles: TemplateStyles
): PageContent[][] {
  const pages: PageContent[][] = [];
  let currentPage: PageContent[] = [];
  let currentHeight = 0;

  const addToPage = (content: PageContent) => {
    if (currentHeight + content.height > CONTENT_HEIGHT && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(content);
    currentHeight += content.height;
  };

  const titleHeight = 60 + styles.sectionSpacing;
  addToPage({
    type: 'chapter-title',
    text: chapterTitle,
    height: titleHeight,
  });

  for (const section of sections) {
    const sectionTitleHeight = 30 + styles.paragraphSpacing;
    addToPage({
      type: 'section-title',
      text: section.title,
      height: sectionTitleHeight,
    });

    const paragraphs = section.content.split('\n\n').filter(p => p.trim());
    for (const para of paragraphs) {
      const paraHeight = estimateTextHeight(
        para,
        styles.bodySize,
        styles.bodyLineHeight,
        CONTENT_WIDTH
      ) + styles.paragraphSpacing;
      
      addToPage({
        type: 'paragraph',
        text: para,
        height: paraHeight,
      });
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function PreviewPage({
  pageNumber,
  totalPages,
  contents,
  styles,
  bookTitle,
}: {
  pageNumber: number;
  totalPages: number;
  contents: PageContent[];
  styles: TemplateStyles;
  bookTitle?: string;
}) {
  return (
    <div
      className="bg-white shadow-lg relative mx-auto mb-4"
      style={{
        width: PAGE_WIDTH * SCALE,
        height: PAGE_HEIGHT * SCALE,
        padding: `${MARGIN_TOP * SCALE}px ${MARGIN_RIGHT * SCALE}px ${MARGIN_BOTTOM * SCALE}px ${MARGIN_LEFT * SCALE}px`,
        backgroundColor: styles.pageBackground,
      }}
    >
      <div 
        className="absolute top-4 left-0 right-0 text-center text-xs"
        style={{ 
          color: styles.accentColor,
          fontSize: 9 * SCALE,
        }}
      >
        {bookTitle}
      </div>

      <div className="overflow-hidden h-full">
        {contents.map((content, idx) => {
          if (content.type === 'chapter-title') {
            return (
              <h1
                key={idx}
                style={{
                  fontFamily: styles.chapterTitleFont,
                  fontSize: styles.chapterTitleSize * SCALE,
                  color: styles.chapterTitleColor,
                  textAlign: styles.chapterTitleAlign as any,
                  marginBottom: styles.sectionSpacing * SCALE,
                  fontWeight: 700,
                }}
              >
                {content.text}
              </h1>
            );
          }
          if (content.type === 'section-title') {
            return (
              <h2
                key={idx}
                style={{
                  fontFamily: styles.sectionTitleFont,
                  fontSize: styles.sectionTitleSize * SCALE,
                  color: styles.sectionTitleColor,
                  marginTop: styles.sectionSpacing * SCALE * 0.5,
                  marginBottom: styles.paragraphSpacing * SCALE,
                  fontWeight: 600,
                  borderLeft: `3px solid ${styles.accentColor}`,
                  paddingLeft: 8 * SCALE,
                }}
              >
                {content.text}
              </h2>
            );
          }
          return (
            <p
              key={idx}
              style={{
                fontFamily: styles.bodyFont,
                fontSize: styles.bodySize * SCALE,
                lineHeight: styles.bodyLineHeight,
                color: styles.bodyColor,
                marginBottom: styles.paragraphSpacing * SCALE,
                textAlign: 'justify',
              }}
            >
              {content.text}
            </p>
          );
        })}
      </div>

      <div 
        className="absolute bottom-4 left-0 right-0 text-center text-xs"
        style={{ 
          color: '#666',
          fontSize: 9 * SCALE,
        }}
      >
        {pageNumber}
      </div>
    </div>
  );
}

export function PaginatedChapterPreview({
  chapterNumber,
  chapterTitle,
  sections,
  styles,
}: PaginatedChapterPreviewProps) {
  const pages = useMemo(
    () => paginateContent(chapterTitle, sections, styles),
    [chapterTitle, sections, styles]
  );

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground mb-2">
        Chapter {chapterNumber} - {pages.length} page{pages.length !== 1 ? 's' : ''}
      </div>
      {pages.map((pageContents, idx) => (
        <PreviewPage
          key={idx}
          pageNumber={idx + 1}
          totalPages={pages.length}
          contents={pageContents}
          styles={styles}
          bookTitle={chapterTitle}
        />
      ))}
    </div>
  );
}

export default PaginatedChapterPreview;
