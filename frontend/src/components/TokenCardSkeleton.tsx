import { Card, CardContent } from "@/components/ui/card";

export const TokenCardSkeleton = () => {
  return (
    <Card className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <CardContent className="p-6 space-y-4">
        {/* Token Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-border rounded-xl animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-border rounded animate-pulse"></div>
            <div className="h-3 w-16 bg-border rounded animate-pulse"></div>
          </div>
        </div>

        {/* Price Information */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-20 bg-border rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-border rounded animate-pulse"></div>
          </div>

          <div className="flex justify-between">
            <div className="h-4 w-20 bg-border rounded animate-pulse"></div>
            <div className="h-4 w-28 bg-border rounded animate-pulse"></div>
          </div>

          <div className="flex justify-between">
            <div className="h-4 w-20 bg-border rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-border rounded animate-pulse"></div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-border rounded animate-pulse"></div>
              <div className="h-3 w-12 bg-border rounded animate-pulse"></div>
            </div>
            <div className="w-full bg-border rounded-full h-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <div className="h-10 flex-1 bg-border rounded-lg animate-pulse"></div>
          <div className="h-10 flex-1 bg-border rounded-lg animate-pulse"></div>
        </div>
      </CardContent>
    </Card>
  );
};