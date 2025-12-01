'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, TestTube, CheckCircle2, XCircle, Eye, EyeOff, Send, Info } from 'lucide-react';
import type { EmailProvider } from '@/types/integrations';

interface EmailSettingsState {
  enabled: boolean;
  provider: EmailProvider;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  sendgrid: {
    apiKey: string;
  };
  resend: {
    apiKey: string;
  };
}

export function EmailIntegration() {
  const [settings, setSettings] = useState<EmailSettingsState>({
    enabled: false,
    provider: 'smtp',
    fromEmail: '',
    fromName: '',
    replyToEmail: '',
    smtp: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
    },
    sendgrid: {
      apiKey: '',
    },
    resend: {
      apiKey: '',
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/integrations/email', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      setSettings({
        enabled: data.enabled || false,
        provider: data.provider || 'smtp',
        fromEmail: data.fromEmail || '',
        fromName: data.fromName || '',
        replyToEmail: data.replyToEmail || '',
        smtp: {
          host: data.smtp?.host || '',
          port: data.smtp?.port || 587,
          secure: data.smtp?.secure || false,
          username: data.smtp?.username || '',
          password: data.smtp?.password || '',
        },
        sendgrid: {
          apiKey: data.sendgrid?.apiKey || '',
        },
        resend: {
          apiKey: data.resend?.apiKey || '',
        },
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
      const response = await fetch('/api/admin/integrations/email', {
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
        description: 'Email settings saved successfully',
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

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/integrations/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'test_connection' }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `${getProviderName(settings.provider)} connection successful!`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Connection test failed',
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

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/integrations/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'send_test_email', email: testEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `Test email sent to ${testEmail}!`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test email',
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const getProviderName = (provider: EmailProvider): string => {
    switch (provider) {
      case 'sendgrid': return 'SendGrid';
      case 'resend': return 'Resend';
      case 'smtp': return 'SMTP';
      default: return 'Email';
    }
  };

  const isProviderConfigured = (): boolean => {
    if (!settings.fromEmail) return false;
    
    switch (settings.provider) {
      case 'sendgrid':
        return !!settings.sendgrid.apiKey;
      case 'resend':
        return !!settings.resend.apiKey;
      case 'smtp':
        return !!(settings.smtp.host && settings.smtp.username);
      default:
        return false;
    }
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
          <Mail className="h-6 w-6 text-blue-600" />
          <div>
            <CardTitle>Email Integration</CardTitle>
            <CardDescription>
              Configure email sending via SendGrid, Resend, or custom SMTP
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enabled">Enable Email Sending</Label>
            <p className="text-sm text-muted-foreground">
              Send automated emails for signups, purchases, and promotions
            </p>
          </div>
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider">Email Provider</Label>
          <Select
            value={settings.provider}
            onValueChange={(value: EmailProvider) => setSettings(prev => ({ ...prev, provider: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sendgrid">
                <div className="flex items-center gap-2">
                  <span>SendGrid</span>
                  <span className="text-xs text-muted-foreground">(Recommended)</span>
                </div>
              </SelectItem>
              <SelectItem value="resend">
                <div className="flex items-center gap-2">
                  <span>Resend</span>
                  <span className="text-xs text-muted-foreground">(Modern API)</span>
                </div>
              </SelectItem>
              <SelectItem value="smtp">
                <div className="flex items-center gap-2">
                  <span>Custom SMTP</span>
                  <span className="text-xs text-muted-foreground">(Advanced)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.provider === 'sendgrid' && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Get your API key from{' '}
                <a 
                  href="https://app.sendgrid.com/settings/api_keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  SendGrid Dashboard → Settings → API Keys
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendgrid-api-key">SendGrid API Key</Label>
              <div className="relative">
                <Input
                  id="sendgrid-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="SG.xxxxxxxxxxxxxxxxxx"
                  value={settings.sendgrid.apiKey}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sendgrid: { ...prev.sendgrid, apiKey: e.target.value }
                  }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {settings.provider === 'resend' && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Get your API key from{' '}
                <a 
                  href="https://resend.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Resend Dashboard → API Keys
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend-api-key">Resend API Key</Label>
              <div className="relative">
                <Input
                  id="resend-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="re_xxxxxxxxxxxxxxxxxx"
                  value={settings.resend.apiKey}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    resend: { ...prev.resend, apiKey: e.target.value }
                  }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {settings.provider === 'smtp' && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="host">SMTP Host</Label>
                <Input
                  id="host"
                  placeholder="smtp.example.com"
                  value={settings.smtp.host}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    smtp: { ...prev.smtp, host: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">SMTP Port</Label>
                <Select
                  value={settings.smtp.port.toString()}
                  onValueChange={(value) => setSettings(prev => ({ 
                    ...prev, 
                    smtp: {
                      ...prev.smtp,
                      port: parseInt(value),
                      secure: value === '465',
                    }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 (SMTP)</SelectItem>
                    <SelectItem value="465">465 (SSL)</SelectItem>
                    <SelectItem value="587">587 (TLS)</SelectItem>
                    <SelectItem value="2525">2525 (Alternative)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="your-username"
                  value={settings.smtp.username}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    smtp: { ...prev.smtp, username: e.target.value }
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="your-password"
                    value={settings.smtp.password}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      smtp: { ...prev.smtp, password: e.target.value }
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="secure"
                checked={settings.smtp.secure}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  smtp: { ...prev.smtp, secure: checked }
                }))}
              />
              <Label htmlFor="secure">Use SSL/TLS</Label>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fromEmail">From Email *</Label>
            <Input
              id="fromEmail"
              type="email"
              placeholder="noreply@yourdomain.com"
              value={settings.fromEmail}
              onChange={(e) => setSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Must be verified with your email provider
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromName">From Name</Label>
            <Input
              id="fromName"
              placeholder="Co-Author"
              value={settings.fromName}
              onChange={(e) => setSettings(prev => ({ ...prev, fromName: e.target.value }))}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="replyToEmail">Reply-To Email (Optional)</Label>
            <Input
              id="replyToEmail"
              type="email"
              placeholder="support@yourdomain.com"
              value={settings.replyToEmail}
              onChange={(e) => setSettings(prev => ({ ...prev, replyToEmail: e.target.value }))}
            />
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-3">
          <Label>Send Test Email</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleSendTestEmail}
              disabled={isSendingTest || !testEmail || !isProviderConfigured()}
            >
              {isSendingTest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
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
            onClick={handleTestConnection}
            disabled={isTesting || !isProviderConfigured()}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <TestTube className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
        </div>

        <div className="border-t pt-4 mt-4 space-y-4">
          <div>
            <h4 className="font-medium mb-2">Domain Setup for Deliverability</h4>
            <p className="text-sm text-muted-foreground mb-3">
              To send emails from your domain with high deliverability, add these DNS records:
            </p>
            <div className="text-sm space-y-2 p-3 bg-muted/50 rounded-lg">
              <p><strong>SPF Record:</strong> Authorizes the service to send on your behalf</p>
              <p><strong>DKIM Record:</strong> Cryptographically signs your emails</p>
              <p><strong>DMARC Record:</strong> Tells servers how to handle failed auth</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {settings.provider === 'sendgrid' && 'Configure in SendGrid → Settings → Sender Authentication'}
              {settings.provider === 'resend' && 'Configure in Resend → Domains'}
              {settings.provider === 'smtp' && 'Check your email provider\'s documentation'}
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Automatic Email Triggers</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Welcome email - when a user signs up</li>
              <li>Purchase confirmation - after a successful payment</li>
              <li>Subscription activated - when a plan is activated</li>
              <li>Credits added - when credits are purchased</li>
              <li>Book completed - when all chapters are finished</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
