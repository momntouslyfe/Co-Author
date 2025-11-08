'use client';

import { useAuthUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, deleteDoc, doc } from "firebase/firestore";
import type { ResearchProfile } from "@/lib/definitions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SavedResearchPage() {
    const { user, isUserLoading } = useAuthUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const researchProfilesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, 'users', user.uid, 'researchProfiles');
    }, [user, firestore]);

    const { data: researchProfiles, isLoading: profilesLoading } = useCollection<ResearchProfile>(researchProfilesQuery);

    const isLoading = isUserLoading || profilesLoading;

    const handleDelete = async (profileId: string) => {
        if (!user) return;
        setIsDeleting(profileId);
        try {
            const profileDocRef = doc(firestore, 'users', user.uid, 'researchProfiles', profileId);
            await deleteDoc(profileDocRef);
            toast({
                title: "Profile Deleted",
                description: "The research profile has been successfully deleted.",
            });
        } catch (error) {
            console.error("Error deleting research profile: ", error);
            toast({
                title: "Error",
                description: "Failed to delete the research profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(null);
        }
    }

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
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {researchProfiles.map(profile => (
                        <AccordionItem value={profile.id} key={profile.id} asChild>
                            <Card>
                                <div className="flex flex-row items-center justify-between p-2">
                                    <AccordionTrigger className="w-full text-left p-2 hover:no-underline">
                                        <div>
                                            <p className="font-headline font-semibold">{profile.topic}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Language: {profile.language} {profile.targetMarket && `| Target Market: ${profile.targetMarket}`}
                                            </p>
                                        </div>
                                    </AccordionTrigger>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" disabled={isDeleting === profile.id} className="flex-shrink-0 mr-2">
                                                {isDeleting === profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete this research profile.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(profile.id)}>
                                                    Continue
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="border-t pt-4 mt-2">
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
                                    </div>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    ))}
                </Accordion>
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
