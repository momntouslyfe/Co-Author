'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, TestTube2 } from 'lucide-react';
import type { TrialSettings as TrialSettingsType } from '@/lib/definitions';

const DEFAULT_TRIAL_SETTINGS: TrialSettingsType = {
  enabled: false,
  durationDays: 7,
  offerCreditsAmount: 1,
  enableCoMarketer: true,
  enableCoWriter: true,
};

export function TrialSettings() {
  const [settings, setSettings] = useState<TrialSettingsType>(DEFAULT_TRIAL_SETTINGS);
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
      setSettings(data.trialSettings || DEFAULT_TRIAL_SETTINGS);
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
    if (settings.enabled && settings.durationDays < 1) {
      toast({
        title: 'Validation Error',
        description: 'Trial duration must be at least 1 day',
        variant: 'destructive',
      });
      return;
    }

    if (settings.enabled && settings.offerCreditsAmount < 0) {
      toast({
        title: 'Validation Error',
        description: 'Offer credits cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    if (settings.enabled && !settings.enableCoMarketer && !settings.enableCoWriter) {
      toast({
        title: 'Validation Error',
        description: 'At least one feature must be enabled for trial',
        variant: 'destructive',
      });
      return;
    }

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
          trialSettings: settings,
        }),
      });

      if (!response.ok) throw new Error('Failed to save trial settings');

      toast({
        title: 'Success',
        description: 'Trial settings saved successfully',
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

  if (isLoading) {
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
        <div className="flex items-center gap-2">
          <TestTube2 className="h-5 w-5" />
          <CardTitle>Trial Settings</CardTitle>
        </div>
        <CardDescription>
          Configure trial access for users without qualifying subscription plans. 
          Trial unlocks premium features temporarily - users still use their own credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Trial</Label>
            <p className="text-sm text-muted-foreground">
              Allow users to try premium features before subscribing
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, enabled: checked })
            }
          />
        </div>

        {settings.enabled && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationDays">Trial Duration (Days)</Label>
                <Input
                  id="durationDays"
                  type="number"
                  min={1}
                  max={90}
                  value={settings.durationDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      durationDays: parseInt(e.target.value) || 1,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  How long the trial lasts (1-90 days)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offerCredits">Trial Offer Credits</Label>
                <Input
                  id="offerCredits"
                  type="number"
                  min={0}
                  max={100}
                  value={settings.offerCreditsAmount}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      offerCreditsAmount: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Offer credits given during trial (expire when trial ends)
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="font-medium">Trial Features</h4>
              <p className="text-sm text-muted-foreground">
                Select which premium features are unlocked during trial
              </p>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Co-Marketer Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Create offers, funnels, and marketing content
                  </p>
                </div>
                <Switch
                  checked={settings.enableCoMarketer}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableCoMarketer: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Co-Writer Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate content ideas and write marketing content
                  </p>
                </div>
                <Switch
                  checked={settings.enableCoWriter}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableCoWriter: checked })
                  }
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Trial Rules</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Each user can only use trial once (lifetime limit)</li>
                <li>Trial offer credits expire when trial period ends</li>
                <li>Users consume their own credits during trial</li>
                <li>Trial only unlocks features, does not provide free usage</li>
              </ul>
            </div>
          </>
        )}

        <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Trial Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
