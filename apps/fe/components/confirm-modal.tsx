import React, { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'warning'
}: ConfirmModalProps) {
  // Listen for Escape key press to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="size-6 text-rose-500" />;
      case 'info':
        return <Info className="size-6 text-primary" />;
      case 'warning':
      default:
        return <AlertTriangle className="size-6 text-amber-500" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-500/20';
      case 'info':
        return 'bg-primary text-primary-foreground hover:bg-primary/95 focus:ring-primary/20';
      case 'warning':
      default:
        return 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-[2rem] border border-border bg-card p-6 text-left align-middle shadow-xl transition-all animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition cursor-pointer"
          aria-label="Đóng"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`flex shrink-0 items-center justify-center rounded-2xl p-3 ${
            variant === 'danger' ? 'bg-rose-500/10 dark:bg-rose-500/25' : 
            variant === 'info' ? 'bg-primary/10 dark:bg-primary/25' : 
            'bg-amber-500/10 dark:bg-amber-500/25'
          }`}>
            {getIcon()}
          </div>
          
          <div className="flex-1 space-y-1">
            <h3 className="text-lg font-black leading-6 text-foreground">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition cursor-pointer animate-in fade-in"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-6 py-2.5 text-sm font-bold shadow-sm transition active:translate-y-px focus:outline-none focus:ring-4 cursor-pointer ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
