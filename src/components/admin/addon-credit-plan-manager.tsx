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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { AddonCreditPlan, AddonCreditType } from '@/types/subscription';

interface PlanFormData {
  type: AddonCreditType;
  name: string;
  description: string;
  creditAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
}

export function AddonCreditPlanManager() {
  const [plans, setPlans] = useState<AddonCreditPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AddonCreditPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<string>('USD');
  const { toast } = useToast();

  const [formData, setFormData] = useState<PlanFormData>({
    type: 'words',
    name: '',
    description: '',
    creditAmount: 0,
    price: 0,
    currency: 'USD',
    isActive: true,
  });

  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const [plansResponse, currenciesResponse] = await Promise.all([
        fetch('/api/admin/addon-credit-plans', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/currencies', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!plansResponse.ok) throw new Error('Failed to load addon credit plans');

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

  const handleOpenDialog = (plan?: AddonCreditPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        type: plan.type,
        name: plan.name,
        description: plan.description || '',
        creditAmount: plan.creditAmount,
        price: plan.price,
        currency: plan.currency,
        isActive: plan.isActive,
      });
    } else {
      setEditingPlan(null);
      setFormData({
        type: 'words',
        name: '',
        description: '',
        creditAmount: 0,
        price: 0,
        currency: defaultCurrency,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || formData.price < 0 || formData.creditAmount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields with valid values',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const url = '/api/admin/addon-credit-plans';
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

      if (!response.ok) throw new Error(`Failed to ${editingPlan ? 'update' : 'create'} addon plan`);

      toast({
        title: 'Success',
        description: `Addon credit plan ${editingPlan ? 'updated' : 'created'} successfully`,
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
      const response = await fetch(`/api/admin/addon-credit-plans?id=${deletePlanId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete addon plan');

      toast({
        title: 'Success',
        description: 'Addon credit plan deleted successfully',
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

  const handleToggleActive = async (plan: AddonCreditPlan) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/addon-credit-plans', {
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

      if (!response.ok) throw new Error('Failed to update addon plan');

      toast({
        title: 'Success',
        description: `Addon plan ${!plan.isActive ? 'activated' : 'deactivated'} successfully`,
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

  const wordPlans = plans.filter(p => p.type === 'words');
  const bookPlans = plans.filter(p => p.type === 'books');
  const offerPlans = plans.filter(p => p.type === 'offers');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const renderPlanTable = (planList: AddonCreditPlan[], type: string) => (
    <div className="space-y-3">
      {planList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {type} credit plans found</p>
      ) : (
        <div className="space-y-3">
          {planList.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{plan.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{plan.price.toFixed(2)} {plan.currency}</p>
                  <p className="text-sm text-muted-foreground">{plan.creditAmount.toLocaleString()} credits</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plan.isActive}
                    onCheckedChange={() => handleToggleActive(plan)}
                  />
                  <span className="text-sm">{plan.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(plan)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletePlanId(plan.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Word Credit Plans</CardTitle>
                <CardDescription>
                  Manage purchasable word credit packages
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderPlanTable(wordPlans, 'word')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Book Creation Credit Plans</CardTitle>
            <CardDescription>
              Manage purchasable book creation credit packages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderPlanTable(bookPlans, 'book')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offer Creation Credit Plans</CardTitle>
            <CardDescription>
              Manage purchasable offer creation credit packages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderPlanTable(offerPlans, 'offer')}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Edit Addon Credit Plan' : 'Create Addon Credit Plan'}
            </DialogTitle>
            <DialogDescription>
              Create purchasable credit packages for users
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Credit Type*</Label>
              <Select
                value={formData.type}
                onValueChange={(value: AddonCreditType) => setFormData({ ...formData, type: value })}
                disabled={!!editingPlan}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="words">Word Credits</SelectItem>
                  <SelectItem value="books">Book Creation Credits</SelectItem>
                  <SelectItem value="offers">Offer Creation Credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Plan Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 50,000 Words Pack"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the credit pack"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditAmount">
                {formData.type === 'words' ? 'Word Credits' : formData.type === 'books' ? 'Book Creation Credits' : 'Offer Creation Credits'}*
              </Label>
              <Input
                id="creditAmount"
                type="number"
                value={formData.creditAmount}
                onChange={(e) => setFormData({ ...formData, creditAmount: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 50000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price*</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 9.99"
                  className="flex-1"
                />
                <div className="flex items-center gap-1 px-3 py-2 border rounded-md bg-muted text-sm font-medium min-w-[80px]">
                  <span>{defaultCurrency}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Using system default currency. Change it in the Currency Settings tab.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
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
              This will permanently delete this addon credit plan. This action cannot be undone.
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
