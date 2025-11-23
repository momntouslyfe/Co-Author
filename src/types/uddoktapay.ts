export interface UddoktapayCheckoutRequest {
  full_name: string;
  email: string;
  amount: string;
  metadata: {
    user_id: string;
    order_id: string;
    plan_id?: string;
    addon_id?: string;
    [key: string]: string | undefined;
  };
  redirect_url: string;
  return_type: 'GET' | 'POST';
  cancel_url: string;
  webhook_url: string;
}

export interface UddoktapayCheckoutResponse {
  status: boolean;
  payment_url?: string;
  message?: string;
}

export interface UddoktapayVerifyRequest {
  invoice_id: string;
}

export interface UddoktapayVerifyResponse {
  status: boolean;
  full_name?: string;
  email?: string;
  amount?: string;
  fee?: string;
  charged_amount?: string;
  invoice_id?: string;
  payment_method?: string;
  sender_number?: string;
  transaction_id?: string;
  date?: string;
  metadata?: {
    user_id: string;
    order_id: string;
    plan_id?: string;
    addon_id?: string;
    [key: string]: string | undefined;
  };
  message?: string;
}

export interface UddoktapayWebhookData {
  full_name: string;
  email: string;
  amount: string;
  fee: string;
  charged_amount: string;
  invoice_id: string;
  metadata: {
    user_id: string;
    order_id: string;
    plan_id?: string;
    addon_id?: string;
    [key: string]: string | undefined;
  };
  payment_method: string;
  sender_number: string;
  transaction_id: string;
  date: string;
}

export type PaymentStatus = 
  | 'pending'      // Payment initiated, awaiting completion
  | 'processing'   // Payment received via webhook, being processed
  | 'completed'    // Payment verified and processed successfully
  | 'failed'       // Payment failed
  | 'cancelled'    // Payment cancelled by user
  | 'refunded';    // Payment refunded

export type PaymentApprovalStatus =
  | 'pending'      // Awaiting admin approval
  | 'approved'     // Approved by admin
  | 'rejected';    // Rejected by admin

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  
  // Order details
  orderId: string;
  planId?: string;
  addonId?: string;
  
  // Payment details
  amount: string;
  expectedAmount: string; // Server-validated expected amount for security
  fee: string;
  chargedAmount: string;
  currency: string;
  
  // Uddoktapay details
  invoiceId: string;
  paymentMethod?: string;
  senderNumber?: string;
  transactionId?: string;
  
  // Status tracking
  status: PaymentStatus;
  approvalStatus: PaymentApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
