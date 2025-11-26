'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Trash2, Info, Clock, Zap, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { CacheSettings as CacheSettingsType } from '@/lib/definitions';

const INTERVAL_OPTIONS = [
  { value: '5', label: '5 minutes', description: 'Very aggressive - may impact performance' },
  { value: '15', label: '15 minutes', description: 'Aggressive - for high activity apps' },
  { value: '30', label: '30 minutes', description: 'Recommended - good balance' },
  { value: '60', label: '1 hour', description: 'Standard - works for most apps' },
  { value: '120', label: '2 hours', description: 'Conservative - less frequent clearing' },
  { value: '360', label: '6 hours', description: 'Minimal - only for stable environments' },
  { value: '720', label: '12 hours', description: 'Rare - once per half day' },
  { value: '1440', label: '24 hours', description: 'Daily - once per day' },
];

export function CacheSettingsManager() {
  const [settings, setSettings] = useState<CacheSettingsType>({
    enabled: false,
    intervalMinutes: 30,
    clearOnAIError: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      if (data.cacheSettings) {
        setSettings(data.cacheSettings);
      }
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
          cacheSettings: settings,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast({
        title: 'Success',
        description: 'Cache settings saved successfully',
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

  const handleClearCacheNow = async () => {
    setIsClearing(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to clear cache');

      toast({
        title: 'Cache Cleared',
        description: 'Application cache has been cleared successfully',
      });

      loadSettings();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const getRecommendation = (intervalMinutes: number) => {
    if (intervalMinutes <= 15) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        message: 'Very frequent cache clearing may increase API calls and slow down the app. Only use if you experience frequent AI errors.',
      };
    } else if (intervalMinutes <= 60) {
      return {
        icon: Zap,
        color: 'text-green-600',
        message: 'This is a good balance between keeping data fresh and maintaining performance.',
      };
    } else {
      return {
        icon: Clock,
        color: 'text-blue-600',
        message: 'Less frequent clearing is better for performance but stale data may persist longer.',
      };
    }
  };

  const recommendation = getRecommendation(settings.intervalMinutes);
  const RecommendationIcon = recommendation.icon;

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Configure automatic cache clearing to prevent stale data issues with AI operations.
            Cache clearing helps ensure fresh API responses and prevents errors from outdated data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cache-enabled">Enable Auto Cache Clearing</Label>
              <p className="text-sm text-muted-foreground">
                Automatically clear application cache at regular intervals
              </p>
            </div>
            <Switch
              id="cache-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>

          {settings.enabled && (
            <>
              <div className="space-y-3">
                <Label htmlFor="cache-interval">Cache Clear Interval</Label>
                <Select
                  value={settings.intervalMinutes.toString()}
                  onValueChange={(value) =>
                    setSettings({ ...settings, intervalMinutes: parseInt(value) })
                  }
                >
                  <SelectTrigger id="cache-interval">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Alert>
                  <RecommendationIcon className={`h-4 w-4 ${recommendation.color}`} />
                  <AlertTitle>Recommendation</AlertTitle>
                  <AlertDescription>{recommendation.message}</AlertDescription>
                </Alert>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="clear-on-error">Clear Cache on AI Errors</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically clear cache when AI operations fail
                  </p>
                </div>
                <Switch
                  id="clear-on-error"
                  checked={settings.clearOnAIError}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, clearOnAIError: checked })
                  }
                />
              </div>
            </>
          )}

          {settings.lastCleared && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm">
                <span className="font-medium">Last cache clear:</span>{' '}
                {new Date(settings.lastCleared).toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
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

            <Button
              variant="outline"
              onClick={handleClearCacheNow}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Cache Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Optimal Settings Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-green-600 mb-2">Recommended: 30-60 minutes</h4>
                <p className="text-muted-foreground">
                  Best for most applications. Provides a good balance between keeping data fresh
                  and maintaining optimal performance. Users won&apos;t notice cache clearing,
                  and AI operations will work smoothly.
                </p>
              </div>
              
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-yellow-600 mb-2">Aggressive: 5-15 minutes</h4>
                <p className="text-muted-foreground">
                  Use only if you experience frequent AI errors or stale data issues.
                  This may increase API calls and slightly impact performance during cache clearing.
                </p>
              </div>
              
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-blue-600 mb-2">Conservative: 2-6 hours</h4>
                <p className="text-muted-foreground">
                  Good for stable environments with fewer users. Minimizes overhead but
                  may occasionally show stale data. Use &quot;Clear on AI Error&quot; option as a safety net.
                </p>
              </div>
              
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold text-purple-600 mb-2">Clear on AI Error</h4>
                <p className="text-muted-foreground">
                  We recommend keeping this enabled. When AI operations fail, clearing the cache
                  often resolves the issue by ensuring fresh data is fetched on retry.
                </p>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>What gets cleared?</AlertTitle>
              <AlertDescription>
                Cache clearing resets SWR data cache, local state, and triggers re-fetching of
                AI-related data. User data stored in Firebase is never affected.
                This only clears temporary client-side caches.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
