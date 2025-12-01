export type NotificationType = 'low_credits' | 'subscription_expiring' | 'info';
export type NotificationSeverity = 'warning' | 'critical' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: Date;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}
