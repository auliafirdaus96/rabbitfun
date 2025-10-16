declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      chainId?: string;
      request<T = any>(args: {
        method: string;
        params?: any[];
      }): Promise<T>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export {};