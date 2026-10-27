import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = `modal-title-${title.toLowerCase().replace(/\s+/g, '-')}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle native cancel event (triggered by Escape key)
  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement, Event>) => {
    e.preventDefault();
    onClose();
  };

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      aria-labelledby={titleId}
      className={`fixed inset-0 m-auto p-0 rounded-2xl bg-slate-900 border border-slate-700/80 text-slate-100 shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm w-full ${maxWidthClass} overflow-hidden`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-100">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-6 max-h-[80vh] overflow-y-auto overscroll-contain">
        {children}
      </div>
    </dialog>
  );
};
