

export type User = {
  name: string;
  email: string;
  avatarUrl: string;
};

export type Chapter = {
  id: string;
  title: string;
  part: string;
  content: string;
};

export type PublishStyles = {
  templateId?: string;
  showTOC?: boolean;
  chapterTitleFont?: string;
  chapterTitleSize?: number;
  chapterTitleColor?: string;
  sectionTitleFont?: string;
  sectionTitleSize?: number;
  sectionTitleColor?: string;
  bodyFont?: string;
  bodySize?: number;
  bodyColor?: string;
  headerFont?: string;
  headerSize?: number;
  headerColor?: string;
  footerFont?: string;
  footerSize?: number;
  footerColor?: string;
};

export type Project = {
  id: string;
  userId: string;
  title:string;
  description?: string;
  imageUrl?: string;
  imageHint?: string;
  coverImageUrl?: string;
  language?: string;
  storytellingFramework?: string;
  chapters?: Chapter[];
  outline?: string;
  status: 'Draft' | 'In Progress' | 'Completed';
  createdAt: string;
  lastUpdated: string;
  researchProfileId?: string;
  styleProfileId?: string;
  authorProfileId?: string;
  currentStep?: 'blueprint' | 'title' | 'chapters';
  publishStyles?: PublishStyles;
};

export type ResearchProfile = {
  id: string;
  userId: string;
  topic: string;
  language: string;
  targetMarket?: string;
  deepTopicResearch: string;
  painPointAnalysis: string;
  targetAudienceSuggestion: string;
  createdAt: string;
};

export type StyleProfile = {
    id: string;
    userId: string;
    name: string;
    styleAnalysis: string;
    createdAt: string;
};

export type AuthorProfile = {
    id: string;
    userId: string;
    penName: string;
    fullName?: string;
    bio: string;
    photoUrl?: string;
    email?: string;
    website?: string;
    socialLinks?: {
        twitter?: string;
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        goodreads?: string;
    };
    credentials?: string;
    createdAt: string;
    updatedAt?: string;
};

export type AIProvider = 'gemini' | 'openai' | 'claude';

export type AIFunction = 
  | 'research' 
  | 'blueprint' 
  | 'title' 
  | 'chapter' 
  | 'rewrite' 
  | 'expand' 
  | 'style_analysis';

export type AdminAPIKey = {
  id: string;
  provider: AIProvider;
  apiKey: string;
  model?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AIRouting = {
  functionName: AIFunction;
  provider: AIProvider;
  model?: string;
};

export type AdminSettings = {
  id: string;
  useAdminKeys: boolean;
  allowUserKeys: boolean;
  aiRouting: AIRouting[];
  updatedAt: string;
};

export type UserManagement = {
  id: string;
  email: string;
  displayName: string;
  isDisabled: boolean;
  createdAt: string;
  lastLogin?: string;
};

