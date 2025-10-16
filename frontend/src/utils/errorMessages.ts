// Enhanced error message system with user-friendly messages and recovery suggestions

export interface ErrorInfo {
  code: string;
  title: string;
  message: string;
  suggestion?: string;
  action?: {
    text: string;
    onClick: () => void;
  };
  retryAction?: {
    canRetry: boolean;
    onRetry: () => Promise<void>;
    maxRetries?: number;
    currentAttempt?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'wallet' | 'trading' | 'network' | 'validation' | 'system';
}

export class EnhancedErrorMessages {
  private static instance: EnhancedErrorMessages;
  private errorCallbacks = new Map<string, () => void>();
  private retryCallbacks = new Map<string, () => Promise<void>>();

  static getInstance(): EnhancedErrorMessages {
    if (!EnhancedErrorMessages.instance) {
      EnhancedErrorMessages.instance = new EnhancedErrorMessages();
    }
    return EnhancedErrorMessages.instance;
  }

  // Register callback for specific error codes
  registerCallback(errorCode: string, callback: () => void): void {
    this.errorCallbacks.set(errorCode, callback);
  }

  // Register retry callback for specific error codes
  registerRetryCallback(errorCode: string, callback: () => Promise<void>): void {
    this.retryCallbacks.set(errorCode, callback);
  }

  // Get user-friendly error information
  getErrorInfo(error: unknown, context?: string): ErrorInfo {
    const errorStr = error instanceof Error ? error.message : String(error);
    const errorCode = this.extractErrorCode(errorStr);

    // Check for specific error patterns
    if (this.isWalletError(errorStr)) {
      return this.handleWalletError(errorStr, errorCode);
    }

    if (this.isTradingError(errorStr)) {
      return this.handleTradingError(errorStr, errorCode);
    }

    if (this.isNetworkError(errorStr)) {
      return this.handleNetworkError(errorStr, errorCode);
    }

    if (this.isValidationError(errorStr)) {
      return this.handleValidationError(errorStr, errorCode);
    }

    // Fallback to generic error
    return this.handleGenericError(errorStr, errorCode, context);
  }

  private extractErrorCode(message: string): string {
    // Extract error codes from common error messages
    if (message.includes('4001')) return 'USER_REJECTED';
    if (message.includes('4100')) return 'UNAUTHORIZED';
    if (message.includes('4200')) return 'UNSUPPORTED_METHOD';
    if (message.includes('4900')) return 'CHAIN_DISCONNECTED';
    if (message.includes('4902')) return 'CHAIN_NOT_ADDED';
    if (message.includes('4903')) return 'SWITCH_CHAIN';
    if (message.includes('MetaMask tidak terdeteksi')) return 'METAMASK_NOT_DETECTED';
    if (message.includes('Too many connection attempts')) return 'RATE_LIMIT';
    if (message.includes('Too many trades')) return 'TRADE_RATE_LIMIT';
    if (message.includes('Invalid amount')) return 'INVALID_AMOUNT';
    if (message.includes('Invalid slippage')) return 'INVALID_SLIPPAGE';
    if (message.includes('Gagal menghubungkan wallet')) return 'WALLET_CONNECTION_FAILED';
    if (message.includes('Gagal menambahkan jaringan')) return 'CHAIN_ADD_FAILED';
    if (message.includes('Gagal berpindah jaringan')) return 'CHAIN_SWITCH_FAILED';

    return 'UNKNOWN_ERROR';
  }

