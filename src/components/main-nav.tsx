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
  FileText,
  Share2,
  Settings,
  Archive,
  Palette,
  BookOpen,
  User,
} from 'lucide-react';
import { useAuthUser } from '@/firebase/auth/use-user';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard />, label: 'Dashboard' },
  { href: '/dashboard/co-author', icon: <FileText />, label: 'Co-Author' },
  { href: '/dashboard/publish', icon: <BookOpen />, label: 'Publish' },
  { href: '/dashboard/research', icon: <Search />, label: 'Topic Research' },
  { href: '/dashboard/research/saved', icon: <Archive />, label: 'Saved Research' },
  { href: '/dashboard/style-profile', icon: <Palette />, label: 'Style Profile' },
  { href: '/dashboard/author-profile', icon: <User />, label: 'Author Profile' },
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
    if (href === '/dashboard/publish') {
      return pathname.startsWith('/dashboard/publish');
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
