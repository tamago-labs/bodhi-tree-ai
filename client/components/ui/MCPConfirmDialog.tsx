'use client';

import { useState } from 'react';
import { BaseModal, ModalBody, ModalFooter } from './BaseModal';
import { AlertTriangle, Pause, Play, Trash2, Loader2 } from 'lucide-react';

interface ToggleAutoStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  currentAutoStart: boolean;
  onConfirm: () => void;
  loading?: boolean;
}

export function ToggleAutoStartDialog({
  open,
  onOpenChange,
  serverName,
  currentAutoStart,
  onConfirm,
  loading = false
}: ToggleAutoStartDialogProps) {
  const isDisabling = currentAutoStart;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={`${isDisabling ? 'Disable' : 'Enable'} Auto-Start`}
      size="md"
      preventClose={loading}
    >
      <ModalBody>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${
            isDisabling ? 'bg-amber-100' : 'bg-blue-100'
          }`}>
            {isDisabling ? (
              <Pause className="w-6 h-6 text-amber-600" />
            ) : (
              <Play className="w-6 h-6 text-blue-600" />
            )}
          </div>
          
          <div className="flex-1">
            <p className="text-gray-600 mb-4">
              Are you sure you want to {isDisabling ? 'disable' : 'enable'} auto-start for the MCP server "<strong>{serverName}</strong>"?
            </p>

            <div className={`p-4 rounded-lg ${
              isDisabling ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  isDisabling ? 'text-amber-600' : 'text-blue-600'
                }`} />
                <div>
                  <p className={`text-sm font-medium ${
                    isDisabling ? 'text-amber-900' : 'text-blue-900'
                  }`}>
                    {isDisabling ? 'Auto-Start Disabled' : 'Auto-Start Enabled'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    isDisabling ? 'text-amber-700' : 'text-blue-700'
                  }`}>
                    {isDisabling 
                      ? 'This server will no longer automatically start. You will need to manually start it.'
                      : 'This server will automatically start.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <br/>

      <ModalFooter>
        <button
          onClick={() => onOpenChange(false)}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 ${
            isDisabling
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {isDisabling ? 'Disable Auto-Start' : 'Enable Auto-Start'}
        </button>
      </ModalFooter>
    </BaseModal>
  );
}

interface DeleteServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteServerDialog({
  open,
  onOpenChange,
  serverName,
  onConfirm,
  loading = false
}: DeleteServerDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Delete MCP Server"
      size="md"
      preventClose={loading}
    >
      <ModalBody>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-red-100">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          
          <div className="flex-1">
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete the MCP server "<strong>{serverName}</strong>"? This action cannot be undone.
            </p>

            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    This action is irreversible
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Deleting this server will remove it and stop any running instances. All configuration will be lost.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalBody>

      <br/>

      <ModalFooter>
        <button
          onClick={() => onOpenChange(false)}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
        >
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          Delete Server
        </button>
      </ModalFooter>
    </BaseModal>
  );
}