  private isWalletError(message: string): boolean {
    const walletErrorPatterns = [
      'MetaMask', 'wallet', 'connection', 'rate limit', 'too many attempts'
    ];
    return walletErrorPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isTradingError(message: string): boolean {
    const tradingErrorPatterns = [
      'trade', 'transaction', 'balance', 'insufficient', 'slippage'
    ];
    return tradingErrorPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isNetworkError(message: string): boolean {
    const networkErrorPatterns = [
      'network', 'chain', 'RPC', 'jaringan', 'BSC', 'Ethereum'
    ];
    return networkErrorPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private isValidationError(message: string): boolean {
    const validationErrorPatterns = [
      'Invalid', 'invalid', 'not valid', 'validation', 'format'
    ];
    return validationErrorPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private handleWalletError(message: string, code: string): ErrorInfo {
    const errorMap: Record<string, Omit<ErrorInfo, 'category'>> = {
      'METAMASK_NOT_DETECTED': {
        code: 'METAMASK_NOT_DETECTED',
        title: 'Wallet Tidak Ditemukan',
        message: 'MetaMask tidak terdeteksi di browser Anda.',
        suggestion: 'Pastikan MetaMask telah terinstal dan diaktifkan di browser Anda.',
        action: {
          text: 'Download MetaMask',
          onClick: () => window.open('https://metamask.io/download/', '_blank')
        },
        severity: 'high'
      },
      'WALLET_CONNECTION_FAILED': {
        code: 'WALLET_CONNECTION_FAILED',
        title: 'Gagal Menghubungkan Wallet',
        message: 'Tidak dapat menghubungkan ke wallet MetaMask Anda.',
        suggestion: 'Periksa apakah MetaMask sudah terbuka dan siap digunakan.',
        action: {
          text: 'Coba Lagi',
          onClick: () => this.executeCallback('RETRY_WALLET_CONNECTION')
        },
        severity: 'medium'
      },
      'RATE_LIMIT': {
        code: 'RATE_LIMIT',
        title: 'Terlalu Banyak Percobaan',
        message: 'Anda telah mencoba menghubungkan wallet terlalu sering.',
        suggestion: 'Harap tunggu beberapa saat sebelum mencoba lagi.',
        severity: 'medium'
      },
      'USER_REJECTED': {
        code: 'USER_REJECTED',
        title: 'Permintaan Ditolak',
        message: 'Anda telah menolak permintaan koneksi wallet.',
        suggestion: 'Jika Anda ingin melanjutkan, silakan coba lagi dan setujui permintaan.',
        severity: 'low'
      },
      'UNAUTHORIZED': {
        code: 'UNAUTHORIZED',
        title: 'Tidak Diotorisasi',
        message: 'Wallet tidak diotorisasi untuk melakukan operasi ini.',
        suggestion: 'Silakan coba lagi atau restart browser Anda.',
        severity: 'high'
      }
    };

    const errorInfo = errorMap[code] || {
      code: 'UNKNOWN_WALLET_ERROR',
      title: 'Error Wallet',
      message: 'Terjadi kesalahan dengan wallet Anda.',
      suggestion: 'Silakan coba lagi atau restart MetaMask.',
      severity: 'medium'
    };

    return { ...errorInfo, category: 'wallet' };
  }

  private handleTradingError(message: string, code: string): ErrorInfo {
    const errorMap: Record<string, Omit<ErrorInfo, 'category'>> = {
      'TRADE_RATE_LIMIT': {
        code: 'TRADE_RATE_LIMIT',
        title: 'Terlalu Banyak Transaksi',
        message: 'Anda telah melakukan terlalu banyak transaksi dalam waktu singkat.',
        suggestion: 'Harap tunggu beberapa saat sebelum melakukan transaksi lagi.',
        severity: 'medium'
      },
      'INVALID_AMOUNT': {
        code: 'INVALID_AMOUNT',
        title: 'Jumlah Tidak Valid',
        message: 'Jumlah yang Anda masukkan tidak valid.',
        suggestion: 'Periksa kembali jumlah yang Anda masukkan dan pastikan dalam rentang yang benar.',
        severity: 'low'
      },
      'INVALID_SLIPPAGE': {
        code: 'INVALID_SLIPPAGE',
        title: 'Slippage Tidak Valid',
        message: 'Nilai slippage yang Anda masukkan tidak valid.',
        suggestion: 'Gunakan slippage antara 0.1% - 50%.',
        severity: 'low'
      },
      'INSUFFICIENT_BALANCE': {
        code: 'INSUFFICIENT_BALANCE',
        title: 'Saldo Tidak Mencukupi',
        message: 'Saldo wallet Anda tidak mencukupi untuk transaksi ini.',
        suggestion: 'Pastikan Anda memiliki cukup BNB untuk transaksi dan gas fee.',
        action: {
          text: 'Cek Saldo',
          onClick: () => this.executeCallback('CHECK_BALANCE')
        },
        severity: 'high'
      }
    };

    const errorInfo = errorMap[code] || {
      code: 'UNKNOWN_TRADING_ERROR',
      title: 'Error Transaksi',
      message: 'Terjadi kesalahan saat memproses transaksi.',
      suggestion: 'Silakan coba lagi atau hubungi support jika masalah berlanjut.',
      severity: 'medium'
    };

    return { ...errorInfo, category: 'trading' };
  }

  private handleNetworkError(message: string, code: string): ErrorInfo {
    const errorMap: Record<string, Omit<ErrorInfo, 'category'>> = {
      'CHAIN_NOT_ADDED': {
        code: 'CHAIN_NOT_ADDED',
        title: 'Jaringan Belum Ditambahkan',
        message: 'Jaringan BSC belum ditambahkan ke MetaMask Anda.',
        suggestion: 'Klik tombol di bawah untuk menambahkan jaringan BSC secara otomatis.',
        action: {
          text: 'Tambah BSC',
          onClick: () => this.executeCallback('ADD_BSC_NETWORK')
        },
        severity: 'medium'
      },
      'CHAIN_SWITCH_FAILED': {
        code: 'CHAIN_SWITCH_FAILED',
        title: 'Gagal Berpindah Jaringan',
        message: 'Tidak dapat berpindah ke jaringan BSC.',
        suggestion: 'Pastikan MetaMask terbuka dan coba lagi secara manual.',
        action: {
          text: 'Pindah Manual',
          onClick: () => window.open('https://chainlist.org/chain/56', '_blank')
        },
        severity: 'medium'
      },
      'CHAIN_ADD_FAILED': {
        code: 'CHAIN_ADD_FAILED',
        title: 'Gagal Menambahkan Jaringan',
        message: 'Tidak dapat menambahkan jaringan BSC ke MetaMask.',
        suggestion: 'Coba tambahkan jaringan secara manual atau restart MetaMask.',
        severity: 'medium'
      },
      'CHAIN_DISCONNECTED': {
        code: 'CHAIN_DISCONNECTED',
        title: 'Koneksi Jaringan Terputus',
        message: 'Koneksi ke jaringan blockchain terputus.',
        suggestion: 'Periksa koneksi internet Anda dan coba lagi.',
        severity: 'high'
      },
      'NETWORK_ERROR': {
        code: 'NETWORK_ERROR',
        title: 'Kesalahan Jaringan',
        message: 'Tidak dapat terhubung ke jaringan blockchain.',
        suggestion: 'Periksa koneksi internet Anda dan coba lagi beberapa saat.',
        severity: 'high'
      }
    };

    const errorInfo = errorMap[code] || {
      code: 'UNKNOWN_NETWORK_ERROR',
      title: 'Error Jaringan',
      message: 'Terjadi kesalahan jaringan yang tidak diketahui.',
      suggestion: 'Periksa koneksi internet dan coba lagi.',
      severity: 'medium'
    };

    return { ...errorInfo, category: 'network' };
  }

  private handleValidationError(message: string, code: string): ErrorInfo {
    const errorMap: Record<string, Omit<ErrorInfo, 'category'>> = {
      'INVALID_AMOUNT': {
        code: 'INVALID_AMOUNT',
        title: 'Format Jumlah Salah',
        message: 'Format jumlah yang Anda masukkan tidak valid.',
        suggestion: 'Gunakan format angka yang benar (contoh: 1.5, 0.001, MAX).',
        severity: 'low'
      },
      'INVALID_SLIPPAGE': {
        code: 'INVALID_SLIPPAGE',
        title: 'Format Slippage Salah',
        message: 'Format slippage yang Anda masukkan tidak valid.',
        suggestion: 'Gunakan angka antara 0.1 - 50 untuk slippage.',
        severity: 'low'
      }
    };

    const errorInfo = errorMap[code] || {
      code: 'VALIDATION_ERROR',
      title: 'Error Validasi',
      message: 'Data yang Anda masukkan tidak valid.',
      suggestion: 'Periksa kembali input Anda dan pastikan format yang benar.',
      severity: 'low'
    };

    return { ...errorInfo, category: 'validation' };
  }

  private handleGenericError(message: string, code: string, context?: string): ErrorInfo {
    return {
      code: code || 'UNKNOWN_ERROR',
      title: 'Terjadi Kesalahan',
      message: message || 'Terjadi kesalahan yang tidak diketahui.',
      suggestion: context
        ? `Terjadi kesalahan saat ${context}. Silakan coba lagi.`
        : 'Silakan coba lagi atau hubungi support jika masalah berlanjut.',
      action: {
        text: 'Coba Lagi',
        onClick: () => this.executeCallback('RETRY_GENERIC')
      },
      severity: 'medium',
      category: 'system'
    };
  }

  private executeCallback(callbackName: string): void {
    const callback = this.errorCallbacks.get(callbackName);
    if (callback) {
      callback();
    }
  }

  // Get toast configuration based on error severity
  getToastConfig(errorInfo: ErrorInfo): {
    message: string;
    duration: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  } {
    const config: {
      message: string;
      duration: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    } = {
      message: `${errorInfo.title}: ${errorInfo.message}`,
      duration: this.getToastDuration(errorInfo.severity)
    };

    if (errorInfo.action) {
      config.action = {
        label: errorInfo.action.text,
        onClick: errorInfo.action.onClick
      };
    }

    return config;
  }

  private getToastDuration(severity: ErrorInfo['severity']): number {
    switch (severity) {
      case 'low': return 3000;
      case 'medium': return 5000;
      case 'high': return 7000;
      case 'critical': return 10000;
      default: return 5000;
    }
  }

  // Get icon based on error severity
  getErrorIcon(severity: ErrorInfo['severity']): string {
    switch (severity) {
      case 'low': return '⚠️';
      case 'medium': return '⚡';
      case 'high': return '🚫';
      case 'critical': return '🔥';
      default: return '❌';
    }
  }

  // Get color class based on error severity
  getErrorColor(severity: ErrorInfo['severity']): string {
    switch (severity) {
      case 'low': return 'text-yellow-600';
      case 'medium': return 'text-orange-600';
      case 'high': return 'text-red-600';
      case 'critical': return 'text-red-700';
      default: return 'text-red-600';
    }
  }
}

export const enhancedErrorMessages = EnhancedErrorMessages.getInstance();

// Convenience functions for common error scenarios
export const showEnhancedError = (error: unknown, context?: string) => {
  const errorInfo = enhancedErrorMessages.getErrorInfo(error, context);
  const toastConfig = enhancedErrorMessages.getToastConfig(errorInfo);

  // This would be used with your toast library
  return {
    errorInfo,
    toastConfig
  };
};

export const showSuccessMessage = (title: string, message: string) => {
  return {
    title,
    message,
    type: 'success' as const,
    duration: 3000
  };
};

export const showInfoMessage = (title: string, message: string) => {
  return {
    title,
    message,
    type: 'info' as const,
    duration: 4000
  };
};

// Enhanced error with retry support
export const showEnhancedErrorWithRetry = (
  error: unknown,
  context?: string,
  retryOptions?: {
    canRetry: boolean;
    onRetry: () => Promise<void>;
    maxRetries?: number;
    currentAttempt?: number;
  }
) => {
  const errorInfo = enhancedErrorMessages.getErrorInfo(error, context);

  // Add retry action if available
  if (retryOptions?.canRetry && errorInfo.category === 'trading') {
    errorInfo.retryAction = {
      canRetry: true,
      onRetry: retryOptions.onRetry,
      maxRetries: retryOptions.maxRetries || 3,
      currentAttempt: retryOptions.currentAttempt || 1
    };
  }

  const toastConfig = enhancedErrorMessages.getToastConfig(errorInfo);

  return {
    errorInfo,
    toastConfig,
    retryOptions
  };
};

// Convenience function for transaction errors with retry
export const showTransactionErrorWithRetry = (
  error: unknown,
  transactionId: string,
  retryOptions?: {
    maxRetries?: number;
    currentAttempt?: number;
    onRetry?: () => Promise<void>;
  }
) => {
  const baseOptions = {
    maxRetries: 3,
    currentAttempt: 1,
    ...retryOptions
  };

  // Check if onRetry is provided before showing retry option
  if (!baseOptions.onRetry) {
    console.warn('showTransactionErrorWithRetry: onRetry callback is required for retry functionality');
    // Fall back to regular error without retry
    const errorInfo = enhancedErrorMessages.getErrorInfo(error, 'transaction execution');
    const toastConfig = enhancedErrorMessages.getToastConfig(errorInfo);
    return { errorInfo, toastConfig };
  }

  return showEnhancedErrorWithRetry(error, 'transaction execution', {
    canRetry: true,
    onRetry: baseOptions.onRetry,
    maxRetries: baseOptions.maxRetries,
    currentAttempt: baseOptions.currentAttempt
  });
};