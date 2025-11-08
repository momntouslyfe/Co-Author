import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tighter">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and application settings.
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="ai">AI Integration</TabsTrigger>
          <TabsTrigger value="blog">Blog/SEO</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your public profile and account details.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Profile settings form will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscriptions</CardTitle>
              <CardDescription>Manage your payment methods and subscription plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>PAYG and subscription management UI will be here, supporting Stripe, Paddle, and UddoktaPay.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>Backend AI Integration</CardTitle>
              <CardDescription>Configure and select from multiple AI providers.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Admin panel to provide API keys for OpenAI, Gemini, Claude, and others. Admins can select specific models to be used for different AI functionalities in the app.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blog">
          <Card>
            <CardHeader>
              <CardTitle>Blog & SEO</CardTitle>
              <CardDescription>Configure settings for the built-in blog system.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Settings for sitemap generation, Google Search Console integration, and analytics tracking (GA4, Facebook Pixel/CAPI) will be here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
