'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gift } from 'lucide-react';
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
import type { CreditTypeCategory } from '@/types/subscription';

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
}

interface AllocationFormData {
  userId: string;
  creditType: CreditTypeCategory;
  amount: number;
  description: string;
}

export function CreditAllocator() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<AllocationFormData>({
    userId: '',
    creditType: 'words',
    amount: 0,
    description: '',
  });

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load users');

      const data = await response.json();
      setUsers(data);
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
    loadUsers();
  }, []);

  const handleOpenDialog = () => {
    setFormData({
      userId: '',
      creditType: 'words',
      amount: 0,
      description: '',
    });
    setIsDialogOpen(true);
  };

  const handleAllocate = async () => {
    if (!formData.userId || formData.amount <= 0 || !formData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields with valid values',
        variant: 'destructive',
      });
      return;
    }

    setIsAllocating(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/allocate-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to allocate credits');
      }

      const selectedUser = users.find(u => u.id === formData.userId);
      toast({
        title: 'Success',
        description: `Successfully allocated ${formData.amount} ${formData.creditType} credits to ${selectedUser?.email}`,
      });

      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsAllocating(false);
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
              <CardTitle>Allocate Credits to Users</CardTitle>
              <CardDescription>
                Manually grant additional credits to specific users
              </CardDescription>
            </div>
            <Button onClick={handleOpenDialog}>
              <Gift className="mr-2 h-4 w-4" />
              Allocate Credits
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Use this feature to manually allocate additional word or book creation credits to users.
            This is useful for promotions, compensations, or special cases.
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Allocate Credits to User</DialogTitle>
            <DialogDescription>
              Grant additional credits to a specific user
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user">Select User*</Label>
              <Select
                value={formData.userId}
                onValueChange={(value) => setFormData({ ...formData, userId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} ({user.displayName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creditType">Credit Type*</Label>
              <Select
                value={formData.creditType}
                onValueChange={(value: CreditTypeCategory) => setFormData({ ...formData, creditType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="words">Word Credits</SelectItem>
                  <SelectItem value="books">Book Creation Credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount*</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 10000"
              />
              <p className="text-xs text-muted-foreground">
                Number of {formData.creditType} credits to allocate
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description/Reason*</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Promotional bonus, Compensation for issue, etc."
              />
              <p className="text-xs text-muted-foreground">
                Explain why credits are being allocated (for audit purposes)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAllocate} disabled={isAllocating}>
              {isAllocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Allocate Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
