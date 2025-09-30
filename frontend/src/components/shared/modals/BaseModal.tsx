'use client';

import { ReactNode, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Base modal props interface
interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  className?: string;
}

// Theme-specific props
interface StandardModalProps extends BaseModalProps {
  title?: string;
  icon?: ReactNode;
}

interface WarningModalProps extends BaseModalProps {
  title?: string;
  icon?: ReactNode;
}

interface CardDetailModalProps extends BaseModalProps {
  // No additional props needed for card detail theme
}

// Size configurations
const sizeConfig = {
  sm: 'max-w-md',
  md: 'max-w-lg', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl'
};

// Base modal component with theme support
function BaseModal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  className = '',
  theme = 'standard'
}: BaseModalProps & { theme: 'standard' | 'warning' | 'card-detail' }) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Theme configurations
  const themeConfig = {
    standard: {
      backdrop: 'bg-black/70',
      container: 'bg-gray-900/95',
      border: 'border-white/10'
    },
    warning: {
      backdrop: 'bg-black/50',
      container: 'bg-white/10',
      border: 'border-white/20'
    },
    'card-detail': {
      backdrop: 'bg-gray-900/95',
      container: 'bg-gray-900/95',
      border: 'border-white/10'
    }
  };

  const currentTheme = themeConfig[theme];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 ${currentTheme.backdrop} backdrop-blur-sm flex items-center justify-center z-50 p-4`}
      onClick={handleBackdropClick}
    >
      <div className={`
        ${currentTheme.container} 
        backdrop-blur-sm 
        rounded-xl 
        shadow-2xl 
        ${currentTheme.border} 
        ${sizeConfig[size]} 
        w-full 
        max-h-[90vh] 
        overflow-y-auto
        ${className}
      `}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
          aria-label="Close modal"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        {children}
      </div>
    </div>
  );
}

// Standard Modal (Dark Theme)
export function StandardModal({
  isOpen,
  onClose,
  children,
  title,
  icon,
  size = 'md',
  closeOnBackdropClick = true,
  className = ''
}: StandardModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      closeOnBackdropClick={closeOnBackdropClick}
      className={`p-6 ${className}`}
      theme="standard"
    >
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-6">
          {icon && (
            <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
              {icon}
            </div>
          )}
          {title && (
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          )}
        </div>
      )}
      {children}
    </BaseModal>
  );
}

// Warning Modal (Translucent Theme)
export function WarningModal({
  isOpen,
  onClose,
  children,
  title,
  icon,
  size = 'md',
  closeOnBackdropClick = true,
  className = ''
}: WarningModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      closeOnBackdropClick={closeOnBackdropClick}
      className={`p-6 ${className}`}
      theme="warning"
    >
      {(title || icon) && (
        <div className="flex items-center gap-3 mb-6">
          {icon && (
            <div className="w-10 h-10 bg-yellow-600/20 rounded-full flex items-center justify-center">
              {icon}
            </div>
          )}
          {title && (
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          )}
        </div>
      )}
      {children}
    </BaseModal>
  );
}

// Card Detail Modal (Overlay Theme)
export function CardDetailModal({
  isOpen,
  onClose,
  children,
  size = 'xl',
  closeOnBackdropClick = true,
  className = ''
}: CardDetailModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      closeOnBackdropClick={closeOnBackdropClick}
      className={className}
      theme="card-detail"
    >
      {children}
    </BaseModal>
  );
}
