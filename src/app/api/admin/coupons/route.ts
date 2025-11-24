import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, getAuthToken } from '@/lib/admin-auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Coupon, CreateCouponInput } from '@/types/subscription';

const admin = getFirebaseAdmin();
const db = admin.firestore();

// GET /api/admin/coupons - List all coupons
export async function GET(request: NextRequest) {
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

    const couponsSnapshot = await db.collection('coupons').orderBy('createdAt', 'desc').get();

    const coupons = couponsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Coupon[];

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST /api/admin/coupons - Create new coupon
export async function POST(request: NextRequest) {
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

    const body: CreateCouponInput = await request.json();

    // Validate required fields
    if (!body.code || !body.category || !body.discountType || body.discountValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate discount value
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

    // Check if coupon code already exists
    const codeUpperCase = body.code.toUpperCase();
    const existingCoupon = await db
      .collection('coupons')
      .where('code', '==', codeUpperCase)
      .limit(1)
      .get();

    if (!existingCoupon.empty) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 400 }
      );
    }

    const now = admin.firestore.Timestamp.now();
    const couponData = {
      code: codeUpperCase,
      category: body.category,
      discountType: body.discountType,
      discountValue: body.discountValue,
      maxUsesPerUser: body.maxUsesPerUser || 1,
      validFrom: admin.firestore.Timestamp.fromDate(new Date(body.validFrom)),
      validUntil: admin.firestore.Timestamp.fromDate(new Date(body.validUntil)),
      specificUserId: body.specificUserId || null,
      affiliateId: body.affiliateId || null,
      isActive: body.isActive ?? true,
      description: body.description || '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection('coupons').add(couponData);

    const newCoupon = {
      id: docRef.id,
      ...couponData,
    };

    return NextResponse.json({ coupon: newCoupon }, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
