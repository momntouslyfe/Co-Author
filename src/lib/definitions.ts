

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
  language?: string;
  storytellingFramework?: string;
  chapters?: Chapter[];
  outline?: string;
  status: 'Draft' | 'In Progress' | 'Completed';
  createdAt: string;
  lastUpdated: string;
  researchProfileId?: string;
  styleProfileId?: string;
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

