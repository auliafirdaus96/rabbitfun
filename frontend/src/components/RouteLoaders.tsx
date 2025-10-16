import { Skeleton } from "@/components/ui/skeleton";

// Loading skeleton for TokenDetail page
export const TokenDetailLoader = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 max-w-none w-full">
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            {/* Breadcrumb skeleton */}
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-9 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>

            {/* Token info skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-20 mb-2" />
                  <Skeleton className="h-6 w-48" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>

            {/* TradingView skeleton */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Skeleton className="h-[360px] md:h-[460px] w-full" />
            </div>

            {/* Tabs skeleton */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-8 mb-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-12" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Trading panel skeleton */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>

            {/* Bonding curve skeleton */}
            <div className="rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-2 w-full mb-3" />
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Holders skeleton */}
            <div className="rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-4 w-20 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// Loading skeleton for Index page (minimal since it's light)
export const IndexLoader = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    </div>
  );
};

// Simple spinner for general route loading
export const RouteLoader = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-muted-foreground/30" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};