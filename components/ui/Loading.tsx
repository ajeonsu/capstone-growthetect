// ============================================
// LOADING COMPONENTS
// ============================================

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray';
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

const spinnerColors = {
  primary: 'border-blue-600',
  white: 'border-white',
  gray: 'border-gray-600',
};

export function LoadingSpinner({ size = 'md', color = 'primary' }: LoadingSpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-b-2 ${spinnerSizes[size]} ${spinnerColors[color]}`}
    />
  );
}

// ============================================
// FULL PAGE LOADING
// ============================================

interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = 'Loading...' }: FullPageLoadingProps) {
  return (
    <div className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
        <LoadingSpinner size="xl" />
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

// ============================================
// SECTION LOADING
// ============================================

interface SectionLoadingProps {
  message?: string;
}

export function SectionLoading({ message = 'Loading...' }: SectionLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}

// ============================================
// SKELETON LOADER
// ============================================

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = 'w-full', height = 'h-4', className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${width} ${height} ${className}`} />
  );
}

// ============================================
// TABLE SKELETON
// ============================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width="flex-1" height="h-8" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================
// CARD SKELETON
// ============================================

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <Skeleton width="w-1/2" height="h-6" />
      <Skeleton width="w-full" height="h-4" />
      <Skeleton width="w-3/4" height="h-4" />
    </div>
  );
}
