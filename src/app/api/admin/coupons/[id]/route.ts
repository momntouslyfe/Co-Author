import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { UpdateCouponInput } from '@/types/subscription';

const admin = getFirebaseAdmin();
const db = admin.firestore();

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/coupons/:id - Get single coupon
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const { valid } = verifyAdminToken(token);
    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const docRef = db.collection('coupons').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const coupon = {
      id: doc.id,
      ...doc.data(),
    };

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupon' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/coupons/:id - Update coupon
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const { valid } = verifyAdminToken(token);
    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body: UpdateCouponInput = await request.json();

    const docRef = db.collection('coupons').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Validate discount value if provided
    if (body.discountValue !== undefined && body.discountType) {
      if (body.discountType === 'percentage' && (body.discountValue < 0 || body.discountValue > 100)) {
        return NextResponse.json(
          { error: 'Percentage discount must be between 0 and 100' },
          { status: 400 }
        );
      }

      if (body.discountType === 'fixed' && body.discountValue < 0) {
        return NextResponse.json(
          { error: 'Fixed discount must be a positive number' },
          { status: 400 }
        );
      }
    }

    // If changing code, check if new code already exists
    if (body.code) {
      const codeUpperCase = body.code.toUpperCase();
      const existingCoupon = await db
        .collection('coupons')
        .where('code', '==', codeUpperCase)
        .limit(1)
        .get();

      if (!existingCoupon.empty && existingCoupon.docs[0].id !== id) {
        return NextResponse.json(
          { error: 'Coupon code already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (body.code) updateData.code = body.code.toUpperCase();
    if (body.category) updateData.category = body.category;
    if (body.discountType) updateData.discountType = body.discountType;
    if (body.discountValue !== undefined) updateData.discountValue = body.discountValue;
    if (body.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = body.maxUsesPerUser;
    if (body.validFrom) updateData.validFrom = admin.firestore.Timestamp.fromDate(new Date(body.validFrom));
    if (body.validUntil) updateData.validUntil = admin.firestore.Timestamp.fromDate(new Date(body.validUntil));
    if (body.specificUserId !== undefined) updateData.specificUserId = body.specificUserId || null;
    if (body.affiliateId !== undefined) updateData.affiliateId = body.affiliateId || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.description !== undefined) updateData.description = body.description;

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    const updatedCoupon = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    return NextResponse.json({ coupon: updatedCoupon });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/coupons/:id - Delete coupon
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const { valid } = verifyAdminToken(token);
    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const docRef = db.collection('coupons').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404 }
      );
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { error: 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}
