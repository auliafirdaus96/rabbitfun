/**
 * Basic TypeScript Test
 * Simple test to verify TypeScript + Jest integration works
 */

describe('TypeScript Jest Integration', () => {
  test('should work with basic TypeScript types', () => {
    const message: string = 'Hello, TypeScript!';
    expect(message).toBe('Hello, TypeScript!');
  });

  test('should work with interfaces', () => {
    interface User {
      name: string;
      age: number;
    }

    const user: User = {
      name: 'Test User',
      age: 25
    };

    expect(user.name).toBe('Test User');
    expect(user.age).toBe(25);
  });

  test('should work with generics', () => {
    function identity<T>(arg: T): T {
      return arg;
    }

    const result = identity<string>('Generic Test');
    expect(result).toBe('Generic Test');
  });

  test('should work with async/await', async () => {
    const asyncFunction = async (): Promise<string> => {
      return 'Async Result';
    };

    const result = await asyncFunction();
    expect(result).toBe('Async Result');
  });
});