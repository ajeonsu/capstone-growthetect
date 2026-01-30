// ============================================
// CARD COMPONENT
// ============================================

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const shadowClasses = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
};

export function Card({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-lg ${shadowClasses[shadow]} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================
// CARD WITH HEADER
// ============================================

interface CardWithHeaderProps extends CardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardWithHeader({
  title,
  subtitle,
  action,
  children,
  className = '',
  shadow = 'md',
}: CardWithHeaderProps) {
  return (
    <div
      className={`bg-white rounded-lg ${shadowClasses[shadow]} overflow-hidden ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink';
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    iconBg: 'bg-green-100',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    iconBg: 'bg-red-100',
  },
  yellow: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
  pink: {
    bg: 'bg-pink-100',
    text: 'text-pink-600',
    iconBg: 'bg-pink-100',
  },
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  className = '',
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase">{title}</p>
          <p className={`text-3xl font-bold ${colors.text} mt-2`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm">
              {trend.direction === 'up' ? (
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              )}
              <span className={trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                {trend.value}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`${colors.iconBg} rounded-full p-3`}>{icon}</div>
        )}
      </div>
    </div>
  );
}
