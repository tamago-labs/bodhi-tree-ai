'use client';

import React from 'react';
import { BaseModal, ModalHeader, ModalBody, ModalFooter } from './BaseModal';
import { AlertTriangle, Trash2, Play, CheckCircle, Square } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantConfig = {
  danger: {
    icon: <Trash2 className="w-5 h-5 text-red-600" />,
    confirmClass: "bg-red-600 hover:bg-red-700 text-white",
    bgClass: "bg-red-50 border-red-200"
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    confirmClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
    bgClass: "bg-yellow-50 border-yellow-200"
  },
  info: {
    icon: <AlertTriangle className="w-5 h-5 text-blue-600" />,
    confirmClass: "bg-blue-600 hover:bg-blue-700 text-white",
    bgClass: "bg-blue-50 border-blue-200"
  },
  success: {
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    confirmClass: "bg-green-600 hover:bg-green-700 text-white",
    bgClass: "bg-green-50 border-green-200"
  }
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = 'warning',
  loading = false,
  icon
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const displayIcon = icon || config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      preventClose={loading}
    >
      <div className="flex flex-col items-center text-center py-4">
        <div className={`p-3 rounded-full ${config.bgClass} mb-4`}>
          {displayIcon}
        </div>
        
        <div className="space-y-2 mb-6">
          <p className="text-gray-700">{description}</p>
        </div>
      </div>

      <ModalFooter>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${config.confirmClass}`}
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {confirmText}
        </button>
      </ModalFooter>
    </BaseModal>
  );
}

// Specific confirmation dialogs for common actions

interface ActivateStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ActivateStrategyDialog({
  open,
  onOpenChange,
  strategyName,
  onConfirm,
  loading = false
}: ActivateStrategyDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Activate Strategy"
      description={`Are you sure you want to activate "${strategyName}"? The current active strategy will be deactivated.`}
      confirmText="Activate Strategy"
      onConfirm={onConfirm}
      variant="info"
      icon={<Play className="w-5 h-5 text-blue-600" />}
      loading={loading}
    />
  );
}

interface DeleteStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function DeleteStrategyDialog({
  open,
  onOpenChange,
  strategyName,
  onConfirm,
  loading = false
}: DeleteStrategyDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Strategy"
      description={`Are you sure you want to delete "${strategyName}"? This action cannot be undone.`}
      confirmText="Delete Strategy"
      onConfirm={onConfirm}
      variant="danger"
      loading={loading}
    />
  );
}

interface StopStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function StopStrategyDialog({
  open,
  onOpenChange,
  strategyName,
  onConfirm,
  loading = false
}: StopStrategyDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Stop Strategy"
      description={`Are you sure you want to stop "${strategyName}"? The agent will cease all trading activities.`}
      confirmText="Stop Strategy"
      onConfirm={onConfirm}
      variant="warning"
      icon={<Square className="w-5 h-5 text-red-600" />}
      loading={loading}
    />
  );
}
