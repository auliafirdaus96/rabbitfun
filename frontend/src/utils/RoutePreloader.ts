interface RouteModule {
  default: React.ComponentType<Record<string, unknown>>;
}

class RoutePreloader {
  private preloadedModules = new Map<string, Promise<RouteModule>>();
  private static instance: RoutePreloader;

  static getInstance(): RoutePreloader {
    if (!RoutePreloader.instance) {
      RoutePreloader.instance = new RoutePreloader();
    }
    return RoutePreloader.instance;
  }

  // Preload a specific route
  preloadRoute(routePath: string): Promise<RouteModule> {
    // Return existing promise if already loading
    if (this.preloadedModules.has(routePath)) {
      return this.preloadedModules.get(routePath)!;
    }

    let importPromise: Promise<RouteModule>;

    switch (routePath) {
      case '/':
        importPromise = import('../pages/Index');
        break;
      case '/token/detail':
      case '/token':
        importPromise = import('../pages/TokenDetail');
        break;
      default:
        importPromise = Promise.reject(new Error(`Unknown route: ${routePath}`));
    }

    this.preloadedModules.set(routePath, importPromise);

    return importPromise.catch((error) => {
      // Remove failed promise from cache
      this.preloadedModules.delete(routePath);
      throw error;
    });
  }

  // Preload TokenDetail route (most critical)
  preloadTokenDetail(): void {
    this.preloadRoute('/token/detail');
  }

  // Preload Index route
  preloadIndex(): void {
    this.preloadRoute('/');
  }

  // Clear preload cache (useful for development or cache invalidation)
  clearCache(): void {
    this.preloadedModules.clear();
  }

  // Get preloading status
  isPreloaded(routePath: string): boolean {
    return this.preloadedModules.has(routePath);
  }
}

// Export singleton instance
export const routePreloader = RoutePreloader.getInstance();

// React hook for preloading
export const useRoutePreloader = () => {
  return {
    preloadTokenDetail: () => routePreloader.preloadTokenDetail(),
    preloadIndex: () => routePreloader.preloadIndex(),
    preloadRoute: (path: string) => routePreloader.preloadRoute(path),
    isPreloaded: (path: string) => routePreloader.isPreloaded(path),
    clearCache: () => routePreloader.clearCache()
  };
};