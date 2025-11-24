'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { SubscriptionPlan } from '@/types/subscription';

interface PlanFormData {
  name: string;
  description: string;
  bookCreditsPerMonth: number;
  wordCreditsPerMonth: number;
  price: number;
  currency: string;
  isActive: boolean;
  allowCreditRollover: boolean;
}

export function SubscriptionPlanManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<string>('USD');
  const { toast } = useToast();

  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    description: '',
    bookCreditsPerMonth: 0,
    wordCreditsPerMonth: 0,
    price: 0,
    currency: 'USD',
    isActive: true,
    allowCreditRollover: true,
  });

  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const [plansResponse, currenciesResponse] = await Promise.all([
        fetch('/api/admin/subscription-plans', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/currencies', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!plansResponse.ok) throw new Error('Failed to load subscription plans');

      const plansData = await plansResponse.json();
      setPlans(plansData);
      
      if (currenciesResponse.ok) {
        const currenciesData = await currenciesResponse.json();
        const defaultCurr = currenciesData.currencies?.find((c: any) => c.isDefault);
        if (defaultCurr) {
          setDefaultCurrency(defaultCurr.code);
        }
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
    loadPlans();
  }, []);

  const handleOpenDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        bookCreditsPerMonth: plan.bookCreditsPerMonth,
        wordCreditsPerMonth: plan.wordCreditsPerMonth,
        price: plan.price,
        currency: plan.currency,
        isActive: plan.isActive,
        allowCreditRollover: plan.allowCreditRollover ?? true,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        description: '',
        bookCreditsPerMonth: 0,
        wordCreditsPerMonth: 0,
        price: 0,
        currency: defaultCurrency,
        isActive: true,
        allowCreditRollover: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.price < 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const url = '/api/admin/subscription-plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const body = editingPlan 
        ? { id: editingPlan.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Failed to ${editingPlan ? 'update' : 'create'} plan`);

      toast({
        title: 'Success',
        description: `Subscription plan ${editingPlan ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      loadPlans();
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

  const handleDelete = async () => {
    if (!deletePlanId) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/subscription-plans?id=${deletePlanId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete plan');

      toast({
        title: 'Success',
        description: 'Subscription plan deleted successfully',
      });

      setDeletePlanId(null);
      loadPlans();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/subscription-plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: plan.id,
          isActive: !plan.isActive,
        }),
      });

      if (!response.ok) throw new Error('Failed to update plan');

      toast({
        title: 'Success',
        description: `Plan ${!plan.isActive ? 'activated' : 'deactivated'} successfully`,
      });

      loadPlans();
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>
                Create and manage subscription plans with monthly credits
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subscription plans found</p>
            ) : (
              <div className="rounded-md border">
                <div className="grid grid-cols-7 gap-4 border-b bg-muted/50 p-3 text-sm font-medium">
                  <div>Name</div>
                  <div>Book Credits</div>
                  <div>Word Credits</div>
                  <div>Price</div>
                  <div>Currency</div>
                  <div>Status</div>
                  <div className="text-right">Actions</div>
                </div>
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="grid grid-cols-7 gap-4 border-b p-3 text-sm last:border-0"
                  >
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      {plan.description && (
                        <div className="text-xs text-muted-foreground">{plan.description}</div>
                      )}
                      <div className="text-xs mt-1">
                        {(plan.allowCreditRollover ?? true) ? (
                          <span className="text-blue-600">✓ Credit rollover enabled</span>
                        ) : (
                          <span className="text-orange-600">✗ No credit rollover</span>
                        )}
                      </div>
                    </div>
                    <div>{plan.bookCreditsPerMonth.toLocaleString()}</div>
                    <div>{plan.wordCreditsPerMonth.toLocaleString()}</div>
                    <div>{plan.price.toFixed(2)}</div>
                    <div>{plan.currency}</div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.isActive}
                        onCheckedChange={() => handleToggleActive(plan)}
                      />
                      <span className="text-xs">
                        {plan.isActive ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-muted-foreground">Inactive</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletePlanId(plan.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
            </DialogTitle>
            <DialogDescription>
              Set the monthly credits and pricing for this plan
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Plan Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Professional Plan"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the plan"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bookCredits">Book Credits per Month*</Label>
                <Input
                  id="bookCredits"
                  type="number"
                  value={formData.bookCreditsPerMonth}
                  onChange={(e) => setFormData({ ...formData, bookCreditsPerMonth: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 5"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wordCredits">Word Credits per Month*</Label>
                <Input
                  id="wordCredits"
                  type="number"
                  value={formData.wordCreditsPerMonth}
                  onChange={(e) => setFormData({ ...formData, wordCreditsPerMonth: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 100000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price*</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 29.99"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency*</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="e.g., USD"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="allowCreditRollover"
                checked={formData.allowCreditRollover}
                onCheckedChange={(checked) => setFormData({ ...formData, allowCreditRollover: checked })}
              />
              <Label htmlFor="allowCreditRollover">
                Allow Credit Rollover
                <span className="block text-xs text-muted-foreground font-normal">
                  When enabled, addon and admin credits will carry over when users renew this plan
                </span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingPlan ? 'Update' : 'Create'} Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this subscription plan. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
