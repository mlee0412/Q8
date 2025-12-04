'use client';

import './globals.css';
import { SessionManager } from '@/components/auth/SessionManager';
import { SyncStatus } from '@/components/shared/SyncStatus';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Q8 - The Omni-Model Personal Assistant</title>
        <meta name="description" content="Local-First Multi-Agent AI Dashboard" />
      </head>
      <body className="antialiased">
        <SessionManager>
          {children}
          <SyncStatus />
          <OfflineIndicator />
        </SessionManager>
      </body>
    </html>
  );
}
