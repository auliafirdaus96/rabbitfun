import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  Search,
  WifiOff,
  Database,
  Lock,
  Zap,
  Bug,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Base Error Page Component
export const ErrorPage: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  showRetry?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  onRetry?: () => void;
  customActions?: React.ReactNode;
}> = ({
  title,
  description,
  icon,
  showRetry = true,
  showHome = true,
  showBack = true,
  onRetry,
  customActions
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto border-border/50 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {icon || <AlertTriangle className="h-16 w-16 text-destructive" />}
          </div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {customActions}

          <div className="flex flex-col sm:flex-row gap-2">
            {showRetry && (
              <Button
                onClick={onRetry || (() => window.location.reload())}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}

            {showHome && (
              <Button
                onClick={() => navigate('/')}
                className="flex-1"
                variant="outline"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
          </div>

          {showBack && (
            <Button
              onClick={() => navigate(-1)}
              className="w-full"
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// 404 Not Found Page
export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary/20 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-foreground mb-4">Page Not Found</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Oops! The page you're looking for seems to have hopped away.
            Let's get you back to the main trail.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              <Home className="h-5 w-5 mr-2" />
              Go Home
            </Button>

            <Button
              onClick={() => navigate(-1)}
              size="lg"
              variant="outline"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Previous Page
            </Button>
          </div>

          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-3">Looking for something specific?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: 'Tokens', path: '/' },
                { label: 'Create Token', path: '/launchpad' },
                { label: 'Dashboard', path: '/creator-dashboard' }
              ].map((item) => (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Network Error Page
export const NetworkErrorPage: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => {
  return (
    <ErrorPage
      title="Connection Error"
      description="Unable to connect to our servers. Please check your internet connection and try again."
      icon={<WifiOff className="h-16 w-16 text-destructive" />}
      onRetry={onRetry}
      showRetry={true}
      showHome={false}
      showBack={false}
    />
  );
};

// Server Error Page
export const ServerErrorPage: React.FC<{
  onRetry?: () => void;
}> = ({ onRetry }) => {
  return (
    <ErrorPage
      title="Server Error"
      description="Something went wrong on our end. Our team has been notified and is working on a fix."
      icon={<Database className="h-16 w-16 text-destructive" />}
      onRetry={onRetry}
      showRetry={true}
      showHome={false}
      showBack={false}
    />
  );
};

// Unauthorized Access Page
export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ErrorPage
      title="Access Denied"
      description="You don't have permission to access this page. Please connect your wallet or check your permissions."
      icon={<Lock className="h-16 w-16 text-warning" />}
      showRetry={false}
      showHome={true}
      showBack={true}
      customActions={
        <Button
          onClick={() => navigate('/')}
          className="w-full"
          variant="default"
        >
          Connect Wallet
        </Button>
      }
    />
  );
};

// Maintenance Page
export const MaintenancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-lg mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-6">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">Under Maintenance</h1>
          <p className="text-muted-foreground text-lg mb-8">
            We're currently performing some upgrades to make Rabbit Launchpad even better.
            We'll be back shortly!
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-2">What's happening?</h3>
            <p className="text-sm text-muted-foreground">
              We're upgrading our systems to improve performance and add new features.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold text-foreground mb-2">Expected downtime</h3>
            <p className="text-sm text-muted-foreground">
              Approximately 2-3 hours. We appreciate your patience!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Status
            </Button>

            <Button
              onClick={() => window.open('https://twitter.com/RabbitLaunchpad', '_blank')}
              variant="ghost"
            >
              Follow Updates
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rate Limit Page
export const RateLimitPage: React.FC = () => {
  return (
    <ErrorPage
      title="Rate Limit Exceeded"
      description="You've made too many requests. Please wait a moment before trying again."
      icon={<Shield className="h-16 w-16 text-warning" />}
      showRetry={false}
      showHome={true}
      showBack={true}
      customActions={
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Rate limits reset every minute. You can try again in a few moments.
          </p>
        </div>
      }
    />
  );
};

// Development Error Page (for debugging)
export const DevelopmentErrorPage: React.FC<{
  error: Error;
  errorInfo: React.ErrorInfo;
}> = ({ error, errorInfo }) => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Bug className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-4">Development Error</h1>
          <p className="text-muted-foreground">
            An error occurred in the application. This is only visible in development mode.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Error Message</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                {error.message}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-64">
                {error.stack}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Component Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-64">
                {errorInfo.componentStack}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Smart Error Handler Component
export const SmartErrorHandler: React.FC<{
  error?: Error;
  errorInfo?: React.ErrorInfo;
  fallback?: React.ReactNode;
  onRetry?: () => void;
}> = ({ error, errorInfo, fallback, onRetry }) => {
  const getErrorType = (error: Error) => {
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'network';
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'unauthorized';
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return 'not-found';
    }
    if (error.message.includes('429') || error.message.includes('Rate limit')) {
      return 'rate-limit';
    }
    if (error.message.includes('500') || error.message.includes('Server Error')) {
      return 'server';
    }
    return 'generic';
  };

  if (!error) {
    return <>{fallback}</>;
  }

  const errorType = getErrorType(error);

  switch (errorType) {
    case 'network':
      return <NetworkErrorPage onRetry={onRetry} />;
    case 'unauthorized':
      return <UnauthorizedPage />;
    case 'not-found':
      return <NotFoundPage />;
    case 'rate-limit':
      return <RateLimitPage />;
    case 'server':
      return <ServerErrorPage onRetry={onRetry} />;
    case 'generic':
      return (
        <ErrorPage
          title="Something Went Wrong"
          description="An unexpected error occurred. Please try again later."
          icon={<AlertTriangle className="h-16 w-16 text-destructive" />}
          onRetry={onRetry}
        />
      );
    default:
      return <>{fallback}</>;
  }
};

export default {
  ErrorPage,
  NotFoundPage,
  NetworkErrorPage,
  ServerErrorPage,
  UnauthorizedPage,
  MaintenancePage,
  RateLimitPage,
  DevelopmentErrorPage,
  SmartErrorHandler,
};