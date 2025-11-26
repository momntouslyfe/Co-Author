'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Link, Image } from '@react-pdf/renderer';
import { EditorStyles, parseOutlineForTOC } from '@/lib/publish/content-transformer';
import { EditorChapter } from '@/lib/publish/types';
import { AuthorProfile } from '@/lib/definitions';

Font.register({
  family: 'Times New Roman',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@nicholasadamou/canvas-fonts@1.0.0/Times%20New%20Roman.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/@nicholasadamou/canvas-fonts@1.0.0/Times%20New%20Roman%20Bold.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/npm/@nicholasadamou/canvas-fonts@1.0.0/Times%20New%20Roman%20Italic.ttf', fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'Georgia',
  src: 'https://cdn.jsdelivr.net/npm/@nicholasadamou/canvas-fonts@1.0.0/Georgia.ttf',
});

Font.register({
  family: 'Arial',
  src: 'https://cdn.jsdelivr.net/npm/@nicholasadamou/canvas-fonts@1.0.0/Arial.ttf',
});

export type PDFDocumentProps = {
  bookTitle: string;
  chapters: EditorChapter[];
  styles: EditorStyles;
  showTOC: boolean;
  outline?: string;
  selectedChapterIds: string[];
  authorProfile?: AuthorProfile;
  authorBioContent?: string;
  coverImageUrl?: string;
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

type TextSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

type ParsedElement = {
  type: 'heading' | 'paragraph' | 'list-item';
  segments: TextSegment[];
};

function parseInlineFormatting(html: string): TextSegment[] {
  const segments: TextSegment[] = [];
  
  let text = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<br\s*\/?>/gi, ' ');
  
  const strongRegex = /<strong>([\s\S]*?)<\/strong>/gi;
  const emRegex = /<em>([\s\S]*?)<\/em>/gi;
  const bRegex = /<b>([\s\S]*?)<\/b>/gi;
  const iRegex = /<i>([\s\S]*?)<\/i>/gi;
  
  interface Match {
    index: number;
    length: number;
    text: string;
    bold: boolean;
    italic: boolean;
  }
  
  const matches: Match[] = [];
  
  let match;
  while ((match = strongRegex.exec(text)) !== null) {
    matches.push({ index: match.index, length: match[0].length, text: match[1], bold: true, italic: false });
  }
  while ((match = bRegex.exec(text)) !== null) {
    matches.push({ index: match.index, length: match[0].length, text: match[1], bold: true, italic: false });
  }
  while ((match = emRegex.exec(text)) !== null) {
    matches.push({ index: match.index, length: match[0].length, text: match[1], bold: false, italic: true });
  }
  while ((match = iRegex.exec(text)) !== null) {
    matches.push({ index: match.index, length: match[0].length, text: match[1], bold: false, italic: true });
  }
  
  matches.sort((a, b) => a.index - b.index);
  
  if (matches.length === 0) {
    const plainText = text.replace(/<[^>]+>/g, '').trim();
    if (plainText) {
      segments.push({ text: plainText });
    }
    return segments;
  }
  
  let lastIndex = 0;
  for (const m of matches) {
    if (m.index > lastIndex) {
      const before = text.substring(lastIndex, m.index).replace(/<[^>]+>/g, '').trim();
      if (before) {
        segments.push({ text: before + ' ' });
      }
    }
    
    const innerText = m.text.replace(/<[^>]+>/g, '').trim();
    if (innerText) {
      segments.push({ text: innerText, bold: m.bold, italic: m.italic });
    }
    
    lastIndex = m.index + m.length;
  }
  
  if (lastIndex < text.length) {
    const after = text.substring(lastIndex).replace(/<[^>]+>/g, '').trim();
    if (after) {
      segments.push({ text: ' ' + after });
    }
  }
  
  return segments;
}

