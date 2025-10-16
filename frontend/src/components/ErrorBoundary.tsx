import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, AlertCircle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Log error details
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };

    // Send to custom error tracking
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Uncomment when Sentry is integrated
      // Sentry.captureException(error, { extra: errorInfo });
      console.error('Production error:', errorDetails);
    }

    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;

    // Prevent infinite retry loops
    if (newRetryCount > 3) {
      this.setState({
        hasError: true,
        retryCount: newRetryCount,
        error: new Error('Too many retry attempts. Please refresh the page.')
      });
      return;
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: newRetryCount
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorContent() {
    // Use custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const { error, retryCount } = this.state;

    // Special handling for different error types
    if (error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk')) {
      return (
        <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Application Update Available
          </h2>
          <p className="text-yellow-700 mb-6">
            A new version of the application is available. Please reload the page to get the latest updates.
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }

    if (retryCount >= 3) {
      return (
        <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Something Went Wrong
          </h2>
          <p className="text-red-700 mb-2">
            We're having trouble loading this section after multiple attempts.
          </p>
          <p className="text-red-600 mb-6 text-sm">
            Please try refreshing the page or contact support if the problem persists.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an unexpected error. Please try again or refresh the page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={this.handleRetry}
            className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again {retryCount > 0 && `(${retryCount}/3)`}
          </button>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Reload Page
          </button>
        </div>

        {/* Error Details for Development */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 p-4 bg-red-100 rounded-lg text-left">
            <summary className="cursor-pointer text-sm font-medium text-red-800 mb-2">
              Error Details (Development Only)
            </summary>
            <div className="space-y-2">
              <div>
                <strong className="text-red-700">Error:</strong>
                <pre className="mt-1 text-xs text-red-600 overflow-auto bg-white p-2 rounded">
                  {error?.toString()}
                </pre>
              </div>
              <div>
                <strong className="text-red-700">Component Stack:</strong>
                <pre className="mt-1 text-xs text-red-600 overflow-auto bg-white p-2 rounded">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
              <div className="text-xs text-red-600">
                <strong>Retry Count:</strong> {retryCount}
              </div>
            </div>
          </details>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorContent();
    }

    return this.props.children;
  }
}

// Hook for error handling in functional components
export const useErrorHandler = () => {
  const handleError = (error: Error | string, context?: string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const contextMessage = context ? `[${context}] ${errorMessage}` : errorMessage;

    console.error('Application Error:', contextMessage);

    // In a real app, you would send this to your error reporting service
    // Example: Sentry.captureException(error, { tags: { context } });

    return errorMessage;
  };

  const handleAsyncError = async (asyncOperation: () => Promise<any>, context?: string) => {
    try {
      return await asyncOperation();
    } catch (error) {
      const errorMessage = handleError(error as Error, context);
      throw new Error(errorMessage);
    }
  };

  return { handleError, handleAsyncError };
};

// Specialized Error Boundaries for different parts of the app
export const TokenCreationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-600 mb-3">
          <AlertCircle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Token Creation Error</h2>
        </div>
        <p className="text-red-700 mb-4">
          We encountered an error while creating your token. Please try again.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/create'}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Create
          </button>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const TradingErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center gap-2 text-orange-600 mb-3">
          <AlertCircle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Trading Error</h2>
        </div>
        <p className="text-orange-700 mb-4">
          We encountered an error with the trading interface. Please refresh and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Refresh Trading
        </button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const GeneralErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <div className="flex items-center justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-gray-700 mb-6">
          We encountered an unexpected error. Please refresh the page and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

// Hook for error reporting (can be extended)
export const useErrorReporting = () => {
  const reportError = (error: Error, context?: string) => {
    console.error('Error reported:', error, context);

    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry or other service
      // Sentry.captureException(error, { tags: { context } });
    }
  };

  return { reportError };
};

// Component for displaying inline errors
interface ErrorDisplayProps {
  error: string | null;
  onDismiss?: () => void;
  variant?: 'inline' | 'toast' | 'card';
}

export const ErrorDisplay = ({ error, onDismiss, variant = 'inline' }: ErrorDisplayProps) => {
  if (!error) return null;

  const baseClasses = "flex items-center gap-2 text-sm p-3 rounded-lg";

  const variantClasses = {
    inline: "bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400",
    toast: "bg-red-500 text-white shadow-lg",
    card: "bg-card border border-border text-foreground"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]}`}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{error}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
};

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};