'use client';

import { cn } from '@/lib/utils';

interface StatusWidgetProps {
  title: string;
  status: 'online' | 'offline' | 'syncing';
  children?: React.ReactNode;
}

export function StatusWidget({ title, status, children }: StatusWidgetProps) {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    syncing: 'bg-yellow-500 animate-pulse',
  };

  return (
    <div className="p-4 h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <h3 className="text-white/80 font-medium text-sm truncate">{title}</h3>
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0 ml-2', statusColors[status])} />
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">{children}</div>
    </div>
  );
}
