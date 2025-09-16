'use client';

import { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageTitle({ title, icon, actions, className = '' }: PageTitleProps) {
  return (
    <div className={`px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white flex items-center">
              {icon && <span className="mr-3">{icon}</span>}
              {title}
            </h1>
          </div>
          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
