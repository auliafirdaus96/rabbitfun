import React from 'react';
import { Loader2 } from 'lucide-react';

// Base Loading Spinner
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2
      className={`animate-spin ${sizeClasses[size]} ${className}`}
    />
  );
};

// Full Page Loading
export const FullPageLoader: React.FC<{
  message?: string;
}> = ({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-muted-foreground/20 border-t-primary"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg animate-pulse"></div>
        </div>
      </div>
      <p className="mt-4 text-muted-foreground text-sm animate-pulse">{message}</p>
    </div>
  );
};

// Card Skeleton Loader
export const CardSkeleton: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 1, className = '' }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`bg-card border border-border rounded-lg p-4 animate-pulse ${className}`}
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-muted rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </>
  );
};

// Token Card Skeleton
export const TokenCardSkeleton: React.FC<{
  count?: number;
}> = ({ count = 1 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-lg p-4 animate-pulse hover:shadow-lg transition-all duration-300"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-muted rounded-xl"></div>
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-3 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-muted rounded w-1/4"></div>
              <div className="h-3 bg-muted rounded w-1/3"></div>
            </div>
          </div>

          <div className="mt-4 h-8 bg-muted rounded-lg"></div>
        </div>
      ))}
    </div>
  );
};

// Table Skeleton
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-4 p-4 border-b border-border">
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={index}
            className="h-4 bg-muted rounded animate-pulse"
          ></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 p-4 border-b border-border last:border-b-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-3 bg-muted rounded animate-pulse"
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
};

// Button Loading State
export const LoadingButton: React.FC<{
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  disabled?: boolean;
}> = ({ children, loading = false, className = '', disabled = false }) => {
  return (
    <button
      className={`
        relative inline-flex items-center justify-center rounded-md text-sm font-medium
        transition-all duration-200 focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50
        disabled:pointer-events-none ring-offset-background
        bg-primary text-primary-foreground hover:bg-primary/90
        h-10 px-4 py-2
        ${className}
      `}
      disabled={loading || disabled}
    >
      {loading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      <span className={loading ? 'opacity-70' : ''}>
        {children}
      </span>
    </button>
  );
};

// Progress Loading Bar
export const ProgressBar: React.FC<{
  progress?: number;
  className?: string;
  showPercentage?: boolean;
}> = ({ progress = 0, className = '', showPercentage = false }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs text-muted-foreground">{clampedProgress}%</span>
        </div>
      )}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        >
          <div className="h-full bg-white/20 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

// Staggered Loading Animation
export const StaggeredLoader: React.FC<{
  items?: React.ReactNode[];
  delay?: number;
}> = ({ items = [], delay = 100 }) => {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="animate-fade-in"
          style={{ animationDelay: `${index * delay}ms` }}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

// Pulse Loading Effect
export const PulseLoader: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
};

// Shimmer Effect Component
export const Shimmer: React.FC<{
  className?: string;
  height?: string;
}> = ({ className = '', height = 'h-20' }) => {
  return (
    <div className={`loading-shimmer rounded-md ${height} ${className}`}></div>
  );
};

// Smart Loading Component that shows appropriate loader based on context
export const SmartLoader: React.FC<{
  type?: 'spinner' | 'skeleton' | 'progress' | 'pulse';
  context?: 'page' | 'card' | 'table' | 'button';
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}> = ({
  type = 'spinner',
  context = 'page',
  loading = true,
  children,
  className = '',
  ...props
}) => {
  if (!loading) {
    return <>{children}</>;
  }

  const renderLoader = () => {
    switch (type) {
      case 'skeleton':
        switch (context) {
          case 'card':
            return <CardSkeleton className={className} {...props} />;
          case 'table':
            return <TableSkeleton className={className} {...props} />;
          default:
            return <Shimmer className={className} {...props} />;
        }
      case 'progress':
        return <ProgressBar className={className} {...props} />;
      case 'pulse':
        return <PulseLoader className={className} {...props} />;
      default:
        return <LoadingSpinner className={className} {...props} />;
    }
  };

  if (context === 'page') {
    return <FullPageLoader className={className} {...props} />;
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {renderLoader()}
    </div>
  );
};

export default {
  LoadingSpinner,
  FullPageLoader,
  CardSkeleton,
  TokenCardSkeleton,
  TableSkeleton,
  LoadingButton,
  ProgressBar,
  StaggeredLoader,
  PulseLoader,
  Shimmer,
  SmartLoader,
};