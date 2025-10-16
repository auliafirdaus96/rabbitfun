import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Production Environment Configuration
import { validateConfigurationOnStartup, generateReadinessReport } from "./config/productionValidator";

// Validate configuration on startup
if (import.meta.env.MODE === 'production') {
  console.log('🚀 Starting RabbitFun Launchpad in Production Mode');

  // Validate production configuration
  const isValid = validateConfigurationOnStartup();

  if (!isValid) {
    console.error('❌ Production configuration validation failed!');
    console.error(generateReadinessReport());

    // In production, we might want to show a user-friendly error page
    // For now, we'll log the error and continue with a warning
    console.warn('⚠️ Application starting with configuration issues');
  } else {
    console.log('✅ Production configuration validated successfully');
  }
} else {
  console.log('🛠️ Starting RabbitFun Launchpad in Development Mode');
}

// Initialize performance monitoring
if (import.meta.env.VITE_PERFORMANCE_MONITORING === 'true') {
  console.log('📊 Performance monitoring enabled');

  // Monitor page load performance
  if ('performance' in window) {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      console.log(`📈 Page load time: ${loadTime.toFixed(2)}ms`);

      // Log additional performance metrics
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      const firstPaint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0;

      console.log(`📊 DOM Content Loaded: ${domContentLoaded.toFixed(2)}ms`);
      console.log(`🎨 First Paint: ${firstPaint.toFixed(2)}ms`);
    });
  }
}

// Initialize error monitoring
if (import.meta.env.VITE_ERROR_REPORTING === 'true') {
  console.log('🔍 Error reporting enabled');

  // Global error handler
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);

    // In production, you might want to send this to an error reporting service
    if (import.meta.env.MODE === 'production') {
      // TODO: Send to error reporting service
      console.error('Production error - would be sent to monitoring service');
    }
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    if (import.meta.env.MODE === 'production') {
      // TODO: Send to error reporting service
      console.error('Production promise rejection - would be sent to monitoring service');
    }
  });
}

// Log environment information
console.log('🌍 Environment Information:');
console.log(`  • Mode: ${import.meta.env.MODE}`);
console.log(`  • Base URL: ${import.meta.env.BASE_URL}`);
console.log(`  • API URL: ${import.meta.env.VITE_API_BASE_URL}`);
console.log(`  • Chain ID: ${import.meta.env.VITE_CHAIN_ID}`);
console.log(`  • Features: Analytics=${import.meta.env.VITE_ENABLE_ANALYTICS}, Performance=${import.meta.env.VITE_PERFORMANCE_MONITORING}, Error Reporting=${import.meta.env.VITE_ERROR_REPORTING}`);

// Initialize service worker (if enabled)
if ('serviceWorker' in navigator && import.meta.env.VITE_PWA_FEATURES === 'true') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error);
      });
  });
}

// Start the application
createRoot(document.getElementById("root")!).render(<App />);
