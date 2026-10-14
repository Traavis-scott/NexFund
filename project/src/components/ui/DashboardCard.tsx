import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function DashboardCard({ title, children, className }: DashboardCardProps) {
  return (
    <div className={cn("bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-md p-6", className)}>
      <h2 className="text-xl font-semibold mb-4 text-foreground">{title}</h2>
      {children}
    </div>
  );
}