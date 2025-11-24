'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react';
import type { Coupon, CreateCouponInput, UpdateCouponInput, CouponCategory, CouponDiscountType } from '@/types/subscription';

interface CouponFormData {
  code: string;
  category: CouponCategory;
  discountType: CouponDiscountType;
  discountValue: number;
  maxUsesPerUser: number;
  validFrom: string;
  validUntil: string;
  specificUserId: string;
  affiliateId: string;
  isActive: boolean;
  description: string;
}

const initialFormData: CouponFormData = {
  code: '',
  category: 'promotional',
  discountType: 'percentage',
  discountValue: 0,
  maxUsesPerUser: 1,
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  specificUserId: '',
  affiliateId: '',
  isActive: true,
  description: '',
};

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/coupons', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load coupons');
      }

      const data = await response.json();
      setCoupons(data.coupons);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load coupons',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.discountValue) {
      toast({
        title: 'Validation Error',
        description: 'Code and discount value are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('adminToken');
      
      const payload: CreateCouponInput | UpdateCouponInput = {
        code: formData.code,
        category: formData.category,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        maxUsesPerUser: formData.maxUsesPerUser,
        validFrom: new Date(formData.validFrom),
        validUntil: new Date(formData.validUntil),
        specificUserId: formData.specificUserId || undefined,
        affiliateId: formData.affiliateId || undefined,
        isActive: formData.isActive,
        description: formData.description,
      };

      const url = editingCoupon 
        ? `/api/admin/coupons/${editingCoupon.id}`
        : '/api/admin/coupons';
      
      const method = editingCoupon ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save coupon');
      }

      toast({
        title: 'Success',
        description: `Coupon ${editingCoupon ? 'updated' : 'created'} successfully`,
      });

      setDialogOpen(false);
      setFormData(initialFormData);
      setEditingCoupon(null);
      loadCoupons();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      category: coupon.category,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUsesPerUser: coupon.maxUsesPerUser,
      validFrom: convertTimestampToDate(coupon.validFrom).toISOString().split('T')[0],
      validUntil: convertTimestampToDate(coupon.validUntil).toISOString().split('T')[0],
      specificUserId: coupon.specificUserId || '',
      affiliateId: coupon.affiliateId || '',
      isActive: coupon.isActive,
      description: coupon.description || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (couponId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete coupon');
      }

      toast({
        title: 'Success',
        description: 'Coupon deleted successfully',
      });

      loadCoupons();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete coupon',
        variant: 'destructive',
      });
    }
  };

  const convertTimestampToDate = (timestamp: any): Date => {
    // Handle Firebase Timestamp object with _seconds and _nanoseconds
    if (timestamp && typeof timestamp === 'object') {
      if ('_seconds' in timestamp) {
        return new Date(timestamp._seconds * 1000);
      }
      // Handle Timestamp object with toMillis() method
      if (typeof timestamp.toMillis === 'function') {
        return new Date(timestamp.toMillis());
      }
    }
    // Handle regular Date or string
    return new Date(timestamp);
  };

  const formatDate = (timestamp: any) => {
    return convertTimestampToDate(timestamp).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Coupon Management
            </CardTitle>
            <CardDescription>
              Create and manage promotional and affiliate coupon codes
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setFormData(initialFormData);
              setEditingCoupon(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </DialogTitle>
                <DialogDescription>
                  {editingCoupon ? 'Update coupon details' : 'Create a new promotional or affiliate coupon code'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Coupon Code *</Label>
                  <Input
                    id="code"
                    placeholder="SUMMER2024"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: CouponCategory) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="affiliate">Affiliate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="discountType">Discount Type *</Label>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value: CouponDiscountType) => setFormData({ ...formData, discountType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="discountValue">
                      Discount Value * {formData.discountType === 'percentage' ? '(%)' : '(Amount)'}
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      min="0"
                      max={formData.discountType === 'percentage' ? 100 : undefined}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="maxUses">Max Uses Per User *</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min="1"
                      value={formData.maxUsesPerUser}
                      onChange={(e) => setFormData({ ...formData, maxUsesPerUser: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="validFrom">Valid From *</Label>
                    <Input
                      id="validFrom"
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="validUntil">Valid Until *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                </div>

                {formData.category === 'affiliate' && (
                  <div className="grid gap-2">
                    <Label htmlFor="affiliateId">Affiliate ID</Label>
                    <Input
                      id="affiliateId"
                      placeholder="affiliate-user-id"
                      value={formData.affiliateId}
                      onChange={(e) => setFormData({ ...formData, affiliateId: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Link this coupon to a specific affiliate user
                    </p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="specificUserId">User-Specific (Optional)</Label>
                  <Input
                    id="specificUserId"
                    placeholder="user-id"
                    value={formData.specificUserId}
                    onChange={(e) => setFormData({ ...formData, specificUserId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for all users, or enter a specific user ID to restrict usage
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Summer sale discount - 20% off all subscriptions"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setFormData(initialFormData);
                    setEditingCoupon(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingCoupon ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No coupons created yet</p>
            <p className="text-sm">Create your first coupon to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Max Uses/User</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      coupon.category === 'affiliate' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {coupon.category}
                    </span>
                  </TableCell>
                  <TableCell>
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}%` 
                      : `$${coupon.discountValue}`}
                  </TableCell>
                  <TableCell>{coupon.maxUsesPerUser}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      coupon.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete coupon <strong>{coupon.code}</strong>? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(coupon.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
