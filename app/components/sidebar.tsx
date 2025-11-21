// components/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Wachlists', href: '/watchlist' },
  { label: 'Breadth', href: '/watchlist1' },
  { label: 'Market Indexes', href: '/watchlist2' },
  { label: 'Sectors', href: '/watchlist3' },
  { label: 'Themes', href: '/watchlist4' },
  { label: 'Settings', href: '/watchlist5' },
  
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-muted/30 p-4 space-y-2">
      {navItems.map((item) => {
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent',
              isActive && 'bg-accent'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
