'use client';

import React from 'react';
import { WarningModal } from './BaseModal';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export function SignInModal({ 
  isOpen, 
  onClose, 
  title = "Sign In Required",
  message = "You need to be signed in to access this feature. Sign in to save your progress and access your personal collection."
}: SignInModalProps) {
  const lockIcon = (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );

  return (
    <WarningModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={lockIcon}
      size="sm"
    >
      <div className="text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h4 className="text-xl font-semibold text-white mb-2">{title}</h4>
          <p className="text-gray-300 mb-6">
            {message}
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              onClose();
              window.location.href = '/auth?mode=login';
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => {
              onClose();
              window.location.href = '/auth?mode=register';
            }}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    </WarningModal>
  );
}
