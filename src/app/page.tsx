'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Search,
  Sparkles,
  PenTool,
  Target,
  Megaphone,
  Gift,
  TrendingUp,
  Clock,
  DollarSign,
  Brain,
  Layers,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Check,
  Zap,
  BookMarked,
  Lightbulb,
  LayoutTemplate,
  Palette,
  Globe,
  Shield,
  RefreshCw,
  Quote,
  LogIn,
} from 'lucide-react';
import Logo from '@/components/logo';
import { useAuthUser, useAuth } from '@/firebase/auth/use-user';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionPlan } from '@/types/subscription';
import { getCurrencySymbol } from '@/lib/currency-utils';

const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const painPoints = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Drowning in Research",
    description: "You've spent weeks collecting notes, bookmarks, and ideas — but still can't see how they fit together into a book."
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: "The Blank Page Paralysis",
    description: "You know what you want to say, but every time you sit down to write, the words just won't come out right."
  },
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: "Ghostwriters Are Out of Reach",
    description: "Quality ghostwriters charge $15,000 to $50,000+. Your message deserves to be heard, but the cost is impossible."
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: "Your Voice Keeps Changing",
    description: "Chapter 1 sounds different from Chapter 5. Your manuscript feels like it was written by different people."
  },
  {
    icon: <Megaphone className="h-6 w-6" />,
    title: "Marketing Feels Overwhelming",
    description: "Even if you finish writing, how do you create sales pages, bonus materials, and promotional content?"
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "No Plan Beyond Publication",
    description: "Most authors publish once and hope for the best. You want a strategy that turns readers into lifelong fans."
  }
];

const features = [
  {
    icon: <Search className="h-8 w-8" />,
    title: "Deep Topic Research",
    description: "Uncover your audience's deepest pain points, desires, and questions. Get market insights and credible sources — all in minutes, not weeks.",
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    icon: <BookOpen className="h-8 w-8" />,
    title: "Smart Blueprint Generator",
    description: "Transform your rough idea into 3 complete book outlines. Each one uses proven narrative structures that keep readers turning pages.",
    color: "bg-purple-500/10 text-purple-600"
  },
  {
    icon: <PenTool className="h-8 w-8" />,
    title: "AI Co-Author Workspace",
    description: "Write chapter by chapter with intelligent assistance. Expand your ideas, refine your prose, and maintain quality from start to finish.",
    color: "bg-green-500/10 text-green-600"
  },
  {
    icon: <Sparkles className="h-8 w-8" />,
    title: "Your Voice, Amplified",
    description: "Upload your writing samples. Our AI learns your unique style — your rhythm, vocabulary, and tone — then writes exactly like you.",
    color: "bg-yellow-500/10 text-yellow-600"
  },
  {
    icon: <Lightbulb className="h-8 w-8" />,
    title: "Title That Sells",
    description: "Generate magnetic book titles and subtitles that capture attention and communicate the transformation readers will experience.",
    color: "bg-orange-500/10 text-orange-600"
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Write in Your Language",
    description: "English, Bangla, Hindi, Spanish, French, German — and natural code-mixing. Write the way you actually speak and think.",
    color: "bg-pink-500/10 text-pink-600"
  }
];

const marketingFeatures = [
  {
    icon: <Gift className="h-8 w-8" />,
    title: "Bonus Material Creator",
    description: "Generate high-value bonus ideas — workbooks, checklists, templates — that make your offer irresistible and increase your book's perceived value.",
    color: "bg-red-500/10 text-red-600"
  },
  {
    icon: <LayoutTemplate className="h-8 w-8" />,
    title: "Offer Workspace",
    description: "Build your bonus materials from scratch. Create detailed outlines and write each section with AI guidance.",
    color: "bg-indigo-500/10 text-indigo-600"
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: "Book Funnel Builder",
    description: "Design a strategic 7-step funnel using the value ladder principle. Turn one book into a complete product ecosystem.",
    color: "bg-teal-500/10 text-teal-600"
  },
  {
    icon: <FileText className="h-8 w-8" />,
    title: "Content Studio",
    description: "Generate blog posts, email sequences, social media content, and video scripts — all aligned with your book's message.",
    color: "bg-cyan-500/10 text-cyan-600"
  },
  {
    icon: <Target className="h-8 w-8" />,
    title: "Landing Page Copy",
    description: "Create high-converting sales pages using the Value Equation framework. Stack your bonuses for maximum impact.",
    color: "bg-amber-500/10 text-amber-600"
  },
  {
    icon: <Layers className="h-8 w-8" />,
    title: "Proven Frameworks",
    description: "Apply battle-tested copywriting principles to create marketing content that resonates, persuades, and converts.",
    color: "bg-violet-500/10 text-violet-600"
  }
];

