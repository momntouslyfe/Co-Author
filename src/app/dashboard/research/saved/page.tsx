'use client';

import { useAuthUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { ResearchProfile } from "@/lib/definitions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"

export default function SavedResearchPage() {
    const { user, isUserLoading } = useAuthUser();
    const firestore = useFirestore();

    const researchProfilesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, 'users', user.uid, 'researchProfiles');
    }, [user, firestore]);

    const { data: researchProfiles, isLoading: profilesLoading } = useCollection<ResearchProfile>(researchProfilesQuery);

    const isLoading = isUserLoading || profilesLoading;

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tighter">Saved Research Profiles</h1>
                <p className="text-muted-foreground">
                    Here are all the topic research profiles you have saved. You can use these to generate book blueprints.
                </p>
            </header>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : researchProfiles && researchProfiles.length > 0 ? (
                <div className="space-y-4">
                    {researchProfiles.map(profile => (
                        <Card key={profile.id}>
                            <CardHeader>
                                <CardTitle className="font-headline">{profile.topic}</CardTitle>
                                <CardDescription>
                                    Language: {profile.language} {profile.targetMarket && `| Target Market: ${profile.targetMarket}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>Target Audience Suggestion</AccordionTrigger>
                                        <AccordionContent className="prose prose-sm max-w-none dark:prose-invert">
                                            {profile.targetAudienceSuggestion}
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Pain Point Analysis</AccordionTrigger>
                                        <AccordionContent className="prose prose-sm max-w-none dark:prose-invert">
                                            {profile.painPointAnalysis}
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-3">
                                        <AccordionTrigger>Deep Topic Research</AccordionTrigger>
                                        <AccordionContent className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                                            {profile.deepTopicResearch}
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                    <CardHeader>
                        <CardTitle>No Saved Research</CardTitle>
                        <CardDescription>
                            You haven&apos;t saved any research profiles yet.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
        </div>
    )
}
