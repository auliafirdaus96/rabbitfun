/**
 * Basic Test for Debugging
 * Simple test to verify Jest setup is working
 */

describe('Basic Jest Setup', () => {
  test('should add two numbers correctly', () => {
    expect(2 + 2).toBe(4);
  });

  test('should handle basic string operations', () => {
    const message = 'Hello, Jest!';
    expect(message).toContain('Jest');
  });

  test('should work with objects', () => {
    const obj = { name: 'Test', value: 42 };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('Test');
  });

  test('should work with arrays', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
  });
});