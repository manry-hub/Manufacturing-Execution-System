import React from 'react';
import type { NormalizedMachineStatus } from '../../types/machine.js';

interface StatusBadgeProps {
  status: NormalizedMachineStatus | string;
  isBold?: boolean;
  size?: 'sm' | 'md';
}

function toSentenceCase(str: string): string {
  if (!str) return '';
  const clean = str.replace(/_/g, ' ').toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  isBold = false,
  size = 'sm',
}) => {
  const normalized = status.toUpperCase();
  const label = toSentenceCase(status);

  // Atlassian Lozenge semantic mapping per DESIGN.md
  let styles = 'bg-[#F1F2F4] text-[#505258] border-[#DCDFE4]';

  switch (normalized) {
    case 'RUNNING':
    case 'ACTIVE':
    case 'ONLINE':
      styles = isBold
        ? 'bg-[#5B7F24] text-[#FFFFFF] border-[#37471F]'
        : 'bg-[#EFFFD6] text-[#37471F] border-[#6A9A23]';
      break;

    case 'IDLE':
    case 'PAUSED':
    case 'PENDING':
    case 'SLOW':
      styles = isBold
        ? 'bg-[#BD5B00] text-[#FFFFFF] border-[#693200]'
        : 'bg-[#FFF5DB] text-[#693200] border-[#E06C00]';
      break;

    case 'FAULT':
    case 'CRITICAL':
    case 'CANCELLED':
      styles = isBold
        ? 'bg-[#C9372C] text-[#FFFFFF] border-[#5D1F1A]'
        : 'bg-[#FFECEB] text-[#5D1F1A] border-[#E2483D]';
      break;

    case 'SETUP':
    case 'IN_PROGRESS':
    case 'RELEASED':
      styles = isBold
        ? 'bg-[#1558BC] text-[#FFFFFF] border-[#123263]'
        : 'bg-[#E9F2FE] text-[#123263] border-[#357DE8]';
      break;

    case 'STOPPED':
    case 'COMPLETED':
    case 'RESOLVED':
      styles = isBold
        ? 'bg-[#505258] text-[#FFFFFF] border-[#1E1F21]'
        : 'bg-[#F1F2F4] text-[#505258] border-[#DCDFE4]';
      break;

    case 'DISCONNECTED':
    case 'OFFLINE':
      styles = isBold
        ? 'bg-[#7D818A] text-[#FFFFFF] border-[#505258]'
        : 'bg-[#F1F2F4] text-[#6B6E76] border-[#DCDFE4]';
      break;
  }

  const sizeClasses =
    size === 'md'
      ? 'text-xs font-semibold px-2 py-0.5 rounded-md min-h-[1.5rem]'
      : 'text-xs font-semibold px-1.5 py-0.5 rounded-[3px] min-h-[1.25rem]';

  return (
    <span
      className={`inline-flex items-center border ${styles} ${sizeClasses} leading-none`}
    >
      {label}
    </span>
  );
};
