'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, PenTool, ArrowRight, Sparkles, FileText, Target } from 'lucide-react';

export default function CoWriterPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Co-Writer</h1>
        <p className="text-muted-foreground mt-2">
          Generate content ideas and write marketing content to promote your books.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/10 rounded-lg flex-shrink-0">
                <Lightbulb className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate">Generate Content Ideas</CardTitle>
                <CardDescription className="truncate">Create content ideas to sell your book</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate compelling content ideas tailored to your book&apos;s topic, audience, and marketing goals.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="flex-1">
                <Link href="/dashboard/co-writer/content-ideas/generate">
                  <Sparkles className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Generate</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/dashboard/co-writer/content-ideas/saved">
                  <span className="truncate">View Saved</span>
                  <ArrowRight className="ml-2 h-4 w-4 flex-shrink-0" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg flex-shrink-0">
                <PenTool className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate">Write Content</CardTitle>
                <CardDescription className="truncate">Write full content pieces with AI</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Write complete marketing content from your saved ideas. Rewrite and expand as needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="flex-1">
                <Link href="/dashboard/co-writer/write-content">
                  <PenTool className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Start Writing</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/dashboard/co-writer/saved-drafts">
                  <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Saved</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-green-500/20 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg flex-shrink-0">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate">Landing Page Copy</CardTitle>
                <CardDescription className="truncate">High-converting sales copy</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate high-converting landing page copy using the Value Equation framework.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard/co-writer/landing-page">
                <Target className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Create Landing Page</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">How Co-Writer Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                1
              </div>
              <div>
                <p className="font-medium mb-1">Generate Ideas</p>
                <p className="text-muted-foreground">
                  Create content ideas based on your book&apos;s topic and target audience.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                2
              </div>
              <div>
                <p className="font-medium mb-1">Save &amp; Select</p>
                <p className="text-muted-foreground">
                  Save your favorite ideas and select one to write into full content.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                3
              </div>
              <div>
                <p className="font-medium mb-1">Write &amp; Refine</p>
                <p className="text-muted-foreground">
                  Generate complete content, then rewrite or expand to perfection.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
