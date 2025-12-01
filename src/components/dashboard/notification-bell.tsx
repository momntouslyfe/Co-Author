'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuthUser } from '@/firebase/auth/use-user';
import type { Notification, NotificationsResponse } from '@/types/notifications';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { user } = useAuthUser();

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/user/notifications', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data: NotificationsResponse = await response.json();
      
      const storedDismissed = localStorage.getItem('dismissedNotifications');
      const dismissedSet = storedDismissed ? new Set<string>(JSON.parse(storedDismissed)) : new Set<string>();
      setDismissedIds(dismissedSet);
      
      const visibleNotifications = data.notifications.filter(n => !dismissedSet.has(n.id));
      setNotifications(visibleNotifications);
      setUnreadCount(visibleNotifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
    
    const updatedNotifications = notifications.filter(n => n.id !== id);
    setNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.length);
  };

  const getSeverityStyles = (severity: Notification['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-950/30',
          border: 'border-red-200 dark:border-red-900',
          icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
          text: 'text-red-900 dark:text-red-100',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-900',
          icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          text: 'text-amber-900 dark:text-amber-100',
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-900',
          icon: <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
          text: 'text-blue-900 dark:text-blue-100',
        };
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} alert{unreadCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        
        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No notifications
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const styles = getSeverityStyles(notification.severity);
                return (
                  <div
                    key={notification.id}
                    className={`p-3 ${styles.bg} relative`}
                  >
                    <button
                      onClick={() => handleDismiss(notification.id)}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                    
                    <div className="flex gap-3 pr-6">
                      <div className="flex-shrink-0 mt-0.5">
                        {styles.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${styles.text}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                        {notification.actionUrl && (
                          <Link
                            href={notification.actionUrl}
                            onClick={() => setIsOpen(false)}
                            className="inline-block mt-2 text-xs font-medium text-primary hover:underline"
                          >
                            {notification.actionLabel || 'Take Action'}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  notifications.forEach(n => handleDismiss(n.id));
                }}
              >
                Dismiss All
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
