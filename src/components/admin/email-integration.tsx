'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, TestTube, CheckCircle2, XCircle, Eye, EyeOff, Send } from 'lucide-react';

interface SMTPSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
}

export function EmailIntegration() {
  const [settings, setSettings] = useState<SMTPSettings>({
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    replyToEmail: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
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
        host: data.host || '',
        port: data.port || 587,
        secure: data.secure || false,
        username: data.username || '',
        password: data.password || '',
        fromEmail: data.fromEmail || '',
        fromName: data.fromName || '',
        replyToEmail: data.replyToEmail || '',
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
          message: 'SMTP connection successful!',
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
            <CardTitle>Email Marketing (SMTP)</CardTitle>
            <CardDescription>
              Configure SMTP settings to send transactional and marketing emails
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP Host</Label>
            <Input
              id="host"
              placeholder="smtp.example.com"
              value={settings.host}
              onChange={(e) => setSettings(prev => ({ ...prev, host: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">SMTP Port</Label>
            <Select
              value={settings.port.toString()}
              onValueChange={(value) => setSettings(prev => ({ 
                ...prev, 
                port: parseInt(value),
                secure: value === '465',
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
              value={settings.username}
              onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="your-password"
                value={settings.password}
                onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fromEmail">From Email</Label>
            <Input
              id="fromEmail"
              type="email"
              placeholder="noreply@example.com"
              value={settings.fromEmail}
              onChange={(e) => setSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
            />
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
              placeholder="support@example.com"
              value={settings.replyToEmail}
              onChange={(e) => setSettings(prev => ({ ...prev, replyToEmail: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              If set, replies will go to this address instead of the From email
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="secure"
            checked={settings.secure}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, secure: checked }))}
          />
          <Label htmlFor="secure">Use SSL/TLS</Label>
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
              disabled={isSendingTest || !testEmail}
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
            disabled={isTesting || !settings.host || !settings.username}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <TestTube className="mr-2 h-4 w-4" />
            Test Connection
          </Button>
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-2">Automatic Email Triggers</h4>
          <p className="text-sm text-muted-foreground mb-3">
            The following emails are sent automatically when enabled:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Welcome email - when a user signs up</li>
            <li>Purchase confirmation - after a successful payment</li>
            <li>Subscription activated - when a plan is activated</li>
            <li>Credits added - when credits are purchased</li>
            <li>Book completed - when all chapters are finished</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
