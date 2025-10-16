import { X, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose?: () => void;
}

export const CustomToast = ({ message, type, duration = 5000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-lg shadow-lg border transform transition-all duration-300";

    const typeStyles = {
      success: "bg-green-500 text-white border-green-600",
      error: "bg-red-500 text-white border-red-600",
      warning: "bg-yellow-500 text-white border-yellow-600",
      info: "bg-blue-500 text-white border-blue-600",
    };

    const animationStyles = isVisible && !isLeaving
      ? "translate-x-0 opacity-100"
      : isLeaving
      ? "translate-x-full opacity-0"
      : "translate-x-full opacity-0";

    return `${baseStyles} ${typeStyles[type]} ${animationStyles}`;
  };

  const getIcon = () => {
    const iconProps = { className: "w-5 h-5 flex-shrink-0" };

    switch (type) {
      case "success":
        return <CheckCircle {...iconProps} />;
      case "error":
        return <XCircle {...iconProps} />;
      case "warning":
        return <AlertCircle {...iconProps} />;
      case "info":
        return <Info {...iconProps} />;
      default:
        return <Info {...iconProps} />;
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-md hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-white transition-transform duration-linear"
          style={{
            transform: `translateX(${isLeaving ? '100' : '0'}%)`,
            transitionDuration: `${duration}ms`,
            transitionTimingFunction: 'linear'
          }}
        ></div>
      </div>
    </div>
  );
};

// Toast Container Component
export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Array<any>>([]);

  const addToast = (toast: any) => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts((prev: any[]) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev: any[]) => prev.filter((toast: any) => toast.id !== id));
  };

  // Global function to show toasts
  useEffect(() => {
    (window as any).showToast = addToast;
    (window as any).hideToast = removeToast;

    return () => {
      delete (window as any).showToast;
      delete (window as any).hideToast;
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <CustomToast
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};