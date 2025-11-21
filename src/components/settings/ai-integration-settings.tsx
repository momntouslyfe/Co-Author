'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Check, AlertCircle, Info } from 'lucide-react';
import { useAuthUser } from '@/firebase';
import { saveUserApiKey, hasUserApiKey } from '@/lib/user-api-keys';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function AIIntegrationSettings() {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('googleai/gemini-2.5-flash');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminManagedKeys, setAdminManagedKeys] = useState(false);
  const [allowUserKeys, setAllowUserKeys] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminSettings();
      checkForExistingKey();
    }
  }, [user]);

  async function checkAdminSettings() {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const settings = await response.json();
        setAdminManagedKeys(settings.useAdminKeys || false);
        setAllowUserKeys(settings.allowUserKeys !== false);
      }
    } catch (error) {
      console.error('Error checking admin settings:', error);
    }
  }

  async function checkForExistingKey() {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const keyExists = await hasUserApiKey(user.uid);
      setHasKey(keyExists);
    } catch (error) {
      console.error('Error checking for API key:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTestApiKey() {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Google AI API key to test.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Your API key is valid and working!',
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Invalid API Key',
          description: errorData.error?.message || 'The API key you provided is not valid.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Could not verify the API key. Please check your connection.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave() {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to save your settings.',
        variant: 'destructive',
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Google AI API key.',
        variant: 'destructive',
      });
      return;
    }

    if (!model.trim()) {
      toast({
        title: 'Model Required',
        description: 'Please enter a model name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveUserApiKey(user.uid, apiKey, model);
      setHasKey(true);
      toast({
        title: 'Settings Saved',
        description: 'Your API key and model preferences have been saved securely.',
      });
      setApiKey('');
      setShowApiKey(false);
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save your settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (adminManagedKeys && !allowUserKeys) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Integration</CardTitle>
          <CardDescription>
            API keys are managed by the administrator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin Managed:</strong> API keys are centrally managed by the administrator. 
              You can use all AI features without configuring your own API key.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google AI Integration</CardTitle>
        <CardDescription>
          Configure your Google AI API key to use all AI features in Co-Author Pro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {adminManagedKeys ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> The administrator has configured API keys for this application. 
              You can optionally provide your own API key as a fallback or to use your preferred model.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> You need to provide your own Google AI API key to use any AI functionality in this app. 
              Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google AI Studio</a>.
            </AlertDescription>
          </Alert>
        )}

        {hasKey && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              <strong>API Key Configured:</strong> Your Google AI API key is set up and ready to use.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Google AI API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasKey ? 'Enter new API key to update' : 'Enter your Google AI API key'}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Your API key is encrypted and stored securely. It will never be shared or exposed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Preferred Model</Label>
            <Input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="googleai/gemini-2.5-flash"
            />
            <p className="text-sm text-muted-foreground">
              Available models: googleai/gemini-2.5-flash (recommended), googleai/gemini-2.0-flash-exp, googleai/gemini-1.5-pro
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTestApiKey}
              variant="outline"
              disabled={isTesting || !apiKey.trim()}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test API Key'
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={isSaving || !apiKey.trim() || !model.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">How to get your Google AI API Key:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google AI Studio</a></li>
            <li>Sign in with your Google account</li>
            <li>Click &quot;Create API Key&quot;</li>
            <li>Copy your API key and paste it above</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
