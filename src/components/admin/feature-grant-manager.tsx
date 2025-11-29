'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Shield, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface FeatureGrant {
  id: string;
  userId: string;
  feature: 'coMarketer' | 'coWriter';
  expiresAt: { seconds: number };
  grantedBy: string;
  grantedAt: { seconds: number };
  notes?: string;
}

interface FeatureGrantManagerProps {
  userId?: string;
  userEmail?: string;
}

export function FeatureGrantManager({ userId, userEmail }: FeatureGrantManagerProps) {
  const [grants, setGrants] = useState<FeatureGrant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGrant, setNewGrant] = useState({
    feature: 'coMarketer' as 'coMarketer' | 'coWriter',
    durationDays: 30,
    notes: '',
  });
  const { toast } = useToast();

  const loadGrants = async () => {
    if (!userId) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/feature-grants?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load grants');

      const data = await response.json();
      setGrants(data.grants || []);
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
    loadGrants();
  }, [userId]);

  const handleCreateGrant = async () => {
    if (!userId) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/feature-grants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          feature: newGrant.feature,
          durationDays: newGrant.durationDays,
          notes: newGrant.notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create grant');
      }

      toast({
        title: 'Success',
        description: `${newGrant.feature === 'coMarketer' ? 'Co-Marketer' : 'Co-Writer'} access granted for ${newGrant.durationDays} days`,
      });

      setIsDialogOpen(false);
      setNewGrant({ feature: 'coMarketer', durationDays: 30, notes: '' });
      loadGrants();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/feature-grants?grantId=${grantId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to revoke grant');

      toast({
        title: 'Success',
        description: 'Feature access revoked',
      });

      loadGrants();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const isGrantActive = (grant: FeatureGrant) => {
    const expiresAt = new Date(grant.expiresAt.seconds * 1000);
    return expiresAt > new Date();
  };

  if (!userId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <h4 className="font-medium">Feature Access Grants</h4>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Grant Access
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant Feature Access</DialogTitle>
              <DialogDescription>
                Grant temporary access to premium features for {userEmail || userId}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Feature</Label>
                <Select
                  value={newGrant.feature}
                  onValueChange={(value: 'coMarketer' | 'coWriter') =>
                    setNewGrant({ ...newGrant, feature: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coMarketer">Co-Marketer</SelectItem>
                    <SelectItem value="coWriter">Co-Writer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (Days)</Label>
                <Select
                  value={newGrant.durationDays.toString()}
                  onValueChange={(value) =>
                    setNewGrant({ ...newGrant, durationDays: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Reason for granting access..."
                  value={newGrant.notes}
                  onChange={(e) =>
                    setNewGrant({ ...newGrant, notes: e.target.value })
                  }
                />
              </div>

              <Button
                onClick={handleCreateGrant}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Granting...
                  </>
                ) : (
                  'Grant Access'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {grants.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active feature grants</p>
      ) : (
        <div className="space-y-2">
          {grants.map((grant) => {
            const active = isGrantActive(grant);
            const expiresAt = new Date(grant.expiresAt.seconds * 1000);
            
            return (
              <div
                key={grant.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={active ? 'default' : 'secondary'}>
                      {grant.feature === 'coMarketer' ? 'Co-Marketer' : 'Co-Writer'}
                    </Badge>
                    {!active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Expires: {format(expiresAt, 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  {grant.notes && (
                    <p className="text-xs text-muted-foreground">{grant.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeGrant(grant.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
