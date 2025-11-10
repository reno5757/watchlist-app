import './globals.css';
import DataClient from '@/components/data-client';

export const metadata = { title: 'Local Watchlists', description: 'Local-first stocks UI' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl p-4">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">Local Watchlists</h1>
            <p className="text-muted-foreground">Reads from app_data.db</p>
          </header>
          <DataClient>{children}</DataClient>
        </div>
      </body>
    </html>
  );
}
