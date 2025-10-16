/**
 * ErrorBoundary Component Tests
 * React Testing Library test suite for ErrorBoundary component and related utilities
 */

import React, { Component, ErrorInfo } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ErrorBoundary,
  useErrorHandler,
  TokenCreationErrorBoundary,
  TradingErrorBoundary,
  GeneralErrorBoundary,
  useErrorReporting,
  ErrorDisplay,
  withErrorBoundary,
} from '../ErrorBoundary';

// Mock console methods
const mockConsoleError = jest.fn();
const originalConsoleError = console.error;

// Mock window.location
const mockLocation = {
  href: '',
  reload: jest.fn(),
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Test User Agent',
  },
  writable: true,
});

// Mock process.env
const originalEnv = process.env;
beforeEach(() => {
  console.error = mockConsoleError;
  jest.clearAllMocks();
  mockLocation.href = '';
  mockLocation.reload.mockClear();
});

afterEach(() => {
  console.error = originalConsoleError;
  process.env = originalEnv;
});

// Test component that throws an error
class ThrowingComponent extends Component {
  componentDidMount() {
    throw new Error('Test error message');
  }

  render() {
    return <div>Should not render</div>;
  }
}

// Test component that throws different types of errors
class ChunkErrorComponent extends Component {
  componentDidMount() {
    const error = new Error('Loading chunk 123 failed');
    error.name = 'ChunkLoadError';
    throw error;
  }

  render() {
    return <div>Should not render</div>;
  }
}

// Test component with async error simulation
class AsyncErrorComponent extends Component {
  state = { shouldThrow: false };

  componentDidMount() {
    setTimeout(() => {
      this.setState({ shouldThrow: true });
    }, 100);
  }

  render() {
    if (this.state.shouldThrow) {
      throw new Error('Async error');
    }
    return <div>Initial render</div>;
  }
}

// Test component for successful rendering
const SuccessfulComponent: React.FC = () => <div>Success!</div>;

// Test component for error boundary props
interface TestComponentProps {
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: React.ReactNode;
}

const TestComponent: React.FC<TestComponentProps> = ({ onError, fallback }) => (
  <ErrorBoundary onError={onError} fallback={fallback}>
    <SuccessfulComponent />
  </ErrorBoundary>
);

describe('ErrorBoundary', () => {
  describe('Error Catching', () => {
    it('should catch and render error UI when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('We encountered an unexpected error. Please try again or refresh the page.')).toBeInTheDocument();
    });

    it('should render children normally when no error occurs', () => {
      render(
        <ErrorBoundary>
          <SuccessfulComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should call onError callback when provided', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should log error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Chunk Load Error Handling', () => {
    it('should display specific UI for chunk load errors', () => {
      render(
        <ErrorBoundary>
          <ChunkErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Application Update Available')).toBeInTheDocument();
      expect(screen.getByText('A new version of the application is available. Please reload the page to get the latest updates.')).toBeInTheDocument();
      expect(screen.getByText('Reload Application')).toBeInTheDocument();
    });

    it('should handle chunk error messages containing "Loading chunk"', () => {
      const ChunkErrorMessageComponent = () => {
        throw new Error('Loading chunk main.123.js failed');
      };

      expect(() => {
        render(
          <ErrorBoundary>
            <ChunkErrorMessageComponent />
          </ErrorBoundary>
        );
      }).not.toThrow();

      expect(screen.getByText('Application Update Available')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should allow retrying after error', async () => {
      let shouldThrow = true;
      const SometimesThrowingComponent = () => {
        if (shouldThrow) {
          throw new Error('Temporary error');
        }
        return <div>Success after retry!</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <SometimesThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Stop throwing and retry
      shouldThrow = false;
      const retryButton = screen.getByText('Try Again');
      await userEvent.click(retryButton);

      rerender(
        <ErrorBoundary>
          <SometimesThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Success after retry!')).toBeInTheDocument();
    });

    it('should limit retry attempts to 3', async () => {
      const AlwaysFailingComponent = () => {
        throw new Error('Persistent error');
      };

      render(
        <ErrorBoundary>
          <AlwaysFailingComponent />
        </ErrorBoundary>
      );

      // Click retry 3 times
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.getByText(`Try Again${i > 0 ? ` (${i}/3)` : ''}`);
        await userEvent.click(retryButton);
      }

      // Should show retry limit exceeded message
      expect(screen.getByText("We're having trouble loading this section after multiple attempts.")).toBeInTheDocument();
      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should prevent retry after 3 attempts', async () => {
      const AlwaysFailingComponent = () => {
        throw new Error('Persistent error');
      };

      render(
        <ErrorBoundary>
          <AlwaysFailingComponent />
        </ErrorBoundary>
      );

      // Click retry 3 times
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.getByText(`Try Again${i > 0 ? ` (${i}/3)` : ''}`);
        await userEvent.click(retryButton);
      }

      // Should not have retry button anymore
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
      expect(screen.getByText('Too many retry attempts. Please refresh the page.')).toBeInTheDocument();
    });
  });

  describe('Navigation Actions', () => {
    it('should reload page when reload button is clicked', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Page');
      await userEvent.click(reloadButton);

      expect(mockLocation.reload).toHaveBeenCalled();
    });

    it('should navigate home when go home button is clicked (after retry limit)', async () => {
      const AlwaysFailingComponent = () => {
        throw new Error('Persistent error');
      };

      render(
        <ErrorBoundary>
          <AlwaysFailingComponent />
        </ErrorBoundary>
      );

      // Click retry 3 times to trigger retry limit
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.getByText(`Try Again${i > 0 ? ` (${i}/3)` : ''}`);
        await userEvent.click(retryButton);
      }

      const goHomeButton = screen.getByText('Go Home');
      await userEvent.click(goHomeButton);

      expect(mockLocation.href).toBe('/');
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should show error details in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
    });

    it('should allow expanding error details', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const detailsSummary = screen.getByText('Error Details (Development Only)');
      await userEvent.click(detailsSummary);

      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Component Stack:')).toBeInTheDocument();
      expect(screen.getByText('Retry Count:')).toBeInTheDocument();
    });

    it('should display actual error message in development', async () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const detailsSummary = screen.getByText('Error Details (Development Only)');
      await userEvent.click(detailsSummary);

      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should hide error details in production mode', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();
    });

    it('should log production error details', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Production error:',
        expect.objectContaining({
          message: 'Test error message',
          timestamp: expect.any(String),
          userAgent: 'Test User Agent',
          url: '',
          retryCount: 0,
        })
      );
    });
  });
});

