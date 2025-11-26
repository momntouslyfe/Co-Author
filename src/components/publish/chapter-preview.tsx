'use client';

import { TemplateStyles } from '@/lib/publish/templates';

interface Section {
  title: string;
  content: string;
}

interface ChapterPreviewProps {
  chapterNumber: number;
  chapterTitle: string;
  sections: Section[];
  styles: TemplateStyles;
  showPageNumbers?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

function parseMarkdownContent(content: string): string[] {
  if (!content) return [];
  
  const lines = content.split('\n');
  const result: string[] = [];
  let currentParagraph: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      result.push(text);
      currentParagraph = [];
    }
  };
  
  const flushList = () => {
    if (listItems.length > 0) {
      const listHtml = '<ul>' + listItems.map(item => `<li>${item}</li>`).join('') + '</ul>';
      result.push(listHtml);
      listItems = [];
      inList = false;
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
      inList = true;
      continue;
    }
    
    if (inList && trimmed === '') {
      flushList();
      continue;
    }
    
    if (inList && trimmed && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
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
  
  return result.filter(p => p.trim().length > 0);
}

export function ChapterPreview({
  chapterNumber,
  chapterTitle,
  sections,
  styles,
  showPageNumbers = false,
  isSelected = false,
  onClick,
}: ChapterPreviewProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white shadow-lg rounded-lg overflow-hidden transition-all cursor-pointer
        ${isSelected ? 'ring-2 ring-primary shadow-xl' : 'hover:shadow-xl'}
      `}
      style={{
        backgroundColor: styles.pageBackground,
        aspectRatio: '8.5/11',
        maxHeight: '700px',
      }}
    >
      <div 
        className="h-full overflow-auto"
        style={{
          padding: `${styles.marginTop * 0.5}px ${styles.marginRight * 0.5}px ${styles.marginBottom * 0.5}px ${styles.marginLeft * 0.5}px`,
        }}
      >
        {showPageNumbers && (
          <div 
            className="text-right mb-4"
            style={{
              fontFamily: styles.headerFont,
              fontSize: `${styles.headerSize * 0.9}px`,
              color: styles.headerColor,
            }}
          >
            {chapterTitle}
          </div>
        )}

        <div 
          className="mb-6 pb-4 border-b"
          style={{
            fontFamily: styles.chapterTitleFont,
            fontSize: `${styles.chapterTitleSize * 0.7}px`,
            color: styles.chapterTitleColor,
            textAlign: styles.chapterTitleAlign,
            borderColor: styles.accentColor + '40',
          }}
        >
          <div className="text-sm opacity-60 mb-1" style={{ fontFamily: styles.bodyFont }}>
            Chapter {chapterNumber}
          </div>
          <div className="font-bold">{chapterTitle}</div>
        </div>

        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} style={{ marginBottom: `${styles.sectionSpacing * 0.5}px` }}>
              <h3
                className="font-semibold mb-2 pb-1"
                style={{
                  fontFamily: styles.sectionTitleFont,
                  fontSize: `${styles.sectionTitleSize * 0.7}px`,
                  color: styles.sectionTitleColor,
                  borderBottom: `1px solid ${styles.accentColor}30`,
                }}
              >
                {section.title}
              </h3>

              <div className="space-y-2">
                {parseMarkdownContent(section.content).map((paragraph, pIndex) => {
                  const isListHtml = paragraph.startsWith('<ul>');
                  
                  if (isListHtml) {
                    return (
                      <div
                        key={pIndex}
                        className="pl-4"
                        style={{
                          fontFamily: styles.bodyFont,
                          fontSize: `${styles.bodySize * 0.75}px`,
                          color: styles.bodyColor,
                          lineHeight: styles.bodyLineHeight,
                        }}
                        dangerouslySetInnerHTML={{ __html: paragraph }}
                      />
                    );
                  }
                  
                  return (
                    <p
                      key={pIndex}
                      className="text-justify"
                      style={{
                        fontFamily: styles.bodyFont,
                        fontSize: `${styles.bodySize * 0.75}px`,
                        color: styles.bodyColor,
                        lineHeight: styles.bodyLineHeight,
                        marginBottom: `${styles.paragraphSpacing * 0.5}px`,
                      }}
                      dangerouslySetInnerHTML={{ __html: paragraph }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {showPageNumbers && (
          <div 
            className="text-center mt-6 pt-2"
            style={{
              fontFamily: styles.footerFont,
              fontSize: `${styles.footerSize * 0.9}px`,
              color: styles.footerColor,
            }}
          >
            1
          </div>
        )}
      </div>
    </div>
  );
}

interface FullBookPreviewProps {
  bookTitle: string;
  chapters: {
    id: string;
    title: string;
    sections: Section[];
  }[];
  styles: TemplateStyles;
  authorProfile?: {
    penName: string;
    fullName?: string;
    bio: string;
    credentials?: string;
    photoUrl?: string;
    website?: string;
    email?: string;
  } | null;
  coverImageUrl?: string;
}

export function FullBookPreview({
  bookTitle,
  chapters,
  styles,
  authorProfile,
  coverImageUrl,
}: FullBookPreviewProps) {
  return (
    <div className="space-y-4">
      {coverImageUrl && (
        <div
          className="bg-white shadow-lg rounded-lg overflow-hidden"
          style={{
            aspectRatio: '8.5/11',
            maxHeight: '700px',
          }}
        >
          <img 
            src={coverImageUrl} 
            alt="Book Cover" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div
        className="bg-white shadow-lg rounded-lg overflow-hidden flex items-center justify-center"
        style={{
          backgroundColor: styles.pageBackground,
          aspectRatio: '8.5/11',
          maxHeight: '700px',
        }}
      >
        <div className="text-center p-8">
          <h1
            style={{
              fontFamily: styles.bookTitleFont,
              fontSize: `${styles.bookTitleSize * 0.8}px`,
              color: styles.bookTitleColor,
            }}
          >
            {bookTitle}
          </h1>
          {authorProfile && (
            <p
              className="mt-4"
              style={{
                fontFamily: styles.bodyFont,
                fontSize: `${styles.bodySize * 0.9}px`,
                color: styles.bodyColor,
              }}
            >
              by {authorProfile.penName}
            </p>
          )}
        </div>
      </div>

      <div
        className="bg-white shadow-lg rounded-lg overflow-hidden"
        style={{
          backgroundColor: styles.pageBackground,
          aspectRatio: '8.5/11',
          maxHeight: '700px',
        }}
      >
        <div 
          className="h-full overflow-auto"
          style={{
            padding: `${styles.marginTop * 0.5}px ${styles.marginRight * 0.5}px`,
          }}
        >
          <h2
            className="mb-6 pb-2 border-b"
            style={{
              fontFamily: styles.chapterTitleFont,
              fontSize: `${styles.chapterTitleSize * 0.6}px`,
              color: styles.chapterTitleColor,
              borderColor: styles.accentColor + '40',
            }}
          >
            Table of Contents
          </h2>
          <div className="space-y-2">
            {chapters.map((chapter, index) => (
              <div 
                key={chapter.id}
                className="flex justify-between items-baseline"
                style={{
                  fontFamily: styles.bodyFont,
                  fontSize: `${styles.bodySize * 0.75}px`,
                  color: styles.bodyColor,
                }}
              >
                <span>Chapter {index + 1}: {chapter.title}</span>
                <span className="flex-grow border-b border-dotted mx-2" style={{ borderColor: styles.bodyColor + '40' }}></span>
                <span>{index + 3}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {chapters.map((chapter, chapterIndex) => (
        <ChapterPreview
          key={chapter.id}
          chapterNumber={chapterIndex + 1}
          chapterTitle={chapter.title}
          sections={chapter.sections}
          styles={styles}
          showPageNumbers
        />
      ))}

      {authorProfile && (
        <div
          className="bg-white shadow-lg rounded-lg overflow-hidden"
          style={{
            backgroundColor: styles.pageBackground,
            aspectRatio: '8.5/11',
            maxHeight: '700px',
          }}
        >
          <div 
            className="h-full overflow-auto"
            style={{
              padding: `${styles.marginTop * 0.5}px ${styles.marginRight * 0.5}px`,
            }}
          >
            <h2
              className="mb-6 pb-2 border-b"
              style={{
                fontFamily: styles.chapterTitleFont,
                fontSize: `${styles.chapterTitleSize * 0.6}px`,
                color: styles.chapterTitleColor,
                textAlign: 'center',
                borderColor: styles.accentColor + '40',
              }}
            >
              About the Author
            </h2>
            
            {authorProfile.photoUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={authorProfile.photoUrl}
                  alt={authorProfile.penName}
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>
            )}
            
            <h3
              className="text-center mb-2"
              style={{
                fontFamily: styles.sectionTitleFont,
                fontSize: `${styles.sectionTitleSize * 0.7}px`,
                color: styles.sectionTitleColor,
              }}
            >
              {authorProfile.penName}
            </h3>
            
            {authorProfile.fullName && (
              <p
                className="text-center mb-3 italic"
                style={{
                  fontFamily: styles.bodyFont,
                  fontSize: `${styles.bodySize * 0.7}px`,
                  color: styles.bodyColor,
                }}
              >
                {authorProfile.fullName}
              </p>
            )}
            
            <p
              className="text-justify mb-4"
              style={{
                fontFamily: styles.bodyFont,
                fontSize: `${styles.bodySize * 0.7}px`,
                color: styles.bodyColor,
                lineHeight: styles.bodyLineHeight,
              }}
            >
              {authorProfile.bio}
            </p>
            
            {authorProfile.credentials && (
              <p
                className="mb-2"
                style={{
                  fontFamily: styles.bodyFont,
                  fontSize: `${styles.bodySize * 0.65}px`,
                  color: styles.bodyColor,
                }}
              >
                <strong>Credentials:</strong> {authorProfile.credentials}
              </p>
            )}
            
            {authorProfile.website && (
              <p
                className="mb-1"
                style={{
                  fontFamily: styles.bodyFont,
                  fontSize: `${styles.bodySize * 0.65}px`,
                  color: styles.accentColor,
                }}
              >
                {authorProfile.website}
              </p>
            )}
            
            {authorProfile.email && (
              <p
                style={{
                  fontFamily: styles.bodyFont,
                  fontSize: `${styles.bodySize * 0.65}px`,
                  color: styles.bodyColor,
                }}
              >
                {authorProfile.email}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
