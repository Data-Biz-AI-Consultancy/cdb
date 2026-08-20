import type { Metadata } from 'next';
import './globals.css';
import SimpleNav from '@/components/SimpleNav';

export const metadata: Metadata = {
  title: 'CDB — Client DataBase',
  description: 'AI & ML-native personal CRM & CDP',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <SimpleNav />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
