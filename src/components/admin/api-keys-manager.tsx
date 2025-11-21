'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { AdminAPIKey, AIProvider } from '@/lib/definitions';

export function APIKeysManager() {
  const [apiKeys, setApiKeys] = useState<AdminAPIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  const loadAPIKeys = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/api-keys', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load API keys');

      const data = await response.json();
      setApiKeys(data);
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
    loadAPIKeys();
  }, []);

  const handleTestAPIKey = async () => {
    if (!apiKey) {
      toast({
        title: 'Error',
        description: 'API key is required',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/api-keys/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider, apiKey, model: model || undefined }),
      });

      if (response.status === 401) {
        toast({
          title: 'Session Expired',
          description: 'Your admin session has expired. Please log in again.',
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: data.message || 'API key is valid and working',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.error || 'Failed to connect to AI provider',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to test API key',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAPIKey = async () => {
    if (!apiKey) {
      toast({
        title: 'Error',
        description: 'API key is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider, apiKey, model: model || undefined }),
      });

      if (!response.ok) throw new Error('Failed to save API key');

      toast({
        title: 'Success',
        description: 'API key saved successfully',
      });

      setApiKey('');
      setModel('');
      setShowForm(false);
      loadAPIKeys();
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

  const handleDeleteAPIKey = async (keyId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/api-keys?id=${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      toast({
        title: 'Success',
        description: 'API key deleted successfully',
      });

      loadAPIKeys();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleAPIKey = async (keyId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/api-keys', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keyId, isActive }),
      });

      if (!response.ok) throw new Error('Failed to toggle API key');

      toast({
        title: 'Success',
        description: `API key ${isActive ? 'enabled' : 'disabled'} successfully`,
      });

      loadAPIKeys();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage API keys for different AI providers</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Add API Key
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Default Model (Optional)</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={
                  provider === 'gemini'
                    ? 'e.g., googleai/gemini-2.5-flash'
                    : provider === 'openai'
                    ? 'e.g., openai/gpt-4o, openai/gpt-4o-mini'
                    : provider === 'claude'
                    ? 'Claude not yet implemented'
                    : 'Enter model name'
                }
              />
              <p className="text-xs text-muted-foreground">
                For reference only. Configure actual model routing in the AI Function Routing section below.
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleTestAPIKey} 
                disabled={isTesting || !apiKey}
                variant="secondary"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              <Button onClick={handleSaveAPIKey} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save API Key'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys configured</p>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1">
                  <p className="font-medium capitalize">{key.provider}</p>
                  <p className="text-sm text-muted-foreground">
                    {key.apiKey} {key.model && `• ${key.model}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Switch
                    checked={key.isActive}
                    onCheckedChange={(checked) => handleToggleAPIKey(key.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAPIKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
