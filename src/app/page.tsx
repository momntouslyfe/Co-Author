'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Users,
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
  Star,
} from 'lucide-react';
import Logo from '@/components/logo';
import { useAuthUser, useAuth } from '@/firebase/auth/use-user';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import type { SubscriptionPlan, AddonCreditPlan } from '@/types/subscription';
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
    title: "Endless Hours of Research",
    description: "Spending weeks gathering information, only to end up with scattered notes and no clear direction."
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: "Writer's Block",
    description: "Staring at a blank page, struggling to organize your brilliant ideas into a coherent book structure."
  },
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: "Expensive Ghostwriters",
    description: "Professional ghostwriters cost $15,000-$50,000+, putting your book dream out of reach."
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: "Inconsistent Writing Style",
    description: "Your voice changes from chapter to chapter, making your book feel disjointed and unprofessional."
  },
  {
    icon: <Megaphone className="h-6 w-6" />,
    title: "Marketing Overwhelm",
    description: "Even if you finish writing, you have no idea how to create compelling sales copy and bonus materials."
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "No Sales Funnel Strategy",
    description: "Published authors struggle to monetize their books beyond the initial sale."
  }
];

const features = [
  {
    icon: <Search className="h-8 w-8" />,
    title: "AI Topic Research",
    description: "Deep dive into any topic with AI-powered research that uncovers pain points, target audiences, market trends, and credible sources with reference links.",
    color: "bg-blue-500/10 text-blue-600"
  },
  {
    icon: <BookOpen className="h-8 w-8" />,
    title: "AI Blueprint Generator",
    description: "Transform your idea into 3 unique book outlines using proven storytelling frameworks. Choose from 11 frameworks including Hero's Journey, Three-Act Structure, and more.",
    color: "bg-purple-500/10 text-purple-600"
  },
  {
    icon: <PenTool className="h-8 w-8" />,
    title: "AI Co-Author Workspace",
    description: "Write your book chapter by chapter with AI assistance. Expand paragraphs, rewrite sections, and maintain consistent quality throughout your manuscript.",
    color: "bg-green-500/10 text-green-600"
  },
  {
    icon: <Sparkles className="h-8 w-8" />,
    title: "Writing Style Cloning",
    description: "Upload your writing samples and let AI analyze your unique voice. Every generated content matches your personal writing style perfectly.",
    color: "bg-yellow-500/10 text-yellow-600"
  },
  {
    icon: <Lightbulb className="h-8 w-8" />,
    title: "AI Title Generator",
    description: "Generate high-converting book titles and subtitles that capture attention and communicate value to your target readers.",
    color: "bg-orange-500/10 text-orange-600"
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Multi-Language Support",
    description: "Write in English, Bangla, Hindi, Spanish, French, German, and more. Perfect code-mixing support for regional languages.",
    color: "bg-pink-500/10 text-pink-600"
  }
];

const marketingFeatures = [
  {
    icon: <Gift className="h-8 w-8" />,
    title: "Offer Creator",
    description: "Generate bonus material ideas including workbooks, checklists, templates, and guides that complement your book and increase perceived value.",
    color: "bg-red-500/10 text-red-600"
  },
  {
    icon: <LayoutTemplate className="h-8 w-8" />,
    title: "Offer Workspace",
    description: "Develop your bonus materials from idea to completion. Create detailed blueprints and write each section with AI assistance.",
    color: "bg-indigo-500/10 text-indigo-600"
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: "Funnel Creator",
    description: "Build a 7-step book funnel using the value ladder principle. Generate strategic follow-up book ideas to maximize lifetime reader value.",
    color: "bg-teal-500/10 text-teal-600"
  },
  {
    icon: <FileText className="h-8 w-8" />,
    title: "Co-Writer Studio",
    description: "Generate content ideas and write marketing materials including blog posts, email newsletters, social media content, and video scripts.",
    color: "bg-cyan-500/10 text-cyan-600"
  },
  {
    icon: <Target className="h-8 w-8" />,
    title: "Landing Page Copy",
    description: "Create high-converting landing page copy using the Value Equation framework. Include your bonus stack for maximum impact.",
    color: "bg-amber-500/10 text-amber-600"
  },
  {
    icon: <Layers className="h-8 w-8" />,
    title: "13 Content Frameworks",
    description: "Apply proven copywriting frameworks like AIDA, PAS, FAB, PASTOR, and more to create persuasive marketing content that converts.",
    color: "bg-violet-500/10 text-violet-600"
  }
];

