'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { AdminSettings, AIFunction, AIProvider, AIRouting } from '@/lib/definitions';
import { getModelsForProvider, getDefaultModel } from '@/lib/ai-models';

const AI_FUNCTIONS: { value: AIFunction; label: string }[] = [
  { value: 'research', label: 'Topic Research' },
  { value: 'blueprint', label: 'Blueprint Generation' },
  { value: 'title', label: 'Title Generation' },
  { value: 'chapter', label: 'Chapter Generation' },
  { value: 'rewrite', label: 'Content Rewriting' },
  { value: 'expand', label: 'Content Expansion' },
  { value: 'style_analysis', label: 'Style Analysis' },
];

const AI_PROVIDERS: { value: AIProvider; label: string }[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude (Anthropic)' },
];

export function AIRoutingManager() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [routing, setRouting] = useState<Record<AIFunction, { provider: AIProvider; model?: string }>>({} as any);
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

      const routingMap: Partial<Record<AIFunction, { provider: AIProvider; model?: string }>> = {};
      data.aiRouting?.forEach((r: AIRouting) => {
        routingMap[r.functionName as AIFunction] = { 
          provider: r.provider,
          model: r.model 
        };
      });
      setRouting(routingMap as Record<AIFunction, { provider: AIProvider; model?: string }>);
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

  const handleSaveRouting = async () => {
    setIsSaving(true);

    try {
      const aiRouting = Object.entries(routing).map(([functionName, config]) => ({
        functionName: functionName as AIFunction,
        provider: config.provider,
        model: config.model,
      }));

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ aiRouting }),
      });

      if (!response.ok) throw new Error('Failed to save routing');

      toast({
        title: 'Success',
        description: 'AI routing configuration saved successfully',
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
        <CardTitle>AI Function Routing</CardTitle>
        <CardDescription>
          Configure which AI provider to use for each function
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {AI_FUNCTIONS.map((func) => {
          const currentProvider = routing[func.value]?.provider || 'gemini';
          const currentModel = routing[func.value]?.model || '';
          
          return (
            <div key={func.value} className="space-y-3 rounded-lg border p-4">
              <Label className="text-base font-semibold">{func.label}</Label>
              
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">AI Provider</Label>
                  <Select
                    value={currentProvider}
                    onValueChange={(v) => {
                      const newProvider = v as AIProvider;
                      setRouting({ 
                        ...routing, 
                        [func.value]: { 
                          provider: newProvider,
                          model: getDefaultModel(newProvider)
                        }
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Model</Label>
                  {(currentModel === 'custom' || (currentModel && currentModel !== '' && !getModelsForProvider(currentProvider).find(m => m.value === currentModel && m.value !== 'custom'))) ? (
                    <div className="space-y-2">
                      <Input
                        value={currentModel === 'custom' ? '' : currentModel}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRouting({ 
                          ...routing, 
                          [func.value]: { 
                            provider: currentProvider,
                            model: e.target.value || 'custom'
                          }
                        })}
                        placeholder={`Enter custom ${currentProvider} model`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRouting({ 
                          ...routing, 
                          [func.value]: { 
                            provider: currentProvider,
                            model: ''
                          }
                        })}
                      >
                        Back to model selection
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={currentModel}
                      onValueChange={(v) => setRouting({ 
                        ...routing, 
                        [func.value]: { 
                          provider: currentProvider,
                          model: v
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${currentProvider} model or enter custom`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {getModelsForProvider(currentProvider).map((modelOption) => (
                          <SelectItem key={modelOption.value} value={modelOption.value}>
                            {modelOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <Button onClick={handleSaveRouting} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Routing Configuration
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