describe('Specialized Error Boundaries', () => {
  it('TokenCreationErrorBoundary should render token creation specific UI', () => {
    render(
      <TokenCreationErrorBoundary>
        <ThrowingComponent />
      </TokenCreationErrorBoundary>
    );

    expect(screen.getByText('Token Creation Error')).toBeInTheDocument();
    expect(screen.getByText('We encountered an error while creating your token. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Back to Create')).toBeInTheDocument();
  });

  it('TradingErrorBoundary should render trading specific UI', () => {
    render(
      <TradingErrorBoundary>
        <ThrowingComponent />
      </TradingErrorBoundary>
    );

    expect(screen.getByText('Trading Error')).toBeInTheDocument();
    expect(screen.getByText('We encountered an error with the trading interface. Please refresh and try again.')).toBeInTheDocument();
    expect(screen.getByText('Refresh Trading')).toBeInTheDocument();
  });

  it('GeneralErrorBoundary should render general error UI', () => {
    render(
      <GeneralErrorBoundary>
        <ThrowingComponent />
      </GeneralErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We encountered an unexpected error. Please refresh the page and try again.')).toBeInTheDocument();
    expect(screen.getByText('Refresh Page')).toBeInTheDocument();
  });
});

describe('useErrorHandler Hook', () => {
  const TestHookComponent: React.FC = () => {
    const { handleError, handleAsyncError } = useErrorHandler();

    const handleSyncError = () => {
      handleError(new Error('Sync error'), 'test-context');
    };

    const handleAsyncErrorClick = async () => {
      try {
        await handleAsyncError(async () => {
          throw new Error('Async error');
        }, 'async-context');
      } catch (error) {
        // Expected to throw
      }
    };

    return (
      <div>
        <button onClick={handleSyncError}>Trigger Sync Error</button>
        <button onClick={handleAsyncErrorClick}>Trigger Async Error</button>
      </div>
    );
  };

  it('should handle sync errors with context', async () => {
    render(<TestHookComponent />);

    const syncButton = screen.getByText('Trigger Sync Error');
    await userEvent.click(syncButton);

    expect(mockConsoleError).toHaveBeenCalledWith('Application Error:', '[test-context] Sync error');
  });

  it('should handle async errors with context', async () => {
    render(<TestHookComponent />);

    const asyncButton = screen.getByText('Trigger Async Error');
    await userEvent.click(asyncButton);

    expect(mockConsoleError).toHaveBeenCalledWith('Application Error:', '[async-context] Async error');
  });

  it('should handle string errors', async () => {
    const TestStringErrorComponent: React.FC = () => {
      const { handleError } = useErrorHandler();

      return (
        <button onClick={() => handleError('String error message', 'string-context')}>
          Trigger String Error
        </button>
      );
    };

    render(<TestStringErrorComponent />);

    const button = screen.getByText('Trigger String Error');
    await userEvent.click(button);

    expect(mockConsoleError).toHaveBeenCalledWith('Application Error:', '[string-context] String error message');
  });
});

describe('useErrorReporting Hook', () => {
  const TestReportingComponent: React.FC = () => {
    const { reportError } = useErrorReporting();

    return (
      <button onClick={() => reportError(new Error('Reported error'), 'test-reporting')}>
        Report Error
      </button>
    );
  };

  it('should report errors in development', () => {
    process.env.NODE_ENV = 'development';

    render(<TestReportingComponent />);

    const button = screen.getByText('Report Error');
    userEvent.click(button);

    expect(mockConsoleError).toHaveBeenCalledWith('Error reported:', expect.any(Error), 'test-reporting');
  });

  it('should report errors in production', () => {
    process.env.NODE_ENV = 'production';

    render(<TestReportingComponent />);

    const button = screen.getByText('Report Error');
    userEvent.click(button);

    expect(mockConsoleError).toHaveBeenCalledWith('Error reported:', expect.any(Error), 'test-reporting');
  });
});

describe('ErrorDisplay Component', () => {
  it('should display error message when provided', () => {
    render(<ErrorDisplay error="Test error message" />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should not display anything when error is null', () => {
    render(<ErrorDisplay error={null} />);

    expect(screen.queryByText('Test error message')).not.toBeInTheDocument();
  });

  it('should show dismiss button when onDismiss is provided', async () => {
    const onDismiss = jest.fn();
    render(<ErrorDisplay error="Test error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByText('×');
    await userEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should apply correct variant classes', () => {
    const { rerender } = render(<ErrorDisplay error="Test error" variant="inline" />);
    expect(screen.getByText('Test error').parentElement).toHaveClass('bg-red-50', 'border', 'border-red-200');

    rerender(<ErrorDisplay error="Test error" variant="toast" />);
    expect(screen.getByText('Test error').parentElement).toHaveClass('bg-red-500', 'text-white');

    rerender(<ErrorDisplay error="Test error" variant="card" />);
    expect(screen.getByText('Test error').parentElement).toHaveClass('bg-card', 'border', 'border-border');
  });
});

describe('withErrorBoundary HOC', () => {
  const SafeComponent: React.FC = () => <div>Safe component</div>;
  const UnsafeComponent: React.FC = () => {
    throw new Error('Component error');
  };

  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(SafeComponent);
    render(<WrappedComponent />);

    expect(screen.getByText('Safe component')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(UnsafeComponent);
    render(<WrappedComponent />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should use custom fallback when provided', () => {
    const customFallback = <div>Custom fallback</div>;
    const WrappedComponent = withErrorBoundary(UnsafeComponent, customFallback);
    render(<WrappedComponent />);

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should set correct display name', () => {
    const WrappedComponent = withErrorBoundary(SafeComponent);
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(SafeComponent)');
  });

  it('should handle components without display name', () => {
    const AnonymousComponent = () => <div>Anonymous</div>;
    const WrappedComponent = withErrorBoundary(AnonymousComponent);
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(AnonymousComponent)');
  });
});

describe('Error Boundary Integration', () => {
  it('should handle nested error boundaries', () => {
    const NestedErrorComponent = () => {
      throw new Error('Nested error');
    };

    render(
      <ErrorBoundary>
        <div>
          <ErrorBoundary>
            <NestedErrorComponent />
          </ErrorBoundary>
        </div>
      </ErrorBoundary>
    );

    // Inner error boundary should catch the error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle errors in error boundary fallback (rare edge case)', () => {
    const FallbackWithError = () => {
      throw new Error('Fallback error');
    };

    render(
      <ErrorBoundary fallback={<FallbackWithError />}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    // This is a rare edge case - if the fallback also throws, React will show its error boundary
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle errors during async operations', async () => {
    render(
      <ErrorBoundary>
        <AsyncErrorComponent />
      </ErrorBoundary>
    );

    // Initially should show normal content
    expect(screen.getByText('Initial render')).toBeInTheDocument();

    // Wait for async error
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});