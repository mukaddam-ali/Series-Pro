import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Series Player Pro',
  description: 'Fast and professional local video streaming',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
