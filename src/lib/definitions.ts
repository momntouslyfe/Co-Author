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
