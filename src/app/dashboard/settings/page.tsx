import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AIIntegrationSettings } from "@/components/settings/ai-integration-settings";
import { BillingSettings } from "@/components/settings/billing-settings";

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

      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai">AI Integration</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="blog">Blog/SEO</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai">
          <AIIntegrationSettings />
        </TabsContent>

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
          <BillingSettings />
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
