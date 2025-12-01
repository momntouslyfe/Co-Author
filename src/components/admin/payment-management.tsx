'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle, Search, X } from 'lucide-react';
import type { PaymentRecord } from '@/types/uddoktapay';

export function PaymentManagement() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    if (!emailSearch.trim()) return payments;
    const query = emailSearch.toLowerCase().trim();
    return payments.filter(payment =>
      payment.userEmail?.toLowerCase().includes(query) ||
      payment.userName?.toLowerCase().includes(query) ||
      payment.orderId?.toLowerCase().includes(query)
    );
  }, [payments, emailSearch]);

  useEffect(() => {
    if (!emailSearch.trim()) {
      loadPayments();
    }
  }, [statusFilter, approvalFilter, emailSearch]);

  useEffect(() => {
    if (emailSearch.trim()) {
      const debounceTimer = setTimeout(() => {
        loadPaymentsForSearch();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [emailSearch]);

  const loadPaymentsForSearch = async () => {
    if (!emailSearch.trim()) return;
    setLoading(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/payment/list?limit=200', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load payments for search');
      }

      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error('Search fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (approvalFilter !== 'all') {
        params.append('approvalStatus', approvalFilter);
      }

      const response = await fetch(`/api/admin/payment/list?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load payments');
      }

      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;

    setProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/payment/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: selectedPayment.orderId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve payment');
      }

      setActionDialog(null);
      setSelectedPayment(null);
      loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !rejectionReason) return;

    setProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/payment/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: selectedPayment.orderId,
          reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject payment');
      }

      setActionDialog(null);
      setSelectedPayment(null);
      setRejectionReason('');
      loadPayments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      processing: { variant: 'default' as const, icon: Clock, label: 'Processing' },
      completed: { variant: 'default' as const, icon: CheckCircle, label: 'Completed' },
      failed: { variant: 'destructive' as const, icon: XCircle, label: 'Failed' },
      cancelled: { variant: 'secondary' as const, icon: XCircle, label: 'Cancelled' },
      refunded: { variant: 'secondary' as const, icon: AlertCircle, label: 'Refunded' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getApprovalBadge = (approvalStatus: string) => {
    const config = {
      pending: { variant: 'secondary' as const, label: 'Pending Approval' },
      approved: { variant: 'default' as const, label: 'Approved' },
      rejected: { variant: 'destructive' as const, label: 'Rejected' },
    };

    const status = config[approvalStatus as keyof typeof config] || config.pending;

    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Management</CardTitle>
          <CardDescription>
            View, approve, and manage payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, name, or order ID..."
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {emailSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setEmailSearch('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Approval Status</Label>
                  <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by approval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Approvals</SelectItem>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {emailSearch && (
              <p className="text-sm text-muted-foreground">
                Searching across all orders - showing {filteredPayments.length} matches
              </p>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Payments List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {emailSearch ? 'No orders match your search' : 'No payments found'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <Card key={payment.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div>
                            <span className="font-semibold">Order ID:</span>{' '}
                            <span className="font-mono text-sm">{payment.orderId}</span>
                          </div>
                          <div>
                            <span className="font-semibold">Customer:</span> {payment.userName}
                          </div>
                          <div>
                            <span className="font-semibold">Email:</span> {payment.userEmail}
                          </div>
                          <div>
                            <span className="font-semibold">Amount:</span> ৳{payment.chargedAmount}
                          </div>
                          {payment.transactionId && (
                            <div>
                              <span className="font-semibold">Transaction ID:</span>{' '}
                              <span className="font-mono text-sm">{payment.transactionId}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Status:</span>
                            {getStatusBadge(payment.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Approval:</span>
                            {getApprovalBadge(payment.approvalStatus)}
                          </div>
                          {payment.paymentMethod && (
                            <div>
                              <span className="font-semibold">Method:</span> {payment.paymentMethod}
                            </div>
                          )}
                          {payment.senderNumber && (
                            <div>
                              <span className="font-semibold">Sender:</span> {payment.senderNumber}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold">Date:</span>{' '}
                            {new Date(payment.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {payment.rejectionReason && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertDescription>
                            <strong>Rejection Reason:</strong> {payment.rejectionReason}
                          </AlertDescription>
                        </Alert>
                      )}

                      {(payment.status === 'processing' || payment.status === 'pending') && payment.approvalStatus === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setActionDialog('approve');
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setActionDialog('reject');
                            }}
                            variant="destructive"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={actionDialog === 'approve'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this payment?
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-2">
              <p><strong>Order ID:</strong> {selectedPayment.orderId}</p>
              <p><strong>Customer:</strong> {selectedPayment.userName}</p>
              <p><strong>Amount:</strong> ৳{selectedPayment.chargedAmount}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionDialog === 'reject'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p><strong>Order ID:</strong> {selectedPayment.orderId}</p>
                <p><strong>Customer:</strong> {selectedPayment.userName}</p>
                <p><strong>Amount:</strong> ৳{selectedPayment.chargedAmount}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Input
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason}
            >
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
