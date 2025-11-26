export interface BookTemplate {
  id: string;
  name: string;
  description: string;
  styles: TemplateStyles;
}

export interface TemplateStyles {
  pageBackground: string;
  bookTitleFont: string;
  bookTitleSize: number;
  bookTitleColor: string;
  chapterTitleFont: string;
  chapterTitleSize: number;
  chapterTitleColor: string;
  chapterTitleAlign: 'left' | 'center' | 'right';
  sectionTitleFont: string;
  sectionTitleSize: number;
  sectionTitleColor: string;
  bodyFont: string;
  bodySize: number;
  bodyColor: string;
  bodyLineHeight: number;
  accentColor: string;
  headerFont: string;
  headerSize: number;
  headerColor: string;
  footerFont: string;
  footerSize: number;
  footerColor: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  paragraphSpacing: number;
  sectionSpacing: number;
}

export const TEMPLATES: BookTemplate[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, contemporary design with sans-serif fonts and generous spacing',
    styles: {
      pageBackground: '#ffffff',
      bookTitleFont: 'Poppins',
      bookTitleSize: 36,
      bookTitleColor: '#1a1a1a',
      chapterTitleFont: 'Poppins',
      chapterTitleSize: 28,
      chapterTitleColor: '#1a1a1a',
      chapterTitleAlign: 'left',
      sectionTitleFont: 'Poppins',
      sectionTitleSize: 18,
      sectionTitleColor: '#333333',
      bodyFont: 'Open Sans',
      bodySize: 11,
      bodyColor: '#2d2d2d',
      bodyLineHeight: 1.7,
      accentColor: '#3b82f6',
      headerFont: 'Open Sans',
      headerSize: 9,
      headerColor: '#666666',
      footerFont: 'Open Sans',
      footerSize: 9,
      footerColor: '#666666',
      marginTop: 50,
      marginBottom: 50,
      marginLeft: 60,
      marginRight: 60,
      paragraphSpacing: 12,
      sectionSpacing: 28,
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional book design with serif fonts, ideal for non-fiction',
    styles: {
      pageBackground: '#fffef8',
      bookTitleFont: 'Playfair Display',
      bookTitleSize: 32,
      bookTitleColor: '#1a1a1a',
      chapterTitleFont: 'Playfair Display',
      chapterTitleSize: 26,
      chapterTitleColor: '#1a1a1a',
      chapterTitleAlign: 'center',
      sectionTitleFont: 'Merriweather',
      sectionTitleSize: 16,
      sectionTitleColor: '#333333',
      bodyFont: 'Merriweather',
      bodySize: 11,
      bodyColor: '#1a1a1a',
      bodyLineHeight: 1.8,
      accentColor: '#8b4513',
      headerFont: 'Merriweather',
      headerSize: 9,
      headerColor: '#666666',
      footerFont: 'Merriweather',
      footerSize: 9,
      footerColor: '#666666',
      marginTop: 55,
      marginBottom: 55,
      marginLeft: 65,
      marginRight: 65,
      paragraphSpacing: 14,
      sectionSpacing: 32,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple and elegant with focused typography',
    styles: {
      pageBackground: '#ffffff',
      bookTitleFont: 'Lato',
      bookTitleSize: 30,
      bookTitleColor: '#000000',
      chapterTitleFont: 'Lato',
      chapterTitleSize: 24,
      chapterTitleColor: '#000000',
      chapterTitleAlign: 'left',
      sectionTitleFont: 'Lato',
      sectionTitleSize: 15,
      sectionTitleColor: '#444444',
      bodyFont: 'Noto Sans',
      bodySize: 10,
      bodyColor: '#333333',
      bodyLineHeight: 1.65,
      accentColor: '#666666',
      headerFont: 'Noto Sans',
      headerSize: 8,
      headerColor: '#888888',
      footerFont: 'Noto Sans',
      footerSize: 8,
      footerColor: '#888888',
      marginTop: 45,
      marginBottom: 45,
      marginLeft: 55,
      marginRight: 55,
      paragraphSpacing: 10,
      sectionSpacing: 24,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate and polished, perfect for business books',
    styles: {
      pageBackground: '#ffffff',
      bookTitleFont: 'Roboto',
      bookTitleSize: 34,
      bookTitleColor: '#1e3a5f',
      chapterTitleFont: 'Roboto',
      chapterTitleSize: 26,
      chapterTitleColor: '#1e3a5f',
      chapterTitleAlign: 'left',
      sectionTitleFont: 'Roboto',
      sectionTitleSize: 16,
      sectionTitleColor: '#2d4a6f',
      bodyFont: 'Noto Serif',
      bodySize: 11,
      bodyColor: '#2d2d2d',
      bodyLineHeight: 1.7,
      accentColor: '#1e3a5f',
      headerFont: 'Roboto',
      headerSize: 9,
      headerColor: '#555555',
      footerFont: 'Roboto',
      footerSize: 9,
      footerColor: '#555555',
      marginTop: 50,
      marginBottom: 50,
      marginLeft: 60,
      marginRight: 60,
      paragraphSpacing: 12,
      sectionSpacing: 28,
    },
  },
];

export function getTemplate(id: string): BookTemplate {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}

export function getDefaultTemplate(): BookTemplate {
  return TEMPLATES[0];
}
