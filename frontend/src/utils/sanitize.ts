/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks by cleaning user input
 */

/**
 * Sanitizes general text input
 * Removes potentially dangerous characters and patterns
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/data:/gi, '') // Remove data protocol
    .replace(/vbscript:/gi, '') // Remove vbscript protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/eval\(/gi, '') // Remove eval functions
    .replace(/alert\(/gi, '') // Remove alert functions
    .replace(/prompt\(/gi, '') // Remove prompt functions
    .replace(/confirm\(/gi, '') // Remove confirm functions
    .trim()
    .substring(0, 1000); // Limit length
};

/**
 * Sanitizes token name
 * Only allows letters, numbers, and spaces
 */
export const sanitizeTokenName = (name: string): string => {
  if (!name) return '';

  return sanitizeInput(name)
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Only allow letters, numbers, spaces, hyphens, underscores
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/^[\s\-_]+|[\s\-_]+$/g, '') // Remove leading/trailing spaces, hyphens, underscores
    .trim();
};

/**
 * Sanitizes token symbol
 * Only allows uppercase letters
 */
export const sanitizeTokenSymbol = (symbol: string): string => {
  if (!symbol) return '';

  return sanitizeInput(symbol)
    .replace(/[^a-zA-Z]/g, '') // Only allow letters
    .toUpperCase()
    .trim()
    .substring(0, 10); // Limit to 10 characters
};

/**
 * Sanitizes URL input
 * Only allows URL-safe characters
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';

  const sanitized = sanitizeInput(url)
    .replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/g, '') // URL safe characters
    .trim();

  // Ensure URL starts with https://
  if (sanitized && !sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    return `https://${sanitized}`;
  }

  return sanitized;
};

/**
 * Sanitizes description text
 * Allows more characters but still prevents attacks
 */
export const sanitizeDescription = (description: string): string => {
  if (!description) return '';

  return sanitizeInput(description)
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[\r\n\t]/g, ' ') // Replace line breaks with spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces
    .trim()
    .substring(0, 500); // Limit to 500 characters
};

/**
 * Validates and sanitizes complete token data
 */
export const sanitizeTokenData = (data: {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}) => {
  return {
    name: sanitizeTokenName(data.name),
    symbol: sanitizeTokenSymbol(data.symbol),
    description: sanitizeDescription(data.description),
    website: data.website ? sanitizeUrl(data.website) : '',
    twitter: data.twitter ? sanitizeUrl(data.twitter) : '',
    telegram: data.telegram ? sanitizeUrl(data.telegram) : ''
  };
};

/**
 * Checks if input contains suspicious patterns
 */
export const containsSuspiciousPatterns = (input: string): boolean => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /eval\(/i,
    /alert\(/i,
    /prompt\(/i,
    /confirm\(/i,
    /expression\(/i,
    /url\(/i,
    /@import/i,
    /document\./i,
    /window\./i,
    /location\./i,
    /innerHTML/i,
    /outerHTML/i,
    /insertAdjacentHTML/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Safe HTML rendering (if needed in the future)
 */
export const createSafeHTML = (html: string): string => {
  // This is a basic implementation
  // In production, use a library like DOMPurify
  return sanitizeInput(html)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};