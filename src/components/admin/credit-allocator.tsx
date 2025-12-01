'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gift, Search, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState<AllocationFormData>({
    userId: '',
    creditType: 'words',
    amount: 0,
    description: '',
  });

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const query = userSearchQuery.toLowerCase().trim();
    return users.filter(user =>
      user.email.toLowerCase().includes(query) ||
      user.displayName.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  const selectedUser = useMemo(() => {
    return users.find(u => u.id === formData.userId);
  }, [users, formData.userId]);

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
    setUserSearchQuery('');
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
            Use this feature to manually allocate additional word, book, or offer creation credits to users.
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
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className="justify-between font-normal"
                  >
                    {selectedUser ? (
                      <span className="truncate">
                        {selectedUser.email} ({selectedUser.displayName})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Search and select a user...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by email or name..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-[250px]">
                    {filteredUsers.length === 0 ? (
                      <p className="p-4 text-sm text-center text-muted-foreground">No users found.</p>
                    ) : (
                      <div className="p-1">
                        {filteredUsers.slice(0, 50).map((user) => (
                          <button
                            key={user.id}
                            onClick={() => {
                              setFormData({ ...formData, userId: user.id });
                              setUserSearchQuery('');
                              setUserSearchOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-2 text-left text-sm rounded-md hover:bg-muted transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{user.email}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.displayName}</p>
                            </div>
                            {formData.userId === user.id && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  {filteredUsers.length > 50 && (
                    <p className="p-2 text-xs text-center text-muted-foreground border-t">
                      Showing first 50 results. Refine your search.
                    </p>
                  )}
                </PopoverContent>
              </Popover>
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
                  <SelectItem value="offers">Offer Creation Credits</SelectItem>
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
