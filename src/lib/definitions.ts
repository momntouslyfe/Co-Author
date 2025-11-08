export type User = {
  name: string;
  email: string;
  avatarUrl: string;
};

export type Chapter = {
  id: string;
  title: string;
  content: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  chapters: Chapter[];
  status: 'Draft' | 'In Progress' | 'Completed';
  lastUpdated: string;
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
