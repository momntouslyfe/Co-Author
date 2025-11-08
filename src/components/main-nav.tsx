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
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard />, label: 'Dashboard' },
  { href: '/dashboard/projects', icon: <BookCopy />, label: 'My Projects' },
  { href: '/dashboard/research', icon: <Search />, label: 'Topic Research' },
  { href: '/dashboard/blueprint', icon: <FileText />, label: 'Blueprint AI' },
  { href: '/dashboard/affiliate', icon: <Share2 />, label: 'Affiliate' },
  { href: '/dashboard/blog', icon: <Rss />, label: 'Blog' },
  { href: '/dashboard/settings', icon: <Settings />, label: 'Settings' },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref>
            <SidebarMenuButton
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
