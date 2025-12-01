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
  Search,
  BookOpen,
  Share2,
  Settings,
  Archive,
  Sparkles,
  User,
  Megaphone,
  PenTool,
} from 'lucide-react';
import { useAuthUser } from '@/firebase/auth/use-user';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard />, label: 'Dashboard' },
  { href: '/dashboard/author-profile', icon: <User />, label: 'Author Profile' },
  { href: '/dashboard/co-author', icon: <BookOpen />, label: 'Co-Author' },
  { href: '/dashboard/research', icon: <Search />, label: 'Topic Research' },
  { href: '/dashboard/research/saved', icon: <Archive />, label: 'Saved Research' },
  { href: '/dashboard/style-profile', icon: <Sparkles />, label: 'Style Profile' },
  { href: '/dashboard/co-marketer', icon: <Megaphone />, label: 'Co-Marketer' },
  { href: '/dashboard/co-writer', icon: <PenTool />, label: 'Co-Writer' },
  { href: '/dashboard/affiliate', icon: <Share2 />, label: 'Affiliate' },
];

const secondaryNavItems = [
    { href: '/dashboard/settings', icon: <Settings />, label: 'Settings' },
]

export function MainNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuthUser();
  const isDevelopment = process.env.NODE_ENV === 'development';

  const isActive = (href: string) => {
    if (href === '/dashboard/co-author') {
      return pathname.startsWith('/dashboard/co-author');
    }
    if (href === '/dashboard/co-marketer') {
      return pathname.startsWith('/dashboard/co-marketer') || pathname.startsWith('/dashboard/offer-workspace');
    }
    if (href === '/dashboard/co-writer') {
      return pathname.startsWith('/dashboard/co-writer');
    }
    return pathname === href;
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.href)}
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
      {secondaryNavItems.map((item) => (
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
    </SidebarMenu>
  );
}