const howItWorks = [
  {
    step: "01",
    title: "Research Your Topic",
    description: "Start with AI-powered deep research. Get comprehensive insights, pain points, and target audience analysis in minutes."
  },
  {
    step: "02",
    title: "Generate Your Blueprint",
    description: "Transform your research into a structured book outline using proven storytelling frameworks. Get 3 unique versions to choose from."
  },
  {
    step: "03",
    title: "Write Your Chapters",
    description: "Work through your book chapter by chapter with AI assistance. Expand, rewrite, and refine until your manuscript is complete."
  },
  {
    step: "04",
    title: "Create Bonus Materials",
    description: "Generate complementary offers like workbooks and templates. Build your value stack to increase book sales."
  },
  {
    step: "05",
    title: "Launch & Market",
    description: "Create landing page copy, marketing content, and build your book funnel to maximize revenue from every reader."
  }
];

const frameworks = [
  "Hero's Journey", "Mentor's Journey", "Three-Act Structure", "Fichtean Curve",
  "Save the Cat", "Man In Hole", "Cinderella", "Boy Meets Girl", 
  "Which Way is Up", "Creation Story", "Redemption"
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "Non-Fiction Author",
    content: "I had been struggling with my business book for over a year. With Co-Author, I completed my first draft in just 6 weeks. The AI research saved me countless hours, and the style cloning kept my voice consistent throughout.",
    rating: 5
  },
  {
    name: "James K.",
    role: "Life Coach",
    content: "The blueprint generator is incredible. I got three completely different book structures from my initial idea, and the offer creator helped me build a complete bonus package. My book launch was a success!",
    rating: 5
  },
  {
    name: "Priya D.",
    role: "Entrepreneur",
    content: "Writing in Bangla with English technical terms was always a challenge. Co-Author's code-mixing support is perfect - it understands exactly how I naturally write and speak.",
    rating: 5
  }
];

const faqs = [
  {
    question: "How does the credit system work?",
    answer: "Co-Author uses three types of credits: Book Credits (for creating new book projects), Word Credits (for AI content generation), and Offer Credits (for creating bonus materials). Your monthly subscription includes a set amount of each. If you need more, you can purchase addon credits anytime - they never expire."
  },
  {
    question: "What happens after I complete my purchase?",
    answer: "After successful payment, you'll be taken directly to your dashboard where you can start using all features immediately. Your credits will be available right away, and you can begin researching, outlining, or writing your book."
  },
  {
    question: "Can I use my own writing style?",
    answer: "Absolutely! Our Style Cloning feature analyzes your writing samples (upload .txt or .pdf files) and creates a style profile. The AI then mimics your unique voice, tone, sentence structure, and vocabulary in all generated content."
  },
  {
    question: "What languages are supported?",
    answer: "Co-Author supports English, Bangla, Hindi, Spanish, French, and German. We also support code-mixing - naturally blending languages as many bilingual speakers do in their writing."
  },
  {
    question: "Do unused credits roll over?",
    answer: "This depends on your subscription plan. Some plans include credit rollover, allowing unused monthly credits to carry over to the next billing cycle. Addon credits purchased separately never expire."
  },
  {
    question: "What are the 11 storytelling frameworks?",
    answer: "We offer Hero's Journey, Mentor's Journey, Three-Act Structure, Fichtean Curve, Save the Cat, Man In Hole, Cinderella/Rags to Riches, Boy Meets Girl, Which Way is Up, Creation Story, and Redemption. Each framework provides a proven narrative structure for your book."
  },
  {
    question: "Can I create marketing materials for my book?",
    answer: "Yes! Our Marketing Suite includes Co-Writer for blog posts and emails, Landing Page Copy generator, Offer Creator for bonus materials, and Funnel Creator for building a complete book sales funnel. We support 13 proven copywriting frameworks."
  },
  {
    question: "Is there a refund policy?",
    answer: "We want you to be completely satisfied. If you're not happy with the service within the first 7 days, contact our support team for a full refund."
  }
];

