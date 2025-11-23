'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

export function PaymentSettings() {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://sandbox.uddoktapay.com');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/payment/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey, baseUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult(data);
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Test failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Uddoktapay Payment Gateway Settings</CardTitle>
          <CardDescription>
            Configure your Uddoktapay payment gateway credentials. For security, API keys should be stored in environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> To configure Uddoktapay credentials securely, set the following environment variables:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code className="text-sm bg-muted px-1 py-0.5 rounded">UDDOKTAPAY_API_KEY</code> - Your Uddoktapay API key</li>
                <li><code className="text-sm bg-muted px-1 py-0.5 rounded">UDDOKTAPAY_BASE_URL</code> - Your Uddoktapay base URL (default: https://sandbox.uddoktapay.com)</li>
              </ul>
              <p className="mt-2">Use the Replit Secrets panel to add these securely.</p>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://sandbox.uddoktapay.com"
              />
              <p className="text-sm text-muted-foreground">
                Use <code>https://sandbox.uddoktapay.com</code> for testing or your production URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (for testing)</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key to test connection"
              />
              <p className="text-sm text-muted-foreground">
                This is only used for testing. Save your actual API key in Replit Secrets.
              </p>
            </div>

            <Button
              onClick={handleTestConnection}
              disabled={testing || !apiKey || !baseUrl}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Configuration Guide</CardTitle>
          <CardDescription>
            How to set up Uddoktapay credentials in Replit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Step 1: Get Your API Key</h4>
              <p className="text-muted-foreground">
                Log in to your Uddoktapay dashboard and navigate to the API settings to get your API key.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Step 2: Add to Replit Secrets</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open the Tools panel in Replit</li>
                <li>Click on "Secrets"</li>
                <li>Add <code className="bg-muted px-1 py-0.5 rounded">UDDOKTAPAY_API_KEY</code> with your API key value</li>
                <li>Add <code className="bg-muted px-1 py-0.5 rounded">UDDOKTAPAY_BASE_URL</code> with your base URL (optional, defaults to sandbox)</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Step 3: Restart the Application</h4>
              <p className="text-muted-foreground">
                After adding the secrets, restart your application for the changes to take effect.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Sandbox vs Production</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Sandbox:</strong> https://sandbox.uddoktapay.com (for testing)</li>
                <li><strong>Production:</strong> Your custom domain (e.g., https://pay.yourdomain.com)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
