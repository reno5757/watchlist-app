import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/sidebar';
import { Providers } from './providers';

export const metadata: Metadata = {title: 'Trading Dashboard',description: 'Trading Dashboard',};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}