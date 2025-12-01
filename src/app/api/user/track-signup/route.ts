import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { trackCompleteRegistration } from '@/lib/integrations/facebook-capi';
import { sendWelcomeEmail } from '@/lib/email/email-service';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const { clientIp, userAgent, fbc, fbp, eventSourceUrl } = await request.json();
    const { uid, email, name } = user;

    const admin = getFirebaseAdmin();
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();

    const isNewUser = !userDoc.exists || !userDoc.data()?.signupTracked;

    if (isNewUser) {
      await userRef.set({
        signupTracked: true,
        signupTrackedAt: admin.firestore.FieldValue.serverTimestamp(),
        email,
        displayName: name,
      }, { merge: true });

      trackCompleteRegistration({
        userId: uid,
        email: email || undefined,
        firstName: name?.split(' ')[0],
        lastName: name?.split(' ').slice(1).join(' '),
        clientIp,
        userAgent,
        fbc,
        fbp,
        eventSourceUrl,
        status: 'completed',
      }).catch(err => console.error('Facebook tracking error:', err));

      if (email) {
        sendWelcomeEmail({
          userId: uid,
          email,
          displayName: name || undefined,
        }).catch(err => console.error('Welcome email error:', err));
      }

      return NextResponse.json({
        success: true,
        isNewUser: true,
        message: 'Signup tracked successfully',
      });
    }

    return NextResponse.json({
      success: true,
      isNewUser: false,
      message: 'User already tracked',
    });
  } catch (error: any) {
    console.error('Track signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
