'use client';

import { FloatingCreditWidget } from '@/components/credits/floating-credit-widget';

export default function OfferWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FloatingCreditWidget />
      {children}
    </>
  );
}
