'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface NotificationContextType {
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type, isVisible: true });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const getIcon = () => {
    if (!notification) return null;
    
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-400" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-400" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-400" />;
      default:
        return <InformationCircleIcon className="w-6 h-6 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    if (!notification) return '';
    
    switch (notification.type) {
      case 'success':
        return 'bg-green-900/90 border-green-500';
      case 'error':
        return 'bg-red-900/90 border-red-500';
      case 'info':
        return 'bg-blue-900/90 border-blue-500';
      default:
        return 'bg-blue-900/90 border-blue-500';
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className={`${getBgColor()} backdrop-blur-sm rounded-lg border p-4 shadow-lg`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {getIcon()}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {notification.message}
                </p>
              </div>
              
              <button
                onClick={hideNotification}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
