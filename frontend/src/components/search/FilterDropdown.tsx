'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  getOptionClassName?: (option: DropdownOption) => string;
  getSelectedValueClassName?: (value: string) => string;
}

export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  getOptionClassName,
  getSelectedValueClassName,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isOpen]);

  // Close dropdown when clicking outside, scrolling, or when another dropdown button is clicked
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.filter-dropdown')) {
        setIsOpen(false);
      }
    };

    const handleOtherDropdownClick = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if click is on a dropdown button that's not this one
      if (target.closest('.filter-dropdown button') && !target.closest(`#dropdown-${label.replace(/\s+/g, '-').toLowerCase()}`)) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      const target = event.target;
      // Check if target is an Element and has the closest method
      if (target && typeof (target as Element).closest === 'function') {
        // Only close if scrolling outside the dropdown options
        if (!(target as Element).closest('.filter-dropdown-options')) {
          setIsOpen(false);
        }
      }
    };

    const handleWheel = (event: WheelEvent) => {
      const target = event.target;
      // Check if target is an Element and has the closest method
      if (target && typeof (target as Element).closest === 'function') {
        // Only close if scrolling outside the dropdown options
        if (!(target as Element).closest('.filter-dropdown-options')) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('click', handleOtherDropdownClick);
      document.addEventListener('scroll', handleScroll, true); // Use capture phase
      window.addEventListener('scroll', handleScroll, true); // Also listen on window
      document.addEventListener('wheel', handleWheel, true); // Listen for wheel events
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('click', handleOtherDropdownClick);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('wheel', handleWheel, true);
    };
  }, [isOpen, label]);

  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption?.label || placeholder;

  return (
    <div 
      id={`dropdown-${label.replace(/\s+/g, '-').toLowerCase()}`}
      className={`relative filter-dropdown ${className}`}
    >
      <label className="block text-sm font-medium text-white mb-2">
        {label}
      </label>
      <div className="relative">
        <button
          ref={buttonRef}
          className="relative w-full rounded-lg border border-gray-300 bg-white py-3 pl-3 pr-10 text-left shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 sm:text-sm transition-colors duration-200 hover:border-gray-400"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={`block truncate ${getSelectedValueClassName ? getSelectedValueClassName(value) : 'text-gray-900'}`}>
            {displayValue}
          </span>
        </button>

        {mounted && isOpen && buttonRect && createPortal(
          <div 
            className="fixed z-50 rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 filter-dropdown filter-dropdown-options max-h-96 overflow-y-auto"
            style={{
              top: buttonRect.bottom + 4,
              left: buttonRect.left,
              width: buttonRect.width,
            }}
          >
            {options.map((option) => {
              const customClassName = getOptionClassName ? getOptionClassName(option) : '';
              const defaultClassName = "relative w-full cursor-pointer select-none py-2 pl-10 pr-4 text-left hover:bg-blue-100 hover:text-blue-900";
              const defaultTextColor = "text-gray-900";
              const finalClassName = customClassName ? `${defaultClassName} ${customClassName}` : `${defaultClassName} ${defaultTextColor}`;
              
              return (
                <button
                  key={option.value}
                  className={finalClassName}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  disabled={option.disabled}
                >
                <span className="block truncate">
                  {option.label}
                </span>
                {value === option.value && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                    ✓
                  </span>
                )}
              </button>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
