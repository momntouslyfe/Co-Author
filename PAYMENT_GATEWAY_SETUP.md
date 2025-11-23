# Uddoktapay Payment Gateway Setup Guide

This document provides comprehensive instructions for setting up and configuring the Uddoktapay payment gateway integration in Co-Author Pro.

## Overview

Co-Author Pro integrates with Uddoktapay, a payment automation platform for Bangladesh that supports:
- Mobile Financial Services (MFS): bKash, Nagad, Rocket, etc.
- Bank transfers
- Global payment methods

## Prerequisites

1. **Uddoktapay Account**: Sign up at [https://uddoktapay.com](https://uddoktapay.com)
2. **API Credentials**: Obtain your API key from the Uddoktapay dashboard
3. **Replit Environment**: Access to Replit Secrets panel

## Setup Instructions

### 1. Get Your Uddoktapay API Credentials

#### Sandbox (Testing)
For testing purposes, use the sandbox environment:
- **API Key**: Provided by Uddoktapay (or use demo key for initial testing)
- **Base URL**: `https://sandbox.uddoktapay.com`

#### Production
For live transactions:
- **API Key**: Your production API key from Uddoktapay dashboard
- **Base URL**: Your custom domain (e.g., `https://pay.yourdomain.com`)

### 2. Configure Environment Variables

#### Using Replit Secrets (Recommended)

1. Open your Replit project
2. Click on "Tools" in the left sidebar
3. Select "Secrets"
4. Add the following secrets:

| Secret Name | Value | Required |
|-------------|-------|----------|
| `UDDOKTAPAY_API_KEY` | Your Uddoktapay API key | Yes |
| `UDDOKTAPAY_BASE_URL` | Base URL (defaults to sandbox if not set) | No |

#### Using .env File (Local Development)

Create a `.env` file in the project root:

```env
UDDOKTAPAY_API_KEY=your_api_key_here
UDDOKTAPAY_BASE_URL=https://sandbox.uddoktapay.com
```

### 3. Configure Application URLs

The payment gateway requires callback URLs. These are automatically configured based on your application's domain:

- **Success URL**: `{YOUR_DOMAIN}/payment/success`
- **Cancel URL**: `{YOUR_DOMAIN}/payment/cancel`
- **Webhook URL**: `{YOUR_DOMAIN}/api/payment/webhook`

The application automatically uses `NEXT_PUBLIC_APP_URL` environment variable or falls back to the request origin.

### 4. Update Firestore Security Rules

The Firestore security rules for the payments collection have been added. Deploy them using:

```bash
firebase deploy --only firestore:rules
```

Or deploy via the Firebase Console.

### 5. Test the Integration

#### Admin Panel Test
1. Log in to the admin panel at `/admin/login`
2. Navigate to the "Payment Setup" tab
3. Enter your API credentials
4. Click "Test Connection"
5. Verify that the connection is successful

#### End-to-End Test
1. Log in as a regular user
2. Navigate to "Purchase Credits" (`/dashboard/credits/purchase`)
3. Select a credit package
4. Click "Purchase Now"
5. Complete the payment on the Uddoktapay gateway
6. Verify redirection to success page
7. As admin, approve the payment in the "Payments" tab
8. Verify credits are added to the user's account

## Payment Flow

### User Journey

```
1. User selects credit package
   ↓
2. System creates payment record in Firestore
   ↓
3. System calls Uddoktapay API to create payment session
   ↓
4. User is redirected to Uddoktapay payment gateway
   ↓
5. User completes payment (bKash, Nagad, etc.)
   ↓
6. User is redirected back to success page
   ↓
7. System verifies payment with Uddoktapay API
   ↓
8. Payment status updated to "processing"
   ↓
9. Webhook notification received (optional, for instant updates)
   ↓
10. Admin approves payment in admin panel
    ↓
11. Credits are automatically granted to user
    ↓
12. Payment status updated to "completed"
```

### System Flow

```
┌─────────────────┐
│  User Purchase  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Create Payment API  │ (/api/payment/create)
└────────┬────────────┘
         │
         ├─► Create payment record in Firestore
         │
         └─► Call Uddoktapay checkout API
                     │
                     ▼
         ┌─────────────────────┐
         │ Uddoktapay Gateway  │
         └────────┬────────────┘
                  │
                  ├─► User completes payment
                  │
                  ├─► Webhook notification
                  │        │
                  │        ▼
                  │   ┌─────────────────┐
                  │   │  Webhook API    │ (/api/payment/webhook)
                  │   └────────┬────────┘
                  │            │
                  │            └─► Update payment to "processing"
                  │
                  └─► Redirect to success page
                           │
                           ▼
                  ┌─────────────────┐
                  │  Verify API     │ (/api/payment/verify)
                  └────────┬────────┘
                           │
                           └─► Verify with Uddoktapay
                                     │
                                     ▼
                           ┌─────────────────────┐
                           │  Admin Approval     │ (Admin Panel)
                           └────────┬────────────┘
                                    │
                                    └─► Grant credits to user
```

## API Endpoints

### Public Endpoints

#### Create Payment
- **Endpoint**: `POST /api/payment/create`
- **Purpose**: Initiates a new payment session
- **Request Body**:
  ```json
  {
    "userId": "string",
    "userEmail": "string",
    "userName": "string",
    "amount": number,
    "addonId": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "orderId": "string",
    "paymentUrl": "string"
  }
  ```

#### Verify Payment
- **Endpoint**: `POST /api/payment/verify`
- **Purpose**: Verifies payment after user returns from gateway
- **Request Body**:
  ```json
  {
    "invoiceId": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "payment": {
      "orderId": "string",
      "status": "processing",
      "message": "string"
    }
  }
  ```

#### Webhook Handler
- **Endpoint**: `POST /api/payment/webhook`
- **Purpose**: Receives instant payment notifications from Uddoktapay
- **Authentication**: Validates `RT-UDDOKTAPAY-API-KEY` header
- **Request Body**: Payment data from Uddoktapay
- **Response**:
  ```json
  {
    "success": true,
    "message": "Webhook processed successfully"
  }
  ```

### Admin Endpoints

All admin endpoints require authentication via Bearer token.

#### Test Connection
- **Endpoint**: `POST /api/admin/payment/test-connection`
- **Purpose**: Tests Uddoktapay API credentials
- **Request Body**:
  ```json
  {
    "apiKey": "string",
    "baseUrl": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Connection successful"
  }
  ```

#### List Payments
- **Endpoint**: `GET /api/admin/payment/list?status={status}&approvalStatus={approvalStatus}`
- **Purpose**: Lists all payment transactions
- **Query Parameters**:
  - `status`: Filter by payment status (pending, processing, completed, failed, cancelled)
  - `approvalStatus`: Filter by approval status (pending, approved, rejected)
- **Response**:
  ```json
  {
    "payments": [
      {
        "id": "string",
        "orderId": "string",
        "userId": "string",
        "amount": "string",
        "status": "string",
        "approvalStatus": "string",
        ...
      }
    ]
  }
  ```

#### Approve Payment
- **Endpoint**: `POST /api/admin/payment/approve`
- **Purpose**: Approves a payment and grants credits to user
- **Request Body**:
  ```json
  {
    "orderId": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Payment approved and credits granted successfully"
  }
  ```

#### Reject Payment
- **Endpoint**: `POST /api/admin/payment/reject`
- **Purpose**: Rejects a payment with a reason
- **Request Body**:
  ```json
  {
    "orderId": "string",
    "reason": "string"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Payment rejected successfully"
  }
  ```

## Admin Features

### Payment Setup Tab
- Test API connection before going live
- View setup instructions
- Manage environment variables via Replit Secrets

### Payments Tab
- View all payment transactions
- Filter by status and approval status
- Approve or reject pending payments
- View payment details including:
  - Order ID
  - Customer information
  - Amount and transaction details
  - Payment method and sender information

## Payment Statuses

### Payment Status
- **pending**: Payment initiated, awaiting completion
- **processing**: Payment received via webhook, awaiting admin approval
- **completed**: Payment verified and processed successfully
- **failed**: Payment failed or rejected
- **cancelled**: Payment cancelled by user
- **refunded**: Payment refunded (future implementation)

### Approval Status
- **pending**: Awaiting admin approval
- **approved**: Approved by admin, credits granted
- **rejected**: Rejected by admin with reason

## Security Considerations

### Multi-Layer Security Architecture

The payment system implements multiple layers of security to prevent fraud:

**Layer 1 - Server-Side Price Validation:**
- All payment amounts are calculated server-side from Firestore plan data
- Client-provided amounts are completely ignored
- Prevents price tampering attacks

**Layer 2 - Invoice Integrity:**
- Webhook requests verify invoices with Uddoktapay API
- Invoice metadata order_id must match the payment record
- Invoices cannot be changed once assigned
- Invoices cannot be reused across different orders
- Prevents invoice substitution attacks

**Layer 3 - Approval Verification:**
- Admin approval re-verifies payment with Uddoktapay API
- Uses authoritative charged amount from gateway, not stored values
- Compares verified amount with expected price
- Rejects mismatched payments with detailed error messages

**Layer 4 - Audit Trail:**
- All security violations are logged with SECURITY ALERT markers
- Verified amounts stored alongside stored amounts for auditing
- Admin approval actions tracked with timestamps and user information

### Webhook Authentication

**Current Implementation:**
- Webhooks are authenticated using the `RT-UDDOKTAPAY-API-KEY` header
- This is a shared secret between your application and Uddoktapay
- Multiple validation layers prevent exploitation even if key is compromised

**Security Recommendations:**
1. **Protect API Key**: Store in Replit Secrets, never commit to code
2. **Monitor Logs**: Set up alerts for SECURITY ALERT messages
3. **Regular Key Rotation**: Change API keys periodically (coordinate with Uddoktapay)
4. **Network Security**: If possible, restrict webhook endpoint to Uddoktapay's IP ranges

**Advanced Security (Optional):**
- Implement rate limiting on webhook endpoint
- Add anomaly detection for suspicious payment patterns
- Use network-level restrictions or allowlists
- Request HMAC signature support from Uddoktapay if available

### Admin Authentication
All admin payment operations require valid admin authentication tokens with 24-hour expiration.

### Firestore Security
Payment records are protected by Firestore security rules:
- Users can only view their own payment records
- All create, update, and delete operations are handled server-side
- Admin operations use Firebase Admin SDK with elevated privileges

### Environment Variables
Sensitive credentials are stored in Replit Secrets, never in code or version control.

### Provider Guarantees

The system assumes Uddoktapay provides:
- Immutable invoice metadata (order_id cannot be changed after creation)
- Reliable invoice verification API
- Consistent API key validation

If you have concerns about any of these assumptions, contact Uddoktapay support for clarification.

## Troubleshooting

### Payment Creation Fails
- Verify `UDDOKTAPAY_API_KEY` is correctly set
- Check `UDDOKTAPAY_BASE_URL` points to the correct environment
- Test connection using admin panel
- Check browser console for detailed error messages

### Webhook Not Received
- Ensure your application is publicly accessible
- Verify webhook URL is correct
- Check application logs for webhook requests
- Test with Uddoktapay's webhook testing tool

### Credits Not Granted After Approval
- Check admin panel logs for errors
- Verify addon plan exists and has correct credit amount
- Check user subscription record in Firestore
- Review credit transaction logs

### Connection Test Fails
- Verify API key is correct
- Check base URL format (should include https://)
- Ensure network connectivity
- Try with sandbox credentials first

## Migration from Sandbox to Production

1. **Get Production Credentials**
   - Contact Uddoktapay support
   - Receive production API key and base URL

2. **Update Environment Variables**
   - Update `UDDOKTAPAY_API_KEY` with production key
   - Update `UDDOKTAPAY_BASE_URL` with production URL

3. **Test Connection**
   - Use admin panel to test production credentials
   - Verify connection is successful

4. **Perform Test Transaction**
   - Create a small test purchase
   - Complete payment flow
   - Verify approval and credit granting

5. **Monitor**
   - Watch payment logs for any issues
   - Monitor webhook notifications
   - Check credit granting automation

## Support

### Uddoktapay Support
- Website: [https://uddoktapay.com](https://uddoktapay.com)
- Documentation: [https://uddoktapay.readme.io](https://uddoktapay.readme.io)
- Developer Docs: [https://developer.uddoktapay.com](https://developer.uddoktapay.com)

### Application Support
- For integration issues, check application logs
- Review Firestore security rules
- Test with sandbox environment first
- Contact your development team for assistance

## Additional Resources

- [Uddoktapay API Documentation](https://uddoktapay.readme.io/reference/overview)
- [Uddoktapay Developer Guide](https://developer.uddoktapay.com/)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
