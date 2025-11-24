'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, RefreshCw } from 'lucide-react';
import type { CurrencySettings, CurrencyConversionRate, SupportedCurrency } from '@/types/subscription';

export function CurrencySettingsManager() {
  const [currencies, setCurrencies] = useState<CurrencySettings[]>([]);
  const [conversionRates, setConversionRates] = useState<CurrencyConversionRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [rateInputs, setRateInputs] = useState<Record<string, string>>({
    'USD-BDT': '125',
    'BDT-USD': '0.008',
  });

  const loadData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const [currenciesRes, ratesRes] = await Promise.all([
        fetch('/api/admin/currencies', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/currencies/conversion-rates', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!currenciesRes.ok || !ratesRes.ok) {
        throw new Error('Failed to load currency data');
      }

      const currenciesData = await currenciesRes.json();
      const ratesData = await ratesRes.json();

      setCurrencies(currenciesData.currencies || []);
      setConversionRates(ratesData.rates || []);

      const rateMap: Record<string, string> = {};
      ratesData.rates.forEach((rate: CurrencyConversionRate) => {
        rateMap[`${rate.fromCurrency}-${rate.toCurrency}`] = rate.rate.toString();
      });
      setRateInputs(rateMap);
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
    loadData();
  }, []);

  const handleToggleEnabled = async (currencyId: string, currentStatus: boolean) => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('adminToken');

      const response = await fetch(`/api/admin/currencies/${currencyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isEnabled: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update currency');
      }

      toast({
        title: 'Success',
        description: 'Currency status updated successfully',
      });

      await loadData();
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

  const handleSetDefault = async (currencyId: string) => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('adminToken');

      const response = await fetch(`/api/admin/currencies/${currencyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isDefault: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default currency');
      }

      toast({
        title: 'Success',
        description: 'Default currency updated successfully',
      });

      await loadData();
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

  const handleUpdateConversionRate = async (fromCurrency: SupportedCurrency, toCurrency: SupportedCurrency) => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('adminToken');
      const rateKey = `${fromCurrency}-${toCurrency}`;
      const rate = parseFloat(rateInputs[rateKey] || '0');

      if (rate <= 0) {
        throw new Error('Conversion rate must be greater than 0');
      }

      const response = await fetch('/api/admin/currencies/conversion-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          rate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update conversion rate');
      }

      toast({
        title: 'Success',
        description: `Conversion rate updated: 1 ${fromCurrency} = ${rate} ${toCurrency}`,
      });

      await loadData();
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

  const getDefaultCurrency = () => {
    return currencies.find(c => c.isDefault);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Management
          </CardTitle>
          <CardDescription>
            Configure which currencies are available across the app and set conversion rates for payment processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Available Currencies</h3>
            <div className="space-y-4">
              {currencies.map((currency) => (
                <div
                  key={currency.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currency.symbol}</span>
                      <div>
                        <p className="font-semibold">{currency.name}</p>
                        <p className="text-sm text-muted-foreground">{currency.code}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`enabled-${currency.id}`}>Enabled</Label>
                      <Switch
                        id={`enabled-${currency.id}`}
                        checked={currency.isEnabled}
                        onCheckedChange={() => handleToggleEnabled(currency.id, currency.isEnabled)}
                        disabled={isSaving}
                      />
                    </div>

                    {currency.isEnabled && (
                      <Button
                        variant={currency.isDefault ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSetDefault(currency.id)}
                        disabled={isSaving || currency.isDefault}
                      >
                        {currency.isDefault ? 'Default Currency' : 'Set as Default'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {getDefaultCurrency() && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm">
                  <strong>Default Currency:</strong> All subscription plans, addon plans, and coupon codes will use{' '}
                  <strong>{getDefaultCurrency()?.name} ({getDefaultCurrency()?.code})</strong> as the default currency.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Currency Conversion Rates
          </CardTitle>
          <CardDescription>
            Set conversion rates for payment processing. Uddoktapay requires BDT for local payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="usd-to-bdt">1 USD = ? BDT</Label>
                  <Input
                    id="usd-to-bdt"
                    type="number"
                    step="0.01"
                    value={rateInputs['USD-BDT'] || ''}
                    onChange={(e) =>
                      setRateInputs((prev) => ({ ...prev, 'USD-BDT': e.target.value }))
                    }
                    placeholder="125.00"
                    disabled={isSaving}
                  />
                </div>
                <Button
                  onClick={() => handleUpdateConversionRate('USD', 'BDT')}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                </Button>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="bdt-to-usd">1 BDT = ? USD</Label>
                  <Input
                    id="bdt-to-usd"
                    type="number"
                    step="0.0001"
                    value={rateInputs['BDT-USD'] || ''}
                    onChange={(e) =>
                      setRateInputs((prev) => ({ ...prev, 'BDT-USD': e.target.value }))
                    }
                    placeholder="0.008"
                    disabled={isSaving}
                  />
                </div>
                <Button
                  onClick={() => handleUpdateConversionRate('BDT', 'USD')}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-semibold mb-2">Important Notes:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>
                Uddoktapay (Bangladesh payment gateway) only accepts payments in BDT (Bangladeshi Taka)
              </li>
              <li>
                When users pay via Uddoktapay, amounts will be automatically converted to BDT using the rate above
              </li>
              <li>
                Keep conversion rates updated to ensure accurate pricing for international users
              </li>
              <li>
                Current exchange rate (Nov 2025): 1 USD ≈ ৳122-125 BDT
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
