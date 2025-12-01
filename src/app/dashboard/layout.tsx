'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";
import { useAuthUser } from '@/firebase/auth/use-user';
import { CreditSummaryProvider } from '@/contexts/credit-summary-context';
import { NotificationBell } from '@/components/dashboard/notification-bell';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <CreditSummaryProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="pt-4">
            <Logo />
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          <SidebarFooter>
            <UserNav />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:pt-4">
              <SidebarTrigger className="sm:hidden" />
              <div className="ml-auto flex items-center gap-2">
                  <NotificationBell />
              </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
              {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </CreditSummaryProvider>
  );
}
