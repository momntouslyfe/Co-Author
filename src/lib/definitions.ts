

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

export type OfferCategory = 
  | 'complementary-skill-guide'
  | 'workbook'
  | '30-day-challenge'
  | 'quick-start-guide'
  | 'cheat-sheet'
  | 'small-ebook'
  | 'template'
  | 'frameworks'
  | 'resource-list'
  | 'advanced-chapter'
  | 'self-assessment-quiz'
  | 'troubleshooting-guide'
  | 'all';

export const OFFER_CATEGORY_LABELS: Record<OfferCategory, string> = {
  'complementary-skill-guide': 'Complementary Skill Guide',
  'workbook': 'Workbook / Actionbook',
  '30-day-challenge': '30 Day Challenge',
  'quick-start-guide': 'Quick Start Guide',
  'cheat-sheet': 'Cheat-Sheet',
  'small-ebook': 'Small Ebook',
  'template': 'Template',
  'frameworks': 'Frameworks',
  'resource-list': 'Resource List',
  'advanced-chapter': 'Advanced Chapter',
  'self-assessment-quiz': 'Self Assessment Quiz',
  'troubleshooting-guide': 'Troubleshooting Guide',
  'all': 'All Categories',
};

export const OFFER_CATEGORY_DESCRIPTIONS: Record<Exclude<OfferCategory, 'all'>, string> = {
  'complementary-skill-guide': 'A guide for a complementary skill relevant to your book topic',
  'workbook': 'A guide with questions and space for readers to write their answers',
  '30-day-challenge': 'A step-by-step guide showing exactly what to do each day for a month',
  'quick-start-guide': 'A 10-minute guide to getting the first result immediately',
  'cheat-sheet': 'A 1-3 page summary of the entire system',
  'small-ebook': 'A small complementary skill book relevant to your main book',
  'template': 'Fill-in-the-blank files or pre-made resources',
  'frameworks': 'Step-by-step framework for readers curated from your book',
  'resource-list': 'A curated list of tools or resources readers need',
  'advanced-chapter': 'A "missing chapter" too advanced for the main book but valuable for high achievers',
  'self-assessment-quiz': '15-30 multiple choice questions to test reader knowledge with answer key',
  'troubleshooting-guide': 'What to do when things go wrong',
};

export type OfferIdea = {
  id: string;
  category: Exclude<OfferCategory, 'all'>;
  title: string;
  description: string;
  createdAt: string;
};

export type ProjectOffers = {
  id: string;
  userId: string;
  projectId: string;
  offers: OfferIdea[];
  createdAt: string;
  updatedAt: string;
};

export type BookIdea = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  targetProblem: string;
  createdAt: string;
};

export type FunnelStep = {
  step: number;
  bookIdeas: BookIdea[];
  selectedIdeas: string[];
  generatedAt?: string;
};

export type ProjectFunnel = {
  id: string;
  userId: string;
  projectId: string;
  steps: FunnelStep[];
  createdAt: string;
  updatedAt: string;
};

export type ContentIdea = {
  id: string;
  category: string;
  title: string;
  description: string;
  createdAt: string;
};

export type ProjectContentIdeas = {
  id: string;
  userId: string;
  projectId: string;
  ideas: ContentIdea[];
  createdAt: string;
  updatedAt: string;
};

export type ContentDraft = {
  id: string;
  userId: string;
  projectId: string;
  contentIdeaId?: string;
  contentIdeaTitle?: string;
  title: string;
  content: string;
  wordCount: number;
  targetWordCount?: number;
  customInstructions?: string;
  contentFramework?: string;
  storytellingFramework?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
};

export type OfferBlueprintModule = {
  title: string;
  description: string;
  targetWordCount: number;
};

export type OfferBlueprintPart = {
  title: string;
  modules: OfferBlueprintModule[];
};

export type OfferBlueprint = {
  id: string;
  title: string;
  subtitle?: string;
  summary?: string;
  parts: OfferBlueprintPart[];
  estimatedWordCount: number;
};

export type OfferSection = {
  id: string;
  partNumber: number;
  moduleNumber: number;
  partTitle: string;
  moduleTitle: string;
  description: string;
  targetWordCount: number;
  content: string;
  wordCount: number;
  status: 'pending' | 'writing' | 'completed';
};

export type OfferDraft = {
  id: string;
  projectId: string;
  sourceOfferId: string;
  category: Exclude<OfferCategory, 'all'>;
  title: string;
  subtitle?: string;
  description?: string;
  blueprint: OfferBlueprint;
  masterBlueprint?: string;
  sections: OfferSection[];
  status: 'draft' | 'completed';
  currentStep?: 'blueprint' | 'title' | 'sections';
  language?: string;
  storytellingFramework?: string;
  researchProfileId?: string;
  styleProfileId?: string;
  authorProfileId?: string;
  createdAt: string;
  updatedAt: string;
};

export type OfferProject = {
  id: string;
  userId: string;
  sourceProjectId: string;
  sourceOfferIdeaId: string;
  offerIdeaTitle: string;
  offerIdeaDescription: string;
  offerCategory: Exclude<OfferCategory, 'all'>;
  language: string;
  selectedBlueprintIndex?: number;
  blueprints?: OfferBlueprint[];
  sections?: OfferSection[];
  status: 'blueprint' | 'writing' | 'completed';
  createdAt: string;
  updatedAt: string;
};

export const OFFER_CATEGORY_STRUCTURE: Record<Exclude<OfferCategory, 'all'>, { parts: number; modulesPerPart: number; wordsPerModule: number }> = {
  'complementary-skill-guide': { parts: 3, modulesPerPart: 3, wordsPerModule: 600 },
  'workbook': { parts: 3, modulesPerPart: 4, wordsPerModule: 500 },
  '30-day-challenge': { parts: 3, modulesPerPart: 4, wordsPerModule: 500 },
  'quick-start-guide': { parts: 2, modulesPerPart: 4, wordsPerModule: 500 },
  'cheat-sheet': { parts: 2, modulesPerPart: 3, wordsPerModule: 500 },
  'small-ebook': { parts: 3, modulesPerPart: 4, wordsPerModule: 600 },
  'template': { parts: 2, modulesPerPart: 4, wordsPerModule: 500 },
  'frameworks': { parts: 3, modulesPerPart: 3, wordsPerModule: 600 },
  'resource-list': { parts: 2, modulesPerPart: 4, wordsPerModule: 500 },
  'advanced-chapter': { parts: 3, modulesPerPart: 3, wordsPerModule: 600 },
  'self-assessment-quiz': { parts: 3, modulesPerPart: 4, wordsPerModule: 500 },
  'troubleshooting-guide': { parts: 3, modulesPerPart: 4, wordsPerModule: 500 },
};

