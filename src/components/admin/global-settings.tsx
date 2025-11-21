'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { AdminSettings } from '@/lib/definitions';

export function GlobalSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      setSettings(data);
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

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          useAdminKeys: settings.useAdminKeys,
          allowUserKeys: settings.allowUserKeys,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });

      loadSettings();
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

  if (isLoading || !settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Settings</CardTitle>
        <CardDescription>
          Configure how the application handles API keys
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Use Admin API Keys</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, the application will use admin-managed API keys for all AI operations
            </p>
          </div>
          <Switch
            checked={settings.useAdminKeys}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, useAdminKeys: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Allow User API Keys</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, users can provide their own API keys (if admin keys are disabled or as fallback)
            </p>
          </div>
          <Switch
            checked={settings.allowUserKeys}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, allowUserKeys: checked })
            }
          />
        </div>

        <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
