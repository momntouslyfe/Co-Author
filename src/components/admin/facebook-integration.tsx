'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Facebook, TestTube, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import type { FacebookEventType } from '@/types/integrations';

const ALL_EVENTS: { value: FacebookEventType; label: string; description: string }[] = [
  { value: 'PageView', label: 'Page View', description: 'When a user views a page' },
  { value: 'ViewContent', label: 'View Content', description: 'When a user views content (book, chapter, etc.)' },
  { value: 'InitiateCheckout', label: 'Initiate Checkout', description: 'When a user starts the checkout process' },
  { value: 'Purchase', label: 'Purchase', description: 'When a user completes a purchase' },
  { value: 'CompleteRegistration', label: 'Complete Registration', description: 'When a user signs up' },
  { value: 'Lead', label: 'Lead', description: 'When a user expresses interest' },
  { value: 'Subscribe', label: 'Subscribe', description: 'When a user subscribes to a plan' },
  { value: 'StartTrial', label: 'Start Trial', description: 'When a user starts a trial' },
  { value: 'AddPaymentInfo', label: 'Add Payment Info', description: 'When a user adds payment information' },
  { value: 'Contact', label: 'Contact', description: 'When a user contacts support' },
];

interface FacebookSettings {
  enabled: boolean;
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  enabledEvents: FacebookEventType[];
}

export function FacebookIntegration() {
  const [settings, setSettings] = useState<FacebookSettings>({
    enabled: false,
    pixelId: '',
    accessToken: '',
    testEventCode: '',
    enabledEvents: ['PageView', 'ViewContent', 'InitiateCheckout', 'Purchase', 'CompleteRegistration', 'Lead', 'Subscribe'],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/integrations/facebook', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      setSettings({
        enabled: data.enabled || false,
        pixelId: data.pixelId || '',
        accessToken: data.accessToken || '',
        testEventCode: data.testEventCode || '',
        enabledEvents: data.enabledEvents || ['PageView', 'ViewContent', 'InitiateCheckout', 'Purchase', 'CompleteRegistration', 'Lead', 'Subscribe'],
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/integrations/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      toast({
        title: 'Success',
        description: 'Facebook Pixel settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (action: 'test_connection' | 'send_test_event') => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/integrations/facebook/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: action === 'test_connection' 
            ? `Connection successful! Pixel ID: ${data.pixelId}` 
            : 'Test event sent successfully!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Test failed',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleEventToggle = (event: FacebookEventType) => {
    setSettings(prev => ({
      ...prev,
      enabledEvents: prev.enabledEvents.includes(event)
        ? prev.enabledEvents.filter(e => e !== event)
        : [...prev.enabledEvents, event],
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Facebook className="h-6 w-6 text-blue-600" />
          <div>
            <CardTitle>Facebook Pixel (CAPI)</CardTitle>
            <CardDescription>
              Server-side conversion tracking with Facebook Conversions API
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enabled">Enable Facebook Pixel</Label>
            <p className="text-sm text-muted-foreground">
              Track conversions and user actions server-side
            </p>
          </div>
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="pixelId">Pixel ID</Label>
            <Input
              id="pixelId"
              placeholder="Enter your Facebook Pixel ID"
              value={settings.pixelId}
              onChange={(e) => setSettings(prev => ({ ...prev, pixelId: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Find this in Facebook Events Manager
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <div className="relative">
              <Input
                id="accessToken"
                type={showToken ? 'text' : 'password'}
                placeholder="Enter your Facebook Conversions API access token"
                value={settings.accessToken}
                onChange={(e) => setSettings(prev => ({ ...prev, accessToken: e.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a system user access token in Facebook Business Settings
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testEventCode">Test Event Code (Optional)</Label>
            <Input
              id="testEventCode"
              placeholder="TEST12345"
              value={settings.testEventCode}
              onChange={(e) => setSettings(prev => ({ ...prev, testEventCode: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Use this to test events in Facebook Events Manager without affecting your data
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Enabled Events</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {ALL_EVENTS.map((event) => (
              <div key={event.value} className="flex items-start space-x-3">
                <Checkbox
                  id={event.value}
                  checked={settings.enabledEvents.includes(event.value)}
                  onCheckedChange={() => handleEventToggle(event.value)}
                />
                <div className="grid gap-0.5 leading-none">
                  <label
                    htmlFor={event.value}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {event.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            testResult.success 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => handleTest('test_connection')}
            disabled={isTesting || !settings.pixelId || !settings.accessToken}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <TestTube className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
          <Button
            variant="outline"
            onClick={() => handleTest('send_test_event')}
            disabled={isTesting || !settings.enabled}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Test Event
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
