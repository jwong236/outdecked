'use client';

import React from 'react';
import Image from 'next/image';

interface TriggerIconProps {
  iconSrc: string;
  iconAlt: string;
  text: string;
  className?: string;
}

export function TriggerIcon({ 
  iconSrc, 
  iconAlt, 
  text, 
  className = '' 
}: TriggerIconProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-3 flex-1 min-w-0 ${className}`}>
      <div className="flex flex-col items-center text-center h-full justify-center">
        {/* Icon on first line */}
        <div className="mb-2">
          <Image
            src={iconSrc}
            alt={iconAlt}
            width={16}
            height={16}
            className="h-4 w-4"
          />
        </div>
        {/* Text on second line */}
        <span className="font-medium text-sm text-green-400 leading-none">
          {text}
        </span>
      </div>
    </div>
  );
}
