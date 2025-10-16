import React, { useState, useRef, useEffect, useCallback } from 'react';
import { imageCache } from '@/utils/cache';
import { Skeleton } from './ui/skeleton';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Event) => void;
  loading?: 'lazy' | 'eager';
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder,
  fallback,
  onLoad,
  onError,
  loading = 'lazy'
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager') {
      setIsIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsIntersecting(true);
        }
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before it comes into view
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loading]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageState('loaded');
    if (imgRef.current) {
      // Cache the image
      imageCache.set(src, imgRef.current.src);
    }
    onLoad?.();
  }, [src, onLoad]);

  // Handle image error
  const handleImageError = useCallback((error: Event) => {
    setImageState('error');
    onError?.(error);
    console.error('Image load error:', error);
  }, [onError]);

  // Try to load from cache
  const cachedSrc = imageCache.get(src);

  // Set image source
  useEffect(() => {
    if (imgRef.current) {
      if (isIntersecting || loading === 'eager') {
        if (cachedSrc) {
          imgRef.current.src = cachedSrc;
          setImageState('loaded');
        } else {
          imgRef.current.src = src;
        }
      }
    }
  }, [src, cachedSrc, isIntersecting, loading]);

  const placeholderElement = placeholder ? (
    <div className={className}>{placeholder}</div>
  ) : (
    <Skeleton className={`${className} ${width && height ? `w-${width} h-${height}` : 'w-full h-full'}`} />
  );

  const fallbackElement = fallback || (
    <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-4-4l4.586-4.586a2 2 0 012.828 0L4 16z"
        />
      </svg>
    </div>
  );

  const imageElement = (
    <img
      ref={imgRef}
      src={imageState === 'loaded' ? src : ''}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      onLoad={handleImageLoad}
      onError={handleImageError}
      style={{
        opacity: imageState === 'loaded' ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out'
      }}
    />
  );

  return (
    <div ref={containerRef} className="relative">
      {imageState === 'loading' && !isIntersecting && loading === 'lazy' && placeholderElement}
      {imageState === 'error' && fallbackElement}
      {imageState !== 'error' && imageElement}
    </div>
  );
};

// Optimized Avatar component with caching
interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  name: string;
  symbol?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: string;
}

const OptimizedAvatar: React.FC<OptimizedAvatarProps> = ({
  src,
  alt,
  name,
  symbol,
  size = 'md',
  className = '',
  fallback
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-lg'
  };

  const displayText = symbol || name?.substring(0, 2)?.toUpperCase() || 'TK';

  const placeholderElement = (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold`}>
      {displayText}
    </div>
  );

  const defaultFallback = (
    <div className={`${sizeClasses[size]} bg-muted flex items-center justify-center text-muted-foreground`}>
      <svg
        className="w-1/2 h-1/2"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a1 1 0 102 2 12 1 0 10-2 12 12 0z"
        />
      </svg>
    </div>
  );

  if (!src) {
    return (
      <div className={`${className} ${sizeClasses[size]}`}>
        {placeholderElement}
      </div>
    );
  }

  return (
    <LazyImage
      src={src}
      alt={alt || `${name} avatar`}
      className={`${className} ${sizeClasses[size]} rounded-full object-cover`}
      width={parseInt(size.replace(/\D/g, '')) * 8}
      height={parseInt(size.replace(/\D/g, '')) * 8}
      placeholder={placeholderElement}
      fallback={fallback || defaultFallback}
    />
  );
};

// Background image component with lazy loading
interface LazyBackgroundProps {
  src: string;
  alt?: string;
  className?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  overlay?: React.ReactNode;
}

const LazyBackground: React.FC<LazyBackgroundProps> = ({
  src,
  alt = '',
  className = '',
  children,
  fallback,
  overlay
}) => {
  const [backgroundState, setBackgroundState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [backgroundStyle, setBackgroundStyle] = useState<React.CSSProperties>({});

  const handleLoad = useCallback(() => {
    if (src) {
      setBackgroundStyle({
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      });
      setBackgroundState('loaded');
    }
  }, [src]);

  const handleError = useCallback(() => {
    setBackgroundState('error');
  }, []);

  return (
    <div
      className={`relative ${className}`}
      style={backgroundStyle}
    >
      {backgroundState === 'loading' && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      {backgroundState === 'error' && fallback}
      {overlay}
      <div className="relative z-10">
        {children}
      </div>
      {src && (
        <img
          src={src}
          alt={alt}
          className="hidden"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export { LazyImage, OptimizedAvatar, LazyBackground };