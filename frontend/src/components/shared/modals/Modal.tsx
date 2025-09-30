'use client';

import { ReactNode } from 'react';
import { StandardModal } from './BaseModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      className={className}
    >
      <div className="text-center">
        {children}
      </div>
    </StandardModal>
  );
}
