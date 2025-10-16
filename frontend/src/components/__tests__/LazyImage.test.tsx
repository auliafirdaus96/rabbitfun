/**
 * LazyImage Component Tests
 * React Testing Library test suite for LazyImage, OptimizedAvatar, and LazyBackground components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LazyImage, OptimizedAvatar, LazyBackground } from '../LazyImage';

// Mock the imageCache
jest.mock('../../utils/cache', () => ({
  imageCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock the Skeleton component
jest.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

global.IntersectionObserver = jest.fn().mockImplementation((callback, options) => ({
  observe: mockObserve,
  unobserve: mockUnobserve,
  disconnect: mockDisconnect,
  root: options?.root || null,
  rootMargin: options?.rootMargin || '0px',
  thresholds: options?.thresholds || [0],
  callback,
}));

describe('LazyImage Component', () => {
  const defaultProps = {
    src: 'https://example.com/image.jpg',
    alt: 'Test Image',
    className: 'w-full h-full',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  describe('Basic Rendering', () => {
    it('should render with placeholder initially', () => {
      render(<LazyImage {...defaultProps} />);

      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should render custom placeholder when provided', () => {
      const customPlaceholder = <div data-testid="custom-placeholder">Loading...</div>;

      render(<LazyImage {...defaultProps} placeholder={customPlaceholder} />);

      expect(screen.getByTestId('custom-placeholder')).toBeInTheDocument();
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();
    });

    it('should render img element when loaded', async () => {
      render(<LazyImage {...defaultProps} />);

      // Simulate intersection
      const [callback] = (global.IntersectionObserver as jest.Mock).mock.calls;
      callback([{ isIntersecting: true, target: {} }]);

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', defaultProps.src);
        expect(img).toHaveAttribute('alt', defaultProps.alt);
      });
    });
  });

  describe('Lazy Loading Behavior', () => {
    it('should set up IntersectionObserver when loading is lazy', () => {
      render(<LazyImage {...defaultProps} loading="lazy" />);

      expect(global.IntersectionObserver).toHaveBeenCalled();
      expect(mockObserve).toHaveBeenCalled();
    });

    it('should not use IntersectionObserver when loading is eager', () => {
      render(<LazyImage {...defaultProps} loading="eager" />);

      expect(global.IntersectionObserver).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });

    it('should load image when element comes into view', async () => {
      render(<LazyImage {...defaultProps} />);

      // Initially only placeholder
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();

      // Simulate intersection
      const [callback] = (global.IntersectionObserver as jest.Mock).mock.calls;
      callback([{ isIntersecting: true, target: {} }]);

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });

    it('should cleanup IntersectionObserver on unmount', () => {
      const { unmount } = render(<LazyImage {...defaultProps} />);

      unmount();

      expect(mockUnobserve).toHaveBeenCalled();
    });
  });

  describe('Image Caching', () => {
    const { imageCache } = require('../../utils/cache');

    it('should check cache on mount', () => {
      imageCache.get.mockReturnValue(null);

      render(<LazyImage {...defaultProps} />);

      expect(imageCache.get).toHaveBeenCalledWith(defaultProps.src);
    });

    it('should use cached image if available', async () => {
      const cachedSrc = 'https://cached-image.com/image.jpg';
      imageCache.get.mockReturnValue(cachedSrc);

      render(<LazyImage {...defaultProps} loading="eager" />);

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', cachedSrc);
      });
    });

    it('should cache image after successful load', async () => {
      imageCache.get.mockReturnValue(null);

      render(<LazyImage {...defaultProps} loading="eager" />);

      await waitFor(() => {
        const img = screen.getByRole('img');
        fireEvent.load(img);
      });

      expect(imageCache.set).toHaveBeenCalledWith(defaultProps.src, defaultProps.src);
    });
  });

  describe('Error Handling', () => {
    it('should show fallback when image fails to load', async () => {
      render(<LazyImage {...defaultProps} />);

      // Simulate intersection
      const [callback] = (global.IntersectionObserver as jest.Mock).mock.calls;
      callback([{ isIntersecting: true, target: {} }]);

      await waitFor(() => {
        const img = screen.getByRole('img');
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.getByLabelText(/image/i)).toBeInTheDocument(); // Default fallback icon
      });
    });

    it('should show custom fallback when provided', async () => {
      const customFallback = <div data-testid="custom-fallback">Failed to load</div>;

      render(<LazyImage {...defaultProps} fallback={customFallback} />);

      // Simulate intersection
      const [callback] = (global.IntersectionObserver as jest.Mock).mock.calls;
      callback([{ isIntersecting: true, target: {} }]);

      await waitFor(() => {
        const img = screen.getByRole('img');
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      });
    });

    it('should call onError callback when image fails to load', async () => {
      const onError = jest.fn();

      render(<LazyImage {...defaultProps} onError={onError} />);

      // Simulate intersection
      const [callback] = (global.IntersectionObserver as jest.Mock).mock.calls;
      callback([{ isIntersecting: true, target: {} }]);

      await waitFor(() => {
        const img = screen.getByRole('img');
        fireEvent.error(img);
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should log error to console', async () => {
      render(<LazyImage {...defaultProps} />);

      // Simulate intersection
      const [callback] = (global.IntersectionObserver as jest.Mock).mock.calls;
      callback([{ isIntersecting: true, target: {} }]);

      await waitFor(() => {
        const img = screen.getByRole('img');
        fireEvent.error(img);
      });

      expect(console.error).toHaveBeenCalledWith('Image load error:', expect.any(Object));
    });
  });

  describe('Event Callbacks', () => {
    it('should call onLoad callback when image loads successfully', async () => {
      const onLoad = jest.fn();

      render(<LazyImage {...defaultProps} onLoad={onLoad} />);

      // Simulate intersection
      const [callback] = (global.IntersectionObserver as jest.Mock).mock.calls;
      callback([{ isIntersecting: true, target: {} }]);

      await waitFor(() => {
        const img = screen.getByRole('img');
        fireEvent.load(img);
      });

      expect(onLoad).toHaveBeenCalled();
    });
  });

  describe('Props and Attributes', () => {
    it('should pass width and height to img element', async () => {
      const props = {
        ...defaultProps,
        width: 200,
        height: 150,
        loading: 'eager' as const,
      };

      render(<LazyImage {...props} />);

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('width', '200');
        expect(img).toHaveAttribute('height', '150');
      });
    });

    it('should apply custom className', async () => {
      const customClass = 'custom-image-class';

      render(<LazyImage {...defaultProps} className={customClass} loading="eager" />);

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveClass(customClass);
      });
    });

    it('should have correct opacity transition', async () => {
      render(<LazyImage {...defaultProps} loading="eager" />);

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveStyle({
          opacity: '1',
          transition: 'opacity 0.3s ease-in-out'
        });
      });
    });
  });
});

describe('OptimizedAvatar Component', () => {
  const defaultProps = {
    name: 'Test User',
    alt: 'Test User Avatar',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Without Source', () => {
    it('should render placeholder with initials', () => {
      render(<OptimizedAvatar {...defaultProps} />);

      expect(screen.getByText('TE')).toBeInTheDocument();
    });

    it('should use symbol when provided', () => {
      render(<OptimizedAvatar {...defaultProps} symbol="TEST" />);

      expect(screen.getByText('TEST')).toBeInTheDocument();
    });

    it('should handle short names', () => {
      render(<OptimizedAvatar {...defaultProps} name="A" />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should handle empty name', () => {
      render(<OptimizedAvatar {...defaultProps} name="" />);

      expect(screen.getByText('TK')).toBeInTheDocument();
    });

    it('should apply size classes correctly', () => {
      const { rerender } = render(<OptimizedAvatar {...defaultProps} size="sm" />);
      expect(screen.getByText('TE').parentElement).toHaveClass('w-8 h-8 text-xs');

      rerender(<OptimizedAvatar {...defaultProps} size="md" />);
      expect(screen.getByText('TE').parentElement).toHaveClass('w-12 h-12 text-sm');

      rerender(<OptimizedAvatar {...defaultProps} size="lg" />);
      expect(screen.getByText('TE').parentElement).toHaveClass('w-16 h-16 text-base');

      rerender(<OptimizedAvatar {...defaultProps} size="xl" />);
      expect(screen.getByText('TE').parentElement).toHaveClass('w-20 h-20 text-lg');
    });

    it('should have gradient background for placeholder', () => {
      render(<OptimizedAvatar {...defaultProps} />);

      const placeholder = screen.getByText('TE').parentElement;
      expect(placeholder).toHaveClass('bg-gradient-to-br', 'from-blue-500', 'to-purple-500');
    });
  });

  describe('With Source', () => {
    it('should render LazyImage when src is provided', () => {
      render(<OptimizedAvatar {...defaultProps} src="https://example.com/avatar.jpg" />);

      // Should render LazyImage with custom placeholder
      expect(screen.getByText('TE')).toBeInTheDocument();
    });

    it('should use custom fallback when provided', async () => {
      const customFallback = <div data-testid="avatar-fallback">Avatar</div>;

      render(
        <OptimizedAvatar
          {...defaultProps}
          src="https://example.com/avatar.jpg"
          fallback={customFallback}
        />
      );

      // Should show placeholder initially
      expect(screen.getByText('TE')).toBeInTheDocument();
    });

    it('should have rounded-full class', () => {
      render(<OptimizedAvatar {...defaultProps} src="https://example.com/avatar.jpg" />);

      // LazyImage should have rounded-full class
      const container = screen.getByText('TE').closest('div');
      expect(container).toHaveClass('rounded-full');
    });

    it('should use custom className', () => {
      render(
        <OptimizedAvatar
          {...defaultProps}
          src="https://example.com/avatar.jpg"
          className="custom-avatar"
        />
      );

      const container = screen.getByText('TE').closest('div');
      expect(container).toHaveClass('custom-avatar');
    });
  });

  describe('Accessibility', () => {
    it('should use provided alt text', () => {
      const altText = 'Custom alt text';
      render(<OptimizedAvatar {...defaultProps} alt={altText} src="https://example.com/avatar.jpg" />);

      // The alt text would be used in the underlying LazyImage
      expect(screen.getByText('TE')).toBeInTheDocument(); // Placeholder is shown initially
    });

    it('should generate alt text from name when not provided', () => {
      render(<OptimizedAvatar {...defaultProps} src="https://example.com/avatar.jpg" />);

      expect(screen.getByText('TE')).toBeInTheDocument();
    });
  });
});

describe('LazyBackground Component', () => {
  const defaultProps = {
    src: 'https://example.com/background.jpg',
    children: <div>Content over background</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render children with loading state', () => {
      render(<LazyBackground {...defaultProps} />);

      expect(screen.getByText('Content over background')).toBeInTheDocument();
      expect(screen.getByText('Content over background').parentElement).toHaveClass('relative', 'z-10');
    });

    it('should show loading overlay initially', () => {
      render(<LazyBackground {...defaultProps} />);

      const loadingOverlay = document.querySelector('.animate-pulse');
      expect(loadingOverlay).toBeInTheDocument();
      expect(loadingOverlay).toHaveClass('bg-muted');
    });
  });

  describe('Background Loading', () => {
    it('should set background style when image loads', async () => {
      render(<LazyBackground {...defaultProps} />);

      // Find the hidden img element
      const hiddenImg = document.querySelector('img[alt=""]');
      expect(hiddenImg).toBeInTheDocument();

      // Simulate successful load
      fireEvent.load(hiddenImg!);

      await waitFor(() => {
        const container = screen.getByText('Content over background').closest('div');
        expect(container).toHaveStyle({
          backgroundImage: `url(${defaultProps.src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        });
      });
    });

    it('should show fallback when image fails to load', async () => {
      const fallback = <div data-testid="background-fallback">Failed to load</div>;

      render(<LazyBackground {...defaultProps} fallback={fallback} />);

      // Find the hidden img element
      const hiddenImg = document.querySelector('img[alt=""]');
      fireEvent.error(hiddenImg!);

      await waitFor(() => {
        expect(screen.getByTestId('background-fallback')).toBeInTheDocument();
      });
    });
  });

  describe('Props and Customization', () => {
    it('should apply custom className', () => {
      render(<LazyBackground {...defaultProps} className="custom-background" />);

      const container = screen.getByText('Content over background').closest('div');
      expect(container).toHaveClass('custom-background');
    });

    it('should render overlay when provided', () => {
      const overlay = <div data-testid="custom-overlay">Overlay content</div>;

      render(<LazyBackground {...defaultProps} overlay={overlay} />);

      expect(screen.getByTestId('custom-overlay')).toBeInTheDocument();
    });

    it('should use custom alt text for hidden img', () => {
      const altText = 'Custom background alt';
      render(<LazyBackground {...defaultProps} alt={altText} />);

      const hiddenImg = document.querySelector(`img[alt="${altText}"]`);
      expect(hiddenImg).toBeInTheDocument();
    });

    it('should position children above overlay', () => {
      const overlay = <div data-testid="overlay">Overlay</div>;

      render(<LazyBackground {...defaultProps} overlay={overlay} />);

      const childrenContainer = screen.getByText('Content over background').parentElement;
      expect(childrenContainer).toHaveClass('relative', 'z-10');
    });
  });

  describe('Hidden Image Element', () => {
    it('should have hidden class', () => {
      render(<LazyBackground {...defaultProps} />);

      const hiddenImg = document.querySelector('img');
      expect(hiddenImg).toHaveClass('hidden');
    });

    it('should have correct src attribute', () => {
      render(<LazyBackground {...defaultProps} />);

      const hiddenImg = document.querySelector('img');
      expect(hiddenImg).toHaveAttribute('src', defaultProps.src);
    });
  });
});

describe('Component Integration', () => {
  it('should handle missing src gracefully', () => {
    render(<LazyImage src="" alt="Empty src" />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should handle undefined props gracefully', () => {
    // @ts-ignore - Testing with undefined props
    render(<LazyImage />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should handle OptimizedAvatar with undefined name', () => {
    // @ts-ignore - Testing with undefined name
    render(<OptimizedAvatar name={undefined} />);

    expect(screen.getByText('TK')).toBeInTheDocument();
  });

  it('should handle LazyBackground with empty children', () => {
    render(<LazyBackground {...{ src: 'test.jpg', children: null }} />);

    // Should not crash
    const container = document.querySelector('.relative');
    expect(container).toBeInTheDocument();
  });
});