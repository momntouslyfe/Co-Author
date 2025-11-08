'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  BookCopy,
  Search,
  FileText,
  Share2,
  Rss,
  Settings,
  Shield,
} from 'lucide-react';
import { useAuthUser } from '@/firebase/auth/use-user';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard />, label: 'Dashboard' },
  { href: '/dashboard/projects', icon: <BookCopy />, label: 'My Projects' },
  { href: '/dashboard/research', icon: <Search />, label: 'Topic Research' },
  { href: '/dashboard/blueprint', icon: <FileText />, label: 'Blueprint AI' },
  { href: '/dashboard/affiliate', icon: <Share2 />, label: 'Affiliate' },
  { href: '/dashboard/blog', icon: <Rss />, label: 'Blog' },
];

const secondaryNavItems = [
    { href: '/dashboard/settings', icon: <Settings />, label: 'Settings' },
    { href: '/dashboard/admin', icon: <Shield />, label: 'Admin', admin: true },
]

export function MainNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuthUser();
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={item.label}
          >
            <Link href={item.href}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      <div className="flex-grow" />
      {secondaryNavItems.map((item) => {
        if (item.admin && !isAdmin && !isDevelopment) return null;
        return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                    {item.icon}
                    <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