export default function LandingPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useAuthUser();
  const { toast } = useToast();
  
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [addonPlans, setAddonPlans] = useState<AddonCreditPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const [subResponse, addonResponse] = await Promise.all([
          fetch('/api/user/subscription-plans'),
          fetch('/api/user/addon-credit-plans')
        ]);
        
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscriptionPlans(subData);
        }
        
        if (addonResponse.ok) {
          const addonData = await addonResponse.json();
          setAddonPlans(addonData);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setIsLoadingPlans(false);
      }
    };
    
    fetchPlans();
  }, []);

  const handleSelectPlan = async (planId: string, isAddon: boolean = false) => {
    setSelectedPlanId(planId);
    setIsProcessing(true);
    
    if (user) {
      const params = new URLSearchParams({
        [isAddon ? 'addonId' : 'planId']: planId,
        type: isAddon ? 'addon' : 'subscription',
      });
      router.push(`/payment-overview?${params.toString()}`);
    } else {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        if (result.user) {
          const params = new URLSearchParams({
            [isAddon ? 'addonId' : 'planId']: planId,
            type: isAddon ? 'addon' : 'subscription',
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

  const groupedAddons = {
    words: addonPlans.filter(p => p.type === 'words'),
    books: addonPlans.filter(p => p.type === 'books'),
    offers: addonPlans.filter(p => p.type === 'offers'),
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="#features">Features</Link>
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="#pricing">Pricing</Link>
            </Button>
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link href="#faq">FAQ</Link>
            </Button>
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="#pricing">Choose a Plan</Link>
              </Button>
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
                AI-Powered Writing Partner
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tight mb-6">
                Your Book is Already Inside You.
                <span className="text-primary block mt-2">We Help You Bring It Out.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Co-Author is your AI-powered writing partner that guides you from a simple idea to a 
                published book with complete marketing materials. No more writer's block. 
                No more expensive ghostwriters. Just you and your trusted guide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="text-lg px-8">
                  <Link href="#pricing">
                    Choose Your Plan
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <Link href="#how-it-works">See How It Works</Link>
                </Button>
              </div>
              
              <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>11 Storytelling Frameworks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>13 Marketing Frameworks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Style Cloning Technology</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Multi-Language Support</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Writing a Book Shouldn't Be This Hard
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                If any of these challenges sound familiar, you're not alone. 
                Most aspiring authors face the same obstacles.
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
              What If You Had a Writing Partner Who Never Sleeps?
            </h2>
            <p className="text-lg max-w-3xl mx-auto mb-4 opacity-90">
              Imagine having a tireless co-author who understands your vision, 
              researches your topic thoroughly, structures your ideas perfectly, 
              and helps you write in your unique voice — all at a fraction of the 
              cost of a traditional ghostwriter.
            </p>
            <p className="text-xl font-semibold">
              That's exactly what Co-Author gives you.
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
                Everything You Need to Write Your Book
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From initial research to final manuscript, our AI-powered tools guide you through every step.
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
                Launch and Market Like a Pro
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Don't just write a book — build a complete marketing ecosystem that generates revenue long after publication.
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

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Choose Your Narrative Path
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Select from 11 proven storytelling frameworks used by bestselling authors worldwide.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {frameworks.map((framework, index) => (
                <Badge key={index} variant="secondary" className="px-4 py-2 text-sm">
                  {framework}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Your Journey from Idea to Published Author
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A simple, guided process that takes you from blank page to completed book with marketing materials.
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

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">
                <Star className="h-4 w-4 mr-2" />
                Success Stories
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Authors Who Brought Their Books to Life
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real stories from real authors who used Co-Author to complete their writing journey.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                    <div className="border-t pt-4">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                Choose the Plan That Fits Your Goals
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                All plans include access to our complete writing and marketing suite. 
                Select based on how many books you want to create each month.
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
                          <span>All Writing & Marketing Tools</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>11 Storytelling Frameworks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          <span>13 Marketing Frameworks</span>
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
                          <>
                            {user ? 'Select Plan' : (
                              <>
                                <GoogleIcon />
                                <span className="ml-2">Continue with Google</span>
                              </>
                            )}
                          </>
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
                <span>7-Day Money-Back Guarantee - No Questions Asked</span>
              </div>
            </div>

            {(groupedAddons.words.length > 0 || groupedAddons.books.length > 0 || groupedAddons.offers.length > 0) && (
              <div className="mt-16">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold font-headline mb-2">
                    Need More Credits? Pay As You Go
                  </h3>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Running low on credits? Purchase additional credits anytime. 
                    Addon credits never expire and can be used whenever you need them.
                  </p>
                </div>

                <Tabs defaultValue="words" className="max-w-4xl mx-auto">
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="words" disabled={groupedAddons.words.length === 0}>
                      AI Words
                    </TabsTrigger>
                    <TabsTrigger value="books" disabled={groupedAddons.books.length === 0}>
                      Book Projects
                    </TabsTrigger>
                    <TabsTrigger value="offers" disabled={groupedAddons.offers.length === 0}>
                      Offer Credits
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="words">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedAddons.words.map((addon) => (
                        <Card key={addon.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{addon.name}</CardTitle>
                              <Badge variant="secondary">{addon.creditAmount.toLocaleString()} words</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-2xl font-bold">{getCurrencySymbol(addon.currency)}{addon.price.toLocaleString()}</span>
                              <span className="text-sm text-muted-foreground">one-time</span>
                            </div>
                            <Button 
                              className="w-full" 
                              variant="outline"
                              onClick={() => handleSelectPlan(addon.id, true)}
                              disabled={isProcessing && selectedPlanId === addon.id}
                            >
                              {isProcessing && selectedPlanId === addon.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : 'Purchase'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="books">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedAddons.books.map((addon) => (
                        <Card key={addon.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{addon.name}</CardTitle>
                              <Badge variant="secondary">{addon.creditAmount} project{addon.creditAmount > 1 ? 's' : ''}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-2xl font-bold">{getCurrencySymbol(addon.currency)}{addon.price.toLocaleString()}</span>
                              <span className="text-sm text-muted-foreground">one-time</span>
                            </div>
                            <Button 
                              className="w-full" 
                              variant="outline"
                              onClick={() => handleSelectPlan(addon.id, true)}
                              disabled={isProcessing && selectedPlanId === addon.id}
                            >
                              {isProcessing && selectedPlanId === addon.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : 'Purchase'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="offers">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedAddons.offers.map((addon) => (
                        <Card key={addon.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{addon.name}</CardTitle>
                              <Badge variant="secondary">{addon.creditAmount} offer{addon.creditAmount > 1 ? 's' : ''}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-2xl font-bold">{getCurrencySymbol(addon.currency)}{addon.price.toLocaleString()}</span>
                              <span className="text-sm text-muted-foreground">one-time</span>
                            </div>
                            <Button 
                              className="w-full" 
                              variant="outline"
                              onClick={() => handleSelectPlan(addon.id, true)}
                              disabled={isProcessing && selectedPlanId === addon.id}
                            >
                              {isProcessing && selectedPlanId === addon.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : 'Purchase'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </section>

        <section id="faq" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Everything you need to know about Co-Author.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-4xl mx-auto bg-primary text-primary-foreground">
              <CardContent className="py-12 px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">
                  Ready to Write Your Book?
                </h2>
                <p className="text-lg mb-6 opacity-90 max-w-2xl mx-auto">
                  Join authors who have discovered the power of AI-assisted writing. 
                  Your book is waiting to be written. Let's bring it to life together.
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
                    Choose Your Plan
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
                Your AI-powered writing partner that guides you from idea to published book 
                with complete marketing materials. Write faster, write better.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>AI Topic Research</li>
                <li>Blueprint Generator</li>
                <li>Co-Author Workspace</li>
                <li>Style Cloning</li>
                <li>Offer Creator</li>
                <li>Landing Page Copy</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} Co-Author. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
