// components/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type NavItem = {
  label: string;
  href: string;
  children?: NavItem[];
};

const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Watchlists',
    href: "null",
    children: [
      { label: 'Lists', href: '/watchlist' },
      { label: 'Sectors', href: '/watchlist/6' },
      { label: 'Themes', href: '/watchlist/7' },
    ],
  },
  { label: 'Breadth', href: '/breadth' },
  { label: 'Market Indexes', href: '/indexes' },
  { label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-muted/30 p-4 space-y-2">
      {navItems.map((item) => {
        const isActive =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <div key={item.href}>
            {/* Main item */}
            {item.href != "null" ? (
              <Link
                href={item.href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent',
                  isActive && 'bg-accent'
                )}
              >
                {item.label}
              </Link>
            ) : (
              <div className="px-3 py-2 text-sm font-semibold text-zinc-300">
                {item.label}
              </div>
            )}
            {/* Children */}
            {item.children && (
              <div className="ml-4 mt-1 space-y-1">
                {item.children.map((child) => {
                  const childActive = pathname === child.href;

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'block rounded-md px-3 py-1 text-sm hover:bg-accent/50',
                        childActive && 'bg-accent'
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
