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
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { useAuthUser } from '@/firebase/auth/use-user';
import { CreditSummaryProvider } from '@/contexts/credit-summary-context';


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
          <SidebarHeader>
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
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
              <SidebarTrigger className="sm:hidden" />
              {/* We can add breadcrumbs here if needed */}
              <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8">
                      <Bell className="h-4 w-4" />
                      <span className="sr-only">Toggle notifications</span>
                  </Button>
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
