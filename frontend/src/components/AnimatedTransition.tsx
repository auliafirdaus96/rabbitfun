import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedTransitionProps {
  children: ReactNode;
  show: boolean;
  type?: "fade" | "slide" | "scale" | "bounce";
  duration?: number;
  className?: string;
}

export const AnimatedTransition = ({
  children,
  show,
  type = "fade",
  duration = 300,
  className
}: AnimatedTransitionProps) => {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  const animationClasses = {
    fade: cn(
      "transition-opacity",
      show ? "opacity-100" : "opacity-0"
    ),
    slide: cn(
      "transition-all transform",
      show ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
    ),
    scale: cn(
      "transition-all transform",
      show ? "scale-100 opacity-100" : "scale-95 opacity-0"
    ),
    bounce: cn(
      "transition-all transform",
      show ? "scale-100 opacity-100" : "scale-0 opacity-0"
    )
  };

  return (
    <div
      className={cn(animationClasses[type], className)}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

interface PriceChangeAnimationProps {
  children: ReactNode;
  priceChange: number;
  previousPrice?: number;
}

export const PriceChangeAnimation = ({
  children,
  priceChange,
  previousPrice
}: PriceChangeAnimationProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayChange, setDisplayChange] = useState(priceChange);

  useEffect(() => {
    if (previousPrice !== undefined && priceChange !== previousPrice) {
      setIsAnimating(true);
      setDisplayChange(priceChange);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [priceChange, previousPrice]);

  return (
    <div className={cn(
      "transition-all duration-300",
      isAnimating && (priceChange > 0 ? "animate-pulse text-green-500" : "animate-pulse text-red-500")
    )}>
      {children}
    </div>
  );
};

interface TradeButtonProps {
  children: ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: "buy" | "sell" | "connect";
}

export const AnimatedTradeButton = ({
  children,
  isLoading,
  disabled,
  onClick,
  className,
  variant = "buy"
}: TradeButtonProps) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    onClick?.();
    setTimeout(() => setIsClicked(false), 200);
  };

  const variantClasses = {
    buy: "bg-green-500 text-white hover:bg-green-600",
    sell: "bg-red-500 text-white hover:bg-red-600",
    connect: "bg-green-500 text-black hover:bg-green-600"
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "w-full rounded-lg font-semibold py-2.5 transition-all duration-200 transform",
        "hover:scale-105 active:scale-95",
        variantClasses[variant],
        (disabled || isLoading) && "opacity-50 cursor-not-allowed hover:scale-100",
        isClicked && "scale-95",
        className
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {isLoading && (
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </div>
    </button>
  );
};

interface TabTransitionProps {
  children: ReactNode;
  isActive: boolean;
  direction?: "left" | "right";
}

export const TabTransition = ({
  children,
  isActive,
  direction = "left"
}: TabTransitionProps) => {
  return (
    <AnimatedTransition
      show={isActive}
      type="slide"
      duration={200}
      className={cn(
        "w-full",
        direction === "left" ? "origin-left" : "origin-right"
      )}
    >
      {children}
    </AnimatedTransition>
  );
};

export const FadeIn = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};