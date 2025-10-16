import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  label: string;
  description?: string;
  color?: "primary" | "secondary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
  animated?: boolean;
}

export const AnimatedProgress = ({
  value,
  max = 100,
  label,
  description,
  color = "primary",
  size = "md",
  showPercentage = true,
  animated = true
}: AnimatedProgressProps) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (animated && isVisible) {
      const timer = setTimeout(() => setProgress(value), 100);
      return () => clearTimeout(timer);
    } else if (!animated) {
      setProgress(value);
    }
  }, [value, animated, isVisible]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const getColorClasses = () => {
    const baseClasses = "transition-all duration-1000 ease-out";
    switch (color) {
      case "primary":
        return `${baseClasses} bg-gradient-to-r from-primary to-purple-500`;
      case "secondary":
        return `${baseClasses} bg-gradient-to-r from-secondary to-pink-500`;
      case "success":
        return `${baseClasses} bg-gradient-to-r from-green-500 to-emerald-500`;
      case "warning":
        return `${baseClasses} bg-gradient-to-r from-yellow-500 to-orange-500`;
      case "error":
        return `${baseClasses} bg-gradient-to-r from-red-500 to-rose-500`;
      default:
        return `${baseClasses} bg-gradient-to-r from-primary to-purple-500`;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-2";
      case "lg":
        return "h-4";
      default:
        return "h-3";
    }
  };

  const percentage = Math.round((progress / max) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {description && (
            <span className="text-xs text-text-light">{description}</span>
          )}
        </div>
        {showPercentage && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{percentage}%</span>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
      <div className="relative">
        <Progress
          value={progress}
          max={max}
          className={`w-full bg-border rounded-full overflow-hidden ${getSizeClasses()}`}
        />
        <div
          className={`absolute top-0 left-0 h-full ${getColorClasses()} rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
        {/* Shimmer Effect */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-shimmer"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};