/**
 * Sanitization Utility Tests
 * Test cases for input sanitization functions
 */

import {
  sanitizeInput,
  sanitizeTokenName,
  sanitizeTokenSymbol,
  sanitizeUrl,
  sanitizeDescription,
  sanitizeTokenData,
  containsSuspiciousPatterns,
  createSafeHTML,
} from '../sanitize';

describe('sanitizeInput', () => {
  it('should handle basic text', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
    expect(sanitizeInput('Test 123')).toBe('Test 123');
  });

  it('should handle HTML tags', () => {
    expect(sanitizeInput('<div>Hello</div>')).toBe('divHello/div');
    expect(sanitizeInput('<span>Test</span>')).toBe('spanTest/span');
  });

  it('should handle dangerous protocols', () => {
    expect(sanitizeInput('javascript:alert("xss")')).not.toContain('javascript:');
    expect(sanitizeInput('data:text/html')).not.toContain('data:');
  });

  it('should handle null and undefined', () => {
    expect(sanitizeInput(null as any)).toBe('');
    expect(sanitizeInput(undefined as any)).toBe('');
  });

  it('should handle empty strings', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput('   ')).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  Hello World  ')).toBe('Hello World');
    expect(sanitizeInput('\tHello\t')).toBe('Hello');
  });
});

describe('sanitizeTokenName', () => {
  it('should allow valid token names', () => {
    expect(sanitizeTokenName('RabbitToken')).toBe('RabbitToken');
    expect(sanitizeTokenName('Test Coin')).toBe('Test Coin');
  });

  it('should remove invalid characters', () => {
    expect(sanitizeTokenName('Token@123')).toBe('Token123');
    expect(sanitizeTokenName('Token#123')).toBe('Token123');
  });

  it('should handle empty values', () => {
    expect(sanitizeTokenName('')).toBe('');
    expect(sanitizeTokenName(null as any)).toBe('');
  });

  it('should normalize spaces', () => {
    expect(sanitizeTokenName('  Test  Coin  ')).toBe('Test Coin');
  });
});

describe('sanitizeTokenSymbol', () => {
  it('should convert to uppercase', () => {
    expect(sanitizeTokenSymbol('rt')).toBe('RT');
    expect(sanitizeTokenSymbol('abc')).toBe('ABC');
  });

  it('should remove non-letter characters', () => {
    expect(sanitizeTokenSymbol('RT@')).toBe('RT');
    expect(sanitizeTokenSymbol('RT#')).toBe('RT');
  });

  it('should handle empty values', () => {
    expect(sanitizeTokenSymbol('')).toBe('');
    expect(sanitizeTokenSymbol(null as any)).toBe('');
  });

  it('should limit length', () => {
    const longSymbol = 'VERYLONGSYMBOL';
    const result = sanitizeTokenSymbol(longSymbol);
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe('sanitizeUrl', () => {
  it('should add https:// prefix if missing', () => {
    const result = sanitizeUrl('example.com');
    expect(result).toContain('https://example.com');
  });

  it('should preserve existing https', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should preserve existing http', () => {
    expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('should handle empty values', () => {
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl(null as any)).toBe('');
  });
});

describe('sanitizeDescription', () => {
  it('should handle normal descriptions', () => {
    expect(sanitizeDescription('This is a valid description')).toBe('This is a valid description');
    expect(sanitizeDescription('Test token with 123 numbers')).toBe('Test token with 123 numbers');
  });

  it('should handle line breaks', () => {
    const result = sanitizeDescription('Line 1\nLine 2');
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
  });

  it('should handle empty values', () => {
    expect(sanitizeDescription('')).toBe('');
    expect(sanitizeDescription(null as any)).toBe('');
  });

  it('should limit length', () => {
    const longDesc = 'A'.repeat(1000);
    const result = sanitizeDescription(longDesc);
    expect(result.length).toBeLessThanOrEqual(500);
  });
});

describe('sanitizeTokenData', () => {
  it('should sanitize all token data fields', () => {
    const data = {
      name: 'Test Token',
      symbol: 'TEST',
      description: 'Test description',
      website: 'example.com',
    };

    const result = sanitizeTokenData(data);

    expect(result.name).toBe('Test Token');
    expect(result.symbol).toBe('TEST');
    expect(result.description).toBe('Test description');
    expect(result.website).toContain('https://example.com');
  });

  it('should handle optional fields', () => {
    const data = {
      name: 'Test Token',
      symbol: 'TEST',
      description: 'Test description'
    };

    const result = sanitizeTokenData(data);

    expect(result.website).toBe('');
    expect(result.twitter).toBe('');
    expect(result.telegram).toBe('');
  });
});

describe('containsSuspiciousPatterns', () => {
  it('should detect suspicious patterns', () => {
    expect(containsSuspiciousPatterns('<script>alert("xss")</script>')).toBe(true);
    expect(containsSuspiciousPatterns('javascript:alert("xss")')).toBe(true);
    expect(containsSuspiciousPatterns('onclick="alert(\'xss\')"')).toBe(true);
  });

  it('should not detect safe content', () => {
    expect(containsSuspiciousPatterns('This is safe content')).toBe(false);
    expect(containsSuspiciousPatterns('Normal text')).toBe(false);
  });

  it('should handle empty values', () => {
    expect(containsSuspiciousPatterns(null as any)).toBe(false);
    expect(containsSuspiciousPatterns(undefined as any)).toBe(false);
    expect(containsSuspiciousPatterns('')).toBe(false);
  });
});

describe('createSafeHTML', () => {
  it('should handle HTML', () => {
    const result = createSafeHTML('<div>Hello</div>');
    expect(result).toContain('Hello');
  });

  it('should handle HTML entities', () => {
    const result = createSafeHTML('Hello &amp; World');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should handle empty values', () => {
    expect(createSafeHTML('')).toBe('');
    expect(createSafeHTML(null as any)).toBe('');
  });
});

describe('Edge Cases', () => {
  it('should handle special characters', () => {
    expect(sanitizeInput('🚀 Rocket Ship')).toContain('Rocket Ship');
    expect(sanitizeInput('💎 Diamond')).toContain('Diamond');
  });

  it('should handle unicode characters', () => {
    expect(sanitizeInput('Café')).toBe('Café');
    expect(sanitizeInput('naïve')).toBe('naïve');
  });

  it('should handle very long inputs', () => {
    const veryLongInput = 'A'.repeat(2000);
    const result = sanitizeInput(veryLongInput);
    expect(result.length).toBeLessThanOrEqual(1000);
  });

  it('should handle mixed case protocols', () => {
    const result = sanitizeInput('JAVASCRIPT:alert("xss")');
    expect(result).not.toContain('JAVASCRIPT:');
  });
});