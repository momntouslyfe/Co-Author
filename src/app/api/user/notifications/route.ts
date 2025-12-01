import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { getUserSubscription, getSubscriptionPlan, getUserCreditSummary } from '@/lib/credits';
import type { Notification } from '@/types/notifications';

const LOW_CREDIT_THRESHOLD_PERCENT = 20;
const SUBSCRIPTION_EXPIRY_WARNING_DAYS = 7;

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    const notifications: Notification[] = [];
    const now = new Date();

    const subscription = await getUserSubscription(userId);
    
    if (!subscription || !subscription.subscriptionPlanId) {
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
      });
    }

    const plan = await getSubscriptionPlan(subscription.subscriptionPlanId);
    const creditSummary = await getUserCreditSummary(userId);

    if (subscription.planEffectiveEnd) {
      const expiryDate = subscription.planEffectiveEnd.toDate();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= SUBSCRIPTION_EXPIRY_WARNING_DAYS && daysUntilExpiry > 0) {
        notifications.push({
          id: 'subscription_expiring',
          type: 'subscription_expiring',
          severity: daysUntilExpiry <= 3 ? 'critical' : 'warning',
          title: 'Subscription Expiring Soon',
          message: `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Renew to keep access to all AI features.`,
          actionLabel: 'Renew Now',
          actionUrl: '/dashboard/settings?tab=billing',
          createdAt: now,
        });
      } else if (daysUntilExpiry <= 0) {
        notifications.push({
          id: 'subscription_expired',
          type: 'subscription_expiring',
          severity: 'critical',
          title: 'Subscription Expired',
          message: 'Your subscription has expired. Renew now to continue using AI features.',
          actionLabel: 'Renew Now',
          actionUrl: '/dashboard/settings?tab=billing',
          createdAt: now,
        });
      }
    }

    if (plan) {
      if (plan.bookCreditsPerMonth > 0) {
        const bookPercent = (creditSummary.bookCreditsAvailable / creditSummary.bookCreditsTotal) * 100;
        if (bookPercent <= LOW_CREDIT_THRESHOLD_PERCENT && creditSummary.bookCreditsTotal > 0) {
          notifications.push({
            id: 'low_book_credits',
            type: 'low_credits',
            severity: bookPercent <= 5 ? 'critical' : 'warning',
            title: 'Low Book Credits',
            message: `You have ${creditSummary.bookCreditsAvailable} book credit${creditSummary.bookCreditsAvailable === 1 ? '' : 's'} remaining. Purchase more to continue creating books.`,
            actionLabel: 'Buy Credits',
            actionUrl: '/dashboard/credits/purchase?type=books',
            createdAt: now,
          });
        }
      }

      if (plan.wordCreditsPerMonth > 0) {
        const wordPercent = (creditSummary.wordCreditsAvailable / creditSummary.wordCreditsTotal) * 100;
        if (wordPercent <= LOW_CREDIT_THRESHOLD_PERCENT && creditSummary.wordCreditsTotal > 0) {
          notifications.push({
            id: 'low_word_credits',
            type: 'low_credits',
            severity: wordPercent <= 5 ? 'critical' : 'warning',
            title: 'Low AI Word Credits',
            message: `You have ${creditSummary.wordCreditsAvailable.toLocaleString()} AI words remaining. Purchase more to keep using AI features.`,
            actionLabel: 'Buy Credits',
            actionUrl: '/dashboard/credits/purchase?type=words',
            createdAt: now,
          });
        }
      }

      if (plan.offerCreditsPerMonth > 0) {
        const offerPercent = (creditSummary.offerCreditsAvailable / creditSummary.offerCreditsTotal) * 100;
        if (offerPercent <= LOW_CREDIT_THRESHOLD_PERCENT && creditSummary.offerCreditsTotal > 0) {
          notifications.push({
            id: 'low_offer_credits',
            type: 'low_credits',
            severity: offerPercent <= 5 ? 'critical' : 'warning',
            title: 'Low Offer Credits',
            message: `You have ${creditSummary.offerCreditsAvailable} offer credit${creditSummary.offerCreditsAvailable === 1 ? '' : 's'} remaining. Purchase more to create bonus materials.`,
            actionLabel: 'Buy Credits',
            actionUrl: '/dashboard/credits/purchase?type=offers',
            createdAt: now,
          });
        }
      }
    }

    notifications.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
