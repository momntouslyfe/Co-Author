'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Trash2, User, Edit2, X, Check, Upload, ImageIcon } from 'lucide-react';
import type { AuthorProfile } from '@/lib/definitions';
import { useAuthUser, useCollection, useFirestore } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useMemo } from 'react';
import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';
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
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const formSchema = z.object({
  penName: z.string().min(2, 'Pen name must be at least 2 characters.'),
  fullName: z.string().optional(),
  bio: z.string().min(50, 'Bio must be at least 50 characters.'),
  photoUrl: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  twitter: z.string().optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  goodreads: z.string().optional(),
  credentials: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AuthorProfilePage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<AuthorProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { user } = useAuthUser();
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      penName: '',
      fullName: '',
      bio: '',
      photoUrl: '',
      email: '',
      website: '',
      twitter: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      goodreads: '',
      credentials: '',
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      penName: '',
      fullName: '',
      bio: '',
      photoUrl: '',
      email: '',
      website: '',
      twitter: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      goodreads: '',
      credentials: '',
    },
  });

  const authorProfilesQuery = useMemo(() => {
    if (!user) return null;
    const q = collection(firestore, 'users', user.uid, 'authorProfiles');
    (q as any).__memo = true;
    return q;
  }, [user, firestore]);

  const { data: savedProfiles, isLoading: profilesLoading } = useCollection<AuthorProfile>(authorProfilesQuery);

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to create an author profile.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const authorProfileCollection = collection(firestore, 'users', user.uid, 'authorProfiles');
      await addDoc(authorProfileCollection, {
        userId: user.uid,
        penName: values.penName,
        fullName: values.fullName || null,
        bio: values.bio,
        photoUrl: values.photoUrl || null,
        email: values.email || null,
        website: values.website || null,
        socialLinks: {
          twitter: values.twitter || null,
          facebook: values.facebook || null,
          instagram: values.instagram || null,
          linkedin: values.linkedin || null,
          goodreads: values.goodreads || null,
        },
        credentials: values.credentials || null,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Author profile created successfully.' });
      form.reset();
    } catch (error) {
      console.error("Error creating author profile:", error);
      toast({ title: 'Error', description: 'Could not create the author profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const handleEdit = (profile: AuthorProfile) => {
    setEditingProfile(profile);
    editForm.reset({
      penName: profile.penName,
      fullName: profile.fullName || '',
      bio: profile.bio,
      photoUrl: profile.photoUrl || '',
      email: profile.email || '',
      website: profile.website || '',
      twitter: profile.socialLinks?.twitter || '',
      facebook: profile.socialLinks?.facebook || '',
      instagram: profile.socialLinks?.instagram || '',
      linkedin: profile.socialLinks?.linkedin || '',
      goodreads: profile.socialLinks?.goodreads || '',
      credentials: profile.credentials || '',
    });
    setIsEditDialogOpen(true);
  };

  async function onEditSubmit(values: FormValues) {
    if (!user || !editingProfile) return;

    setSaving(true);
    try {
      const profileDocRef = doc(firestore, 'users', user.uid, 'authorProfiles', editingProfile.id);
      await updateDoc(profileDocRef, {
        penName: values.penName,
        fullName: values.fullName || null,
        bio: values.bio,
        photoUrl: values.photoUrl || null,
        email: values.email || null,
        website: values.website || null,
        socialLinks: {
          twitter: values.twitter || null,
          facebook: values.facebook || null,
          instagram: values.instagram || null,
          linkedin: values.linkedin || null,
          goodreads: values.goodreads || null,
        },
        credentials: values.credentials || null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Author profile updated successfully.' });
      setIsEditDialogOpen(false);
      setEditingProfile(null);
    } catch (error) {
      console.error("Error updating author profile:", error);
      toast({ title: 'Error', description: 'Could not update the author profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = async (profileId: string) => {
    if (!user) return;
    setDeleting(profileId);
    try {
      const profileDocRef = doc(firestore, 'users', user.uid, 'authorProfiles', profileId);
      await deleteDoc(profileDocRef);
      toast({
        title: "Profile Deleted",
        description: "The author profile has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting author profile: ", error);
      toast({
        title: "Error",
        description: "Failed to delete the author profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const AuthorProfileForm = ({ formInstance, onSubmitHandler, isEdit = false }: { formInstance: typeof form; onSubmitHandler: (values: FormValues) => void; isEdit?: boolean }) => (
    <Form {...formInstance}>
      <form onSubmit={formInstance.handleSubmit(onSubmitHandler)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={formInstance.control}
            name="penName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pen Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., J.K. Rowling" {...field} />
                </FormControl>
                <FormDescription>The name that will appear on your books.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={formInstance.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Your full legal name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={formInstance.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Author Bio *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Write a compelling bio about yourself as an author. This will appear in the 'About the Author' section of your books."
                  className="min-h-[150px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>Minimum 50 characters. Tell readers about yourself, your background, and what inspires your writing.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={formInstance.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Photo URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/your-photo.jpg" {...field} />
              </FormControl>
              <FormDescription>A direct URL to your author photo.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={formInstance.control}
          name="credentials"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credentials (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="e.g., PhD in English Literature, 10+ years as a professional writer, Bestselling author of..."
                  className="min-h-[80px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>Your qualifications, awards, or notable achievements.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={formInstance.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email (Optional)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="author@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={formInstance.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://yourwebsite.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Social Media Links (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={formInstance.control}
              name="twitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter/X</FormLabel>
                  <FormControl>
                    <Input placeholder="@yourhandle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="facebook"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facebook</FormLabel>
                  <FormControl>
                    <Input placeholder="facebook.com/yourpage" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="instagram"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input placeholder="@yourhandle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="linkedin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn</FormLabel>
                  <FormControl>
                    <Input placeholder="linkedin.com/in/yourprofile" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="goodreads"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goodreads</FormLabel>
                  <FormControl>
                    <Input placeholder="goodreads.com/author/show/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full md:w-auto">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? 'Update Profile' : 'Create Profile'}
            </>
          )}
        </Button>
      </form>
    </Form>
  );

  return (
    <>
      <FloatingCreditWidget />
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline">Author Profiles</h1>
          <p className="text-muted-foreground">
            Create and manage your author profiles. These will be used in the "About the Author" section of your published books.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Saved Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profilesLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading profiles...</span>
              </div>
            ) : savedProfiles && savedProfiles.length > 0 ? (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {savedProfiles.map(profile => (
                  <Card key={profile.id}>
                    <AccordionItem value={profile.id} className="border-b-0">
                      <div className="flex flex-row items-center justify-between p-2">
                        <AccordionTrigger className="w-full text-left hover:no-underline p-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile.photoUrl} alt={profile.penName} />
                              <AvatarFallback>{profile.penName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{profile.penName}</p>
                              {profile.fullName && (
                                <p className="text-sm text-muted-foreground">{profile.fullName}</p>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center gap-1 mr-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(profile);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={deleting === profile.id}>
                                {deleting === profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Author Profile?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the author profile "{profile.penName}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(profile.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <AccordionContent className="p-4 pt-0">
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-1">Bio</h4>
                            <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
                          </div>
                          {profile.credentials && (
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Credentials</h4>
                              <p className="text-sm whitespace-pre-wrap">{profile.credentials}</p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm">
                            {profile.email && (
                              <div>
                                <span className="text-muted-foreground">Email:</span> {profile.email}
                              </div>
                            )}
                            {profile.website && (
                              <div>
                                <span className="text-muted-foreground">Website:</span>{' '}
                                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  {profile.website}
                                </a>
                              </div>
                            )}
                          </div>
                          {profile.socialLinks && Object.values(profile.socialLinks).some(v => v) && (
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Social Links</h4>
                              <div className="flex flex-wrap gap-3 text-sm">
                                {profile.socialLinks.twitter && <span>Twitter: {profile.socialLinks.twitter}</span>}
                                {profile.socialLinks.facebook && <span>Facebook: {profile.socialLinks.facebook}</span>}
                                {profile.socialLinks.instagram && <span>Instagram: {profile.socialLinks.instagram}</span>}
                                {profile.socialLinks.linkedin && <span>LinkedIn: {profile.socialLinks.linkedin}</span>}
                                {profile.socialLinks.goodreads && <span>Goodreads: {profile.socialLinks.goodreads}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Card>
                ))}
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground">You haven't created any author profiles yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create New Author Profile</CardTitle>
            <CardDescription>
              Fill in the details below to create a new author profile. This information will be used in the "About the Author" section of your published books.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthorProfileForm formInstance={form} onSubmitHandler={onSubmit} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Author Profile</DialogTitle>
            <DialogDescription>
              Update your author profile information.
            </DialogDescription>
          </DialogHeader>
          <AuthorProfileForm formInstance={editForm} onSubmitHandler={onEditSubmit} isEdit />
        </DialogContent>
      </Dialog>
    </>
  );
}
