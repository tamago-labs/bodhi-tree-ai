'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  preventClose?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] w-full'
};

export function BaseModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  showCloseButton = true,
  preventClose = false,
  size = 'md'
}: BaseModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={preventClose ? undefined : onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
            sizeClasses[size],
            className
          )}
        >
          {/* Always include DialogTitle for accessibility - hide it visually if no title */}
          <Dialog.Title className={title ? "sr-only" : "sr-only"}>
            {title || "Dialog"}
          </Dialog.Title>
          
          {description && (
            <Dialog.Description className="sr-only">
              {description}
            </Dialog.Description>
          )}
          
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                {title && (
                  <h2 className="text-lg font-semibold leading-none tracking-tight">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-gray-600">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <Dialog.Close
                  className="rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Dialog.Close>
              )}
            </div>
          )}
          
          <div className="flex-1">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Modal Header component
interface ModalHeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ModalHeader({ title, description, children, className }: ModalHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {title && (
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-sm text-gray-600">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

// Modal Footer component
interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn("flex items-center justify-end gap-3 pt-4 border-t", className)}>
      {children}
    </div>
  );
}

// Modal Body component
interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn("flex-1", className)}>
      {children}
    </div>
  );
}
