import { Skeleton } from "@/components/ui/skeleton";

interface TradingViewSkeletonProps {
  height?: string;
  className?: string;
}

const TradingViewSkeleton = ({
  height = "h-[360px] md:h-[460px]",
  className = ""
}: TradingViewSkeletonProps) => {
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      <div className={`${height} relative`}>
        {/* Header skeleton */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-muted/30 border-b border-border/50 flex items-center px-3">
          <Skeleton className="h-4 w-24 bg-muted/50" />
        </div>

        {/* Chart area skeleton */}
        <div className="h-full bg-muted/20 relative">
          {/* Grid lines simulation */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full grid grid-cols-8 grid-rows-6">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="border border-border/20" />
              ))}
            </div>
          </div>

          {/* Loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-muted-foreground/30" />
              <span className="text-sm text-muted-foreground/60">Loading chart...</span>
            </div>
          </div>
        </div>

        {/* Bottom controls skeleton */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-muted/30 border-t border-border/50 flex items-center justify-between px-3">
          <Skeleton className="h-3 w-16 bg-muted/50" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-6 bg-muted/50 rounded" />
            <Skeleton className="h-6 w-6 bg-muted/50 rounded" />
            <Skeleton className="h-6 w-6 bg-muted/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingViewSkeleton;