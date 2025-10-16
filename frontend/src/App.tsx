import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastContainer } from "@/components/CustomToast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { SearchProvider } from "@/contexts/SearchContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TokenDetailLoader, IndexLoader } from "@/components/RouteLoaders";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { routePreloader } from "@/utils/RoutePreloader";
import { performanceMonitor } from "@/utils/performanceMonitor";

// Lazy load route components with performance monitoring
const Index = lazy(() => {
  const endMeasure = performanceMonitor.measureComponentLoad('Index');
  return import("./pages/Index").finally(endMeasure);
});

const TokenDetail = lazy(() => {
  const endMeasure = performanceMonitor.measureComponentLoad('TokenDetail');
  return import("./pages/TokenDetail").finally(endMeasure);
});

const Launchpad = lazy(() => {
  const endMeasure = performanceMonitor.measureComponentLoad('Launchpad');
  return import("./pages/Launchpad").finally(endMeasure);
});

const CreatorDashboard = lazy(() => {
  const endMeasure = performanceMonitor.measureComponentLoad('CreatorDashboard');
  return import("./pages/CreatorDashboard").finally(endMeasure);
});

const InvestorLanding = lazy(() => {
  const endMeasure = performanceMonitor.measureComponentLoad('InvestorLanding');
  return import("./pages/InvestorLanding").finally(endMeasure);
});

const InvestorPage = lazy(() => {
  const endMeasure = performanceMonitor.measureComponentLoad('InvestorPage');
  return import("./pages/InvestorPage").finally(endMeasure);
});

const NotFound = lazy(() => {
  const endMeasure = performanceMonitor.measureComponentLoad('NotFound');
  return import("./pages/NotFound").finally(endMeasure);
});

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize performance monitoring
    const endMeasure = performanceMonitor.measureRouteLoad('App');

    // Preload critical routes after initial load
    const preloadTimer = setTimeout(() => {
      // Preload TokenDetail since it's the most likely next route
      routePreloader.preloadTokenDetail();
    }, 2000); // Preload after 2 seconds

    // Log performance metrics in development
    if (import.meta.env.DEV) {
      const logTimer = setInterval(() => {
        performanceMonitor.logMetrics();
      }, 30000); // Log every 30 seconds in dev

      return () => clearInterval(logTimer);
    }

    return () => {
      clearTimeout(preloadTimer);
      endMeasure();
    };
  }, []);

  return (
    <RouteErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SearchProvider>
            <TooltipProvider>
              <ToastContainer />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                <Route
                  path="/"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={<IndexLoader />}>
                        <Index />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/token/:contractAddress"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={<TokenDetailLoader />}>
                        <TokenDetail />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/launchpad"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={
                        <div className="min-h-screen bg-background flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground/30" />
                        </div>
                      }>
                        <Launchpad />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/creator-dashboard"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={
                        <div className="min-h-screen bg-background flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground/30" />
                        </div>
                      }>
                        <CreatorDashboard />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/investors"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={
                        <div className="min-h-screen bg-background flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground/30" />
                        </div>
                      }>
                        <InvestorLanding />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/investors/dashboard"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={
                        <div className="min-h-screen bg-background flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground/30" />
                        </div>
                      }>
                        <InvestorPage />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route
                  path="*"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={
                        <div className="min-h-screen bg-background flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground/30" />
                        </div>
                      }>
                        <NotFound />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SearchProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </RouteErrorBoundary>
  );
};

export default App;