const howItWorks = [
  {
    step: "01",
    title: "Discover Your Foundation",
    description: "Start with AI-powered research. Understand your audience, uncover hidden angles, and find the unique perspective only you can offer."
  },
  {
    step: "02",
    title: "Map Your Book",
    description: "Generate three unique book blueprints based on proven narrative structures. Choose the one that best fits your vision."
  },
  {
    step: "03",
    title: "Write With Confidence",
    description: "Move through your chapters with AI as your co-author. Expand ideas, overcome blocks, and polish your prose as you go."
  },
  {
    step: "04",
    title: "Build Your Offer",
    description: "Create compelling bonus materials that add value. Workbooks, templates, and resources that complement your book perfectly."
  },
  {
    step: "05",
    title: "Launch Like a Pro",
    description: "Generate landing pages, marketing content, and sales funnels. Turn your book into a complete business asset."
  }
];

export default function LandingPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useAuthUser();
  const { toast } = useToast();
  
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/user/subscription-plans');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionPlans(data);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    
    fetchPlans();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Error during sign-in:', error);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast({
          title: 'Sign-in Error',
          description: 'Could not sign in with Google. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlanId(planId);
    setIsProcessing(true);
    
    if (user) {
      const params = new URLSearchParams({
        planId: planId,
        type: 'subscription',
      });
      router.push(`/payment-overview?${params.toString()}`);
    } else {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        if (result.user) {
          const params = new URLSearchParams({
            planId: planId,
            type: 'subscription',
          });
          router.push(`/payment-overview?${params.toString()}`);
        }
      } catch (error: any) {
        console.error('Error during sign-in:', error);
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          toast({
            title: 'Sign-in Error',
            description: 'Could not sign in with Google. Please try again.',
            variant: 'destructive',
          });
        }
        setIsProcessing(false);
        setSelectedPlanId(null);
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="#features">Features</Link>
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="#pricing">Pricing</Link>
            </Button>
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="gap-2"
                >
                  {isLoggingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Login</span>
                </Button>
                <Button asChild>
                  <Link href="#pricing">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Your AI Writing Partner
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tight mb-6">
                The Book You've Been Dreaming About?
                <span className="text-primary block mt-2">It's Closer Than You Think.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Stop staring at blank pages. Stop drowning in research. Stop wondering how to market your book. 
                Co-Author handles the heavy lifting so you can focus on what matters — sharing your message with the world.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="text-lg px-8">
                  <Link href="#pricing">
                    Start Writing Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <Link href="#how-it-works">See How It Works</Link>
                </Button>
              </div>
              
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                  <Search className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Deep Research</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Smart Outlines</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Style Cloning</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                  <Target className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium">Marketing Suite</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Sound Familiar?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These struggles have stopped countless talented people from sharing their knowledge. 
                But they don't have to stop you.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {painPoints.map((point, index) => (
                <Card key={index} className="border-destructive/20 bg-destructive/5">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                        {point.icon}
                      </div>
                      <CardTitle className="text-lg">{point.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{point.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Quote className="h-12 w-12 mx-auto mb-6 opacity-50" />
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-6">
              What If Writing a Book Actually Felt... Achievable?
            </h2>
            <p className="text-lg max-w-3xl mx-auto mb-4 opacity-90">
              Picture this: You sit down with a clear roadmap. Research that would take weeks is done in minutes. 
              Your ideas flow into structured chapters. Your unique voice stays consistent from page one to the final word. 
              And when you're done writing? The marketing materials practically create themselves.
            </p>
            <p className="text-xl font-semibold">
              That's not a fantasy. That's Co-Author.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span>7-Day Money-Back Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                <span>Cancel Anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <span>Instant Access</span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <BookMarked className="h-4 w-4 mr-2" />
                Writing Suite
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                From Blank Page to Finished Manuscript
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every tool you need to research, plan, and write your book — working together seamlessly.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <Megaphone className="h-4 w-4 mr-2" />
                Marketing Suite
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Turn Your Book Into a Business
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Writing the book is just the beginning. Build the complete marketing ecosystem that generates revenue long after publication.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketingFeatures.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                From Idea to Published Author in 5 Steps
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A clear, guided journey that takes you from "I want to write a book" to "I'm a published author."
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="space-y-8">
                {howItWorks.map((item, index) => (
                  <div key={index} className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                      {item.step}
                    </div>
                    <div className="flex-1 pt-2">
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <Zap className="h-4 w-4 mr-2" />
                Simple Pricing
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Invest in Your Author Journey
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that matches your ambition. All plans include the complete writing and marketing suite.
              </p>
            </div>

            {isLoadingPlans ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : subscriptionPlans.length === 0 ? (
              <Card className="max-w-md mx-auto">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Subscription plans are being configured. Please check back soon.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {subscriptionPlans.map((plan, index) => (
                  <Card 
                    key={plan.id} 
                    className={`relative flex flex-col ${index === 1 ? 'border-primary shadow-lg scale-105' : ''}`}
                  >
                    {index === 1 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <CardTitle className="text-2xl font-headline">{plan.name}</CardTitle>
                      {plan.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">{getCurrencySymbol(plan.currency)}{plan.price.toLocaleString()}</span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-8 flex-1">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>{plan.bookCreditsPerMonth} Book Project{plan.bookCreditsPerMonth > 1 ? 's' : ''} / month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>{plan.wordCreditsPerMonth.toLocaleString()} AI Words / month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>{plan.offerCreditsPerMonth} Offer Creation{plan.offerCreditsPerMonth > 1 ? 's' : ''} / month</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>Complete Writing Suite</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>Full Marketing Tools</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>Buy Additional Credits Anytime</span>
                        </div>
                        {plan.allowCreditRollover && (
                          <div className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                            <span>Unused Credits Roll Over</span>
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full" 
                        size="lg"
                        variant={index === 1 ? 'default' : 'outline'}
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={isProcessing && selectedPlanId === plan.id}
                      >
                        {isProcessing && selectedPlanId === plan.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Buy Now'
                        )}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground mt-3">
                        Secure checkout. Instant access after payment.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="text-center mt-8">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
                <Shield className="h-4 w-4" />
                <span>7-Day Money-Back Guarantee — No Questions Asked</span>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground">
              <CardContent className="py-12 px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                  Your Book is Waiting to Be Written
                </h2>
                <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
                  You have knowledge the world needs. Ideas that could change lives. 
                  A story only you can tell. Stop waiting for the "perfect time." 
                  Start today, and let Co-Author guide you to the finish line.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm opacity-90">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>7-Day Money-Back Guarantee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>Instant Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span>Cancel Anytime</span>
                  </div>
                </div>
                <Button size="lg" variant="secondary" asChild className="text-lg px-8">
                  <Link href="#pricing">
                    Start Your Author Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="bg-muted/50 border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-4 text-muted-foreground max-w-md">
                Co-Author is your AI-powered writing partner. From first idea to finished book 
                with complete marketing materials — we help you share your message with the world.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Writing Tools</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Topic Research</li>
                <li>Blueprint Generator</li>
                <li>Co-Author Workspace</li>
                <li>Style Cloning</li>
                <li>Title Generator</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Marketing Tools</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Offer Creator</li>
                <li>Offer Workspace</li>
                <li>Funnel Builder</li>
                <li>Content Studio</li>
                <li>Landing Page Copy</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Co-Author. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
