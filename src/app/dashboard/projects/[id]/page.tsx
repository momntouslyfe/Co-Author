import { notFound } from 'next/navigation';
import { mockProjects } from '@/lib/mock-data';
import EditorClient from './editor-client';

export default function ProjectEditorPage({ params }: { params: { id: string } }) {
  const project = mockProjects.find((p) => p.id === params.id);

  if (!project) {
    notFound();
  }

  return <EditorClient project={project} />;
}