function parseHtmlContent(html: string): ParsedElement[] {
  const elements: ParsedElement[] = [];
  
  const cleanHtml = html
    .replace(/\n/g, '')
    .replace(/>\s+</g, '><');
  
  const tagRegex = /<(h[1-6]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  
  while ((match = tagRegex.exec(cleanHtml)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2];
    
    if (!content.trim()) continue;
    
    const segments = parseInlineFormatting(content);
    
    if (segments.length === 0) continue;
    
    if (tag.startsWith('h')) {
      const headingText = segments.map(s => s.text).join('').trim();
      if (!isExcludedHeading(headingText)) {
        elements.push({ type: 'heading', segments });
      }
    } else if (tag === 'li') {
      elements.push({ type: 'list-item', segments });
    } else {
      elements.push({ type: 'paragraph', segments });
    }
  }
  
  if (elements.length === 0) {
    const plainText = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    if (plainText) {
      const paragraphs = plainText.split(/\n\n+/);
      paragraphs.forEach(p => {
        const trimmed = p.trim();
        if (trimmed) {
          elements.push({ type: 'paragraph', segments: [{ text: trimmed }] });
        }
      });
    }
  }
  
  return elements;
}

export function PDFDocument({
  bookTitle,
  chapters,
  styles,
  showTOC,
  outline,
  selectedChapterIds,
  authorProfile,
  authorBioContent,
  coverImageUrl,
}: PDFDocumentProps) {
  const getFontFamily = (fontName: string) => {
    if (['Times New Roman', 'Georgia', 'Arial'].includes(fontName)) {
      return fontName;
    }
    return 'Helvetica';
  };

  const pdfStyles = StyleSheet.create({
    page: {
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      paddingTop: 72,
      paddingBottom: 72,
      paddingLeft: 72,
      paddingRight: 72,
    },
    coverPage: {
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      padding: 0,
    },
    coverImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    header: {
      position: 'absolute',
      top: 36,
      left: 72,
      right: 72,
      textAlign: 'center',
      fontFamily: getFontFamily(styles.headerFont),
      fontSize: styles.headerSize,
      color: styles.headerColor,
    },
    footer: {
      position: 'absolute',
      bottom: 36,
      left: 72,
      right: 72,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontFamily: getFontFamily(styles.footerFont),
      fontSize: styles.footerSize,
      color: styles.footerColor,
    },
    chapterTitle: {
      fontFamily: getFontFamily(styles.chapterTitleFont),
      fontSize: styles.chapterTitleSize,
      color: styles.chapterTitleColor,
      textAlign: 'center',
      marginBottom: 30,
      fontWeight: 'bold',
    },
    subtopic: {
      fontFamily: getFontFamily(styles.subtopicFont),
      fontSize: styles.subtopicSize,
      color: styles.subtopicColor,
      marginTop: 20,
      marginBottom: 10,
      fontWeight: 'bold',
    },
    bodyText: {
      fontFamily: getFontFamily(styles.bodyFont),
      fontSize: styles.bodySize,
      color: styles.bodyColor,
      lineHeight: 1.6,
      textAlign: 'justify',
      marginBottom: 10,
    },
    listItem: {
      fontFamily: getFontFamily(styles.bodyFont),
      fontSize: styles.bodySize,
      color: styles.bodyColor,
      lineHeight: 1.6,
      marginBottom: 6,
      marginLeft: 20,
    },
    tocTitle: {
      fontFamily: getFontFamily(styles.chapterTitleFont),
      fontSize: 24,
      textAlign: 'center',
      marginBottom: 30,
      fontWeight: 'bold',
    },
    tocChapter: {
      fontFamily: getFontFamily(styles.bodyFont),
      fontSize: 14,
      marginTop: 12,
      marginBottom: 4,
      fontWeight: 'bold',
    },
    tocSubtopic: {
      fontFamily: getFontFamily(styles.bodyFont),
      fontSize: 12,
      marginLeft: 20,
      marginBottom: 3,
      color: '#444444',
    },
    titlePage: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookTitleText: {
      fontFamily: getFontFamily(styles.chapterTitleFont),
      fontSize: 36,
      textAlign: 'center',
      fontWeight: 'bold',
      color: styles.chapterTitleColor,
    },
    authorPage: {
      flex: 1,
      padding: 20,
    },
    authorTitle: {
      fontFamily: getFontFamily(styles.chapterTitleFont),
      fontSize: 24,
      textAlign: 'center',
      marginBottom: 30,
      fontWeight: 'bold',
    },
    authorName: {
      fontFamily: getFontFamily(styles.chapterTitleFont),
      fontSize: 20,
      textAlign: 'center',
      marginBottom: 10,
      fontWeight: 'bold',
    },
    authorFullName: {
      fontFamily: getFontFamily(styles.bodyFont),
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 20,
      fontStyle: 'italic',
      color: '#666666',
    },
    authorBio: {
      fontFamily: getFontFamily(styles.bodyFont),
      fontSize: styles.bodySize,
      color: styles.bodyColor,
      lineHeight: 1.6,
      textAlign: 'justify',
      marginBottom: 20,
    },
    authorCredentials: {
      fontFamily: getFontFamily(styles.bodyFont),
      fontSize: styles.bodySize - 1,
      color: '#555555',
      marginBottom: 15,
    },
    authorContact: {
      fontFamily: getFontFamily(styles.bodyFont),
      fontSize: styles.bodySize - 1,
      color: '#555555',
      marginBottom: 5,
    },
    authorPhoto: {
      width: 150,
      height: 150,
      borderRadius: 75,
      marginBottom: 20,
      alignSelf: 'center',
    },
  });

  const renderSegments = (segments: TextSegment[], baseStyle: any, key?: string | number) => {
    return (
      <Text key={key} style={baseStyle}>
        {segments.map((segment, idx) => {
          const segmentStyle: any = {};
          if (segment.bold) segmentStyle.fontWeight = 'bold';
          if (segment.italic) segmentStyle.fontStyle = 'italic';
          
          return (
            <Text key={idx} style={segmentStyle}>
              {segment.text}
            </Text>
          );
        })}
      </Text>
    );
  };

  const tocData = outline ? parseOutlineForTOC(outline) : [];
  const filteredTocData = tocData.map(part => ({
    ...part,
    chapters: part.chapters.filter(ch => selectedChapterIds.includes(ch.id)),
  })).filter(part => part.chapters.length > 0);

  return (
    <Document>
      {coverImageUrl ? (
        <Page size="A4" style={pdfStyles.coverPage}>
          <Image src={coverImageUrl} style={pdfStyles.coverImage} />
        </Page>
      ) : (
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.titlePage}>
            <Text style={pdfStyles.bookTitleText}>{bookTitle}</Text>
          </View>
        </Page>
      )}

      {showTOC && filteredTocData.length > 0 && (
        <Page size="A4" style={pdfStyles.page}>
          <Text style={pdfStyles.tocTitle}>Table of Contents</Text>
          {filteredTocData.map((part, partIndex) => (
            <View key={partIndex}>
              {part.chapters.map((chapter) => (
                <View key={chapter.id}>
                  <Link src={`#${chapter.id}`}>
                    <Text style={pdfStyles.tocChapter}>{chapter.title}</Text>
                  </Link>
                  {chapter.subtopics.map((subtopic, subIndex) => (
                    <Text key={subIndex} style={pdfStyles.tocSubtopic}>
                      {subtopic}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </Page>
      )}

      {chapters.map((chapter) => {
        const elements = parseHtmlContent(chapter.content);
        
        return (
          <Page key={chapter.id} size="A4" style={pdfStyles.page} id={chapter.id}>
            <Text style={pdfStyles.header} fixed>{chapter.title}</Text>
            
            <Text style={pdfStyles.chapterTitle}>{chapter.title}</Text>
            
            {elements.map((element, index) => {
              if (element.type === 'heading') {
                return renderSegments(element.segments, pdfStyles.subtopic, `heading-${index}`);
              }
              if (element.type === 'list-item') {
                return (
                  <Text key={`list-${index}`} style={pdfStyles.listItem}>
                    {'\u2022'}{' '}
                    {element.segments.map((segment, idx) => {
                      const segmentStyle: any = {};
                      if (segment.bold) segmentStyle.fontWeight = 'bold';
                      if (segment.italic) segmentStyle.fontStyle = 'italic';
                      return (
                        <Text key={idx} style={segmentStyle}>
                          {segment.text}
                        </Text>
                      );
                    })}
                  </Text>
                );
              }
              return renderSegments(element.segments, pdfStyles.bodyText, `body-${index}`);
            })}
            
            <View style={pdfStyles.footer} fixed>
              <Text>{bookTitle}</Text>
              <Text render={({ pageNumber }) => `${pageNumber}`} />
            </View>
          </Page>
        );
      })}

      {authorProfile && (
        <Page size="A4" style={pdfStyles.page}>
          <View style={pdfStyles.authorPage}>
            <Text style={pdfStyles.authorTitle}>About the Author</Text>
            
            {authorProfile.photoUrl && (
              <Image src={authorProfile.photoUrl} style={pdfStyles.authorPhoto} />
            )}
            
            <Text style={pdfStyles.authorName}>{authorProfile.penName}</Text>
            
            {authorProfile.fullName && (
              <Text style={pdfStyles.authorFullName}>{authorProfile.fullName}</Text>
            )}
            
            <Text style={pdfStyles.authorBio}>{authorProfile.bio}</Text>
            
            {authorProfile.credentials && (
              <Text style={pdfStyles.authorCredentials}>
                <Text style={{ fontWeight: 'bold' }}>Credentials: </Text>
                {authorProfile.credentials}
              </Text>
            )}
            
            {authorProfile.website && (
              <Text style={pdfStyles.authorContact}>
                <Text style={{ fontWeight: 'bold' }}>Website: </Text>
                {authorProfile.website}
              </Text>
            )}
            
            {authorProfile.email && (
              <Text style={pdfStyles.authorContact}>
                <Text style={{ fontWeight: 'bold' }}>Contact: </Text>
                {authorProfile.email}
              </Text>
            )}
          </View>
          
          <View style={pdfStyles.footer} fixed>
            <Text>{bookTitle}</Text>
            <Text render={({ pageNumber }) => `${pageNumber}`} />
          </View>
        </Page>
      )}
    </Document>
  );
}
