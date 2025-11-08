import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Book, Bot, Feather, LineChart } from 'lucide-react';
import Logo from '@/components/logo';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter mb-4">
              Unlock Your Inner Author with AI
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
              Co-Author Pro is your dedicated AI partner, simplifying everything from research to writing, so you can focus on bringing your story to life.
            </p>
            <Button size="lg" asChild>
              <Link href="/login">Start Writing for Free</Link>
            </Button>
          </div>
        </section>

        <section className="bg-secondary py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">Features Designed for Authors</h2>
              <p className="max-w-xl mx-auto text-muted-foreground mt-4">
                All the tools you need to plan, research, and write your next masterpiece.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<LineChart className="w-8 h-8 text-primary" />}
                title="AI Topic Research"
                description="Dive deep into any topic, analyze pain points, and identify your target audience with our AI-powered research assistant."
              />
              <FeatureCard
                icon={<Book className="w-8 h-8 text-primary" />}
                title="AI Blueprint Generator"
                description="Instantly generate comprehensive book outlines and structures based on market analysis and your unique ideas."
              />
              <FeatureCard
                icon={<Feather className="w-8 h-8 text-primary" />}
                title="AI Co-Author Workspace"
                description="Write chapter by chapter with an AI co-author that can expand, rewrite, and enrich your content in your chosen style."
              />
              <FeatureCard
                icon={<Bot className="w-8 h-8 text-primary" />}
                title="Flexible AI Integration"
                description="Harness the power of leading AI models. Choose the best AI for your task from providers like OpenAI, Gemini, and Claude."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-between items-center">
          <Logo />
          <p className="text-muted-foreground text-sm">&copy; {new Date().getFullYear()} Co-Author Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string; }) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-4">{icon}</div>
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription className="pt-2">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
