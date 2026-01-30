// ============================================
// BADGE COMPONENT
// ============================================

import React from 'react';
import type { BMIStatus, HFAStatus } from '@/types';
import { getBMIStatusColor, getHFAStatusColor } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-cyan-100 text-cyan-800',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-block rounded font-medium whitespace-nowrap ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}

// ============================================
// BMI STATUS BADGE
// ============================================

interface BMIStatusBadgeProps {
  status: BMIStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function BMIStatusBadge({ status, size = 'md' }: BMIStatusBadgeProps) {
  const colorClass = getBMIStatusColor(status);
  
  return (
    <span
      className={`inline-block rounded font-medium whitespace-nowrap ${colorClass} ${sizeClasses[size]}`}
    >
      {status}
    </span>
  );
}

// ============================================
// HFA STATUS BADGE
// ============================================

interface HFAStatusBadgeProps {
  status: HFAStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function HFAStatusBadge({ status, size = 'md' }: HFAStatusBadgeProps) {
  const colorClass = getHFAStatusColor(status);
  
  return (
    <span
      className={`inline-block rounded font-medium whitespace-nowrap ${colorClass} ${sizeClasses[size]}`}
    >
      {status}
    </span>
  );
}

// ============================================
// STATUS BADGE (GENERAL)
// ============================================

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'ended':
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const colorClass = getStatusColor(status);

  return (
    <span
      className={`inline-block rounded font-semibold whitespace-nowrap ${colorClass} ${sizeClasses[size]}`}
    >
      {status}
    </span>
  );
}
