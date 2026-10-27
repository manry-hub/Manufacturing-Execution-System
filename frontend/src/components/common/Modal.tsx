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
      className={`fixed inset-0 m-auto p-0 rounded-xl bg-[#FFFFFF] border border-[#0B120E24] text-[#292A2E] shadow-2xl w-full ${maxWidthClass} overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#0B120E24] px-6 py-4 bg-[#FFFFFF]">
        <h2 id={titleId} className="text-base font-semibold text-[#292A2E]">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-md p-1.5 text-[#505258] hover:text-[#292A2E] hover:bg-[#091E420F] transition-colors focus-visible:outline-2 focus-visible:outline-[#4688EC]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 max-h-[80vh] overflow-y-auto overscroll-contain bg-[#FFFFFF]">
        {children}
      </div>
    </dialog>
  );
};
