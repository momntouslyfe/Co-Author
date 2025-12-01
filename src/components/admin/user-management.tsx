'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, UserX, UserCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
import type { UserManagement as UserManagementType } from '@/lib/definitions';

export function UserManagement() {
  const [users, setUsers] = useState<UserManagementType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const { toast } = useToast();

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

  const handleToggleUser = async (userId: string, isDisabled: boolean) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, isDisabled }),
      });

      if (!response.ok) throw new Error('Failed to update user');

      toast({
        title: 'Success',
        description: `User ${isDisabled ? 'disabled' : 'enabled'} successfully`,
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/users?id=${deleteUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });

      setDeleteUserId(null);
      loadUsers();
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
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user accounts and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found</p>
            ) : (
              <>
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Created</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b last:border-0">
                          <td className="p-3 font-medium">{user.displayName}</td>
                          <td className="p-3 text-muted-foreground">{user.email}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!user.isDisabled}
                                onCheckedChange={(checked) =>
                                  handleToggleUser(user.id, !checked)
                                }
                              />
                              <span className="text-xs">
                                {user.isDisabled ? (
                                  <span className="text-destructive">Disabled</span>
                                ) : (
                                  <span className="text-green-600">Active</span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteUserId(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteUserId(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!user.isDisabled}
                            onCheckedChange={(checked) =>
                              handleToggleUser(user.id, !checked)
                            }
                          />
                          <span className="text-xs">
                            {user.isDisabled ? (
                              <span className="text-destructive">Disabled</span>
                            ) : (
                              <span className="text-green-600">Active</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Delete User</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
