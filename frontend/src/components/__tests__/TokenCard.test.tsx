/**
 * TokenCard Component Tests
 * React Testing Library test suite for TokenCard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TokenCard } from '../TokenCard';
import { createMockToken } from '../../setupTests';

// Mock the LazyImage component
jest.mock('../LazyImage', () => ({
  LazyImage: jest.fn(({ src, alt, className, placeholder, fallback }) => (
    <div
      data-testid="lazy-image"
      className={className}
      data-src={src}
      data-alt={alt}
      onClick={() => console.log('Image clicked')}
    >
      {placeholder}
    </div>
  )),
}));

// Mock the bonding curve config
jest.mock('../../utils/bondingCurve', () => ({
  BONDING_CURVE_CONFIG: {
    GROSS_RAISE: 100000,
  },
}));

// Mock the navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('TokenCard Component', () => {
  const mockToken = createMockToken({
    name: 'Test Token',
    ticker: 'TEST',
    contractAddress: '0x1234567890123456789012345678901234567890',
    marketCap: '50000',
    priceChange: 10,
    creatorName: 'Test Creator',
    created_at: '2024-01-01T00:00:00.000Z',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  describe('Rendering', () => {
    it('should render token card with all required information', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      expect(screen.getByText('Test Token')).toBeInTheDocument();
      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('by Test Creator')).toBeInTheDocument();
      expect(screen.getByText('MC $50.0K')).toBeInTheDocument();
      expect(screen.getByText('▲ 10%')).toBeInTheDocument();
    });

    it('should display placeholder image', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const image = screen.getByTestId('lazy-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('data-src', expect.stringContaining('picsum.photos'));
    });

    it('should show unknown creator when creatorName is missing', () => {
      const tokenWithoutCreator = { ...mockToken, creatorName: undefined };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithoutCreator} />
        </TestWrapper>
      );

      expect(screen.getByText('by Unknown')).toBeInTheDocument();
    });

    it('should display contract address in shortened format', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
      expect(screen.getByText('View')).toBeInTheDocument();
    });

    it('should show bonding progress bar', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const progressBar = document.querySelector('.bg-gradient-to-r');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Market Cap Formatting', () => {
    it('should format market cap in millions', () => {
      const tokenWithLargeCap = { ...mockToken, marketCap: '2500000' };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithLargeCap} />
        </TestWrapper>
      );

      expect(screen.getByText('MC $2.5M')).toBeInTheDocument();
    });

    it('should format market cap in thousands', () => {
      const tokenWithMediumCap = { ...mockToken, marketCap: '75000' };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithMediumCap} />
        </TestWrapper>
      );

      expect(screen.getByText('MC $75.0K')).toBeInTheDocument();
    });

    it('should format market cap in dollars for small amounts', () => {
      const tokenWithSmallCap = { ...mockToken, marketCap: '500' };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithSmallCap} />
        </TestWrapper>
      );

      expect(screen.getByText('MC $500')).toBeInTheDocument();
    });

    it('should handle market cap with special characters', () => {
      const tokenWithSpecialCap = { ...mockToken, marketCap: '$1,234,567' };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithSpecialCap} />
        </TestWrapper>
      );

      expect(screen.getByText('MC $1.2M')).toBeInTheDocument();
    });
  });

  describe('Price Change Display', () => {
    it('should display positive price change with green color and up arrow', () => {
      const tokenWithPositiveChange = { ...mockToken, priceChange: 15 };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithPositiveChange} />
        </TestWrapper>
      );

      const priceChangeElement = screen.getByText('▲ 15%');
      expect(priceChangeElement).toBeInTheDocument();
      expect(priceChangeElement).toHaveClass('text-green-400');
    });

    it('should display negative price change with red color and down arrow', () => {
      const tokenWithNegativeChange = { ...mockToken, priceChange: -25 };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithNegativeChange} />
        </TestWrapper>
      );

      const priceChangeElement = screen.getByText('▼ 25%');
      expect(priceChangeElement).toBeInTheDocument();
      expect(priceChangeElement).toHaveClass('text-red-400');
    });

    it('should display zero price change', () => {
      const tokenWithZeroChange = { ...mockToken, priceChange: 0 };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithZeroChange} />
        </TestWrapper>
      );

      expect(screen.getByText('▲ 0%')).toBeInTheDocument();
    });
  });

  describe('Time Ago Formatting', () => {
    beforeEach(() => {
      // Mock current time to 2024-01-02T00:00:00.000Z
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-02T00:00:00.000Z').getTime());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should display "Just now" for very recent tokens', () => {
      const recentToken = {
        ...mockToken,
        created_at: new Date('2024-01-01T23:59:30.000Z').toISOString(),
      };

      render(
        <TestWrapper>
          <TokenCard token={recentToken} />
        </TestWrapper>
      );

      expect(screen.getByText(/Just now/)).toBeInTheDocument();
    });

    it('should display minutes ago for recent tokens', () => {
      const minutesAgoToken = {
        ...mockToken,
        created_at: new Date('2024-01-01T23:55:00.000Z').toISOString(),
      };

      render(
        <TestWrapper>
          <TokenCard token={minutesAgoToken} />
        </TestWrapper>
      );

      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('should display hours ago for same-day tokens', () => {
      const hoursAgoToken = {
        ...mockToken,
        created_at: new Date('2024-01-01T16:00:00.000Z').toISOString(),
      };

      render(
        <TestWrapper>
          <TokenCard token={hoursAgoToken} />
        </TestWrapper>
      );

      expect(screen.getByText('8h ago')).toBeInTheDocument();
    });

    it('should display days ago for older tokens', () => {
      const daysAgoToken = {
        ...mockToken,
        created_at: new Date('2023-12-31T00:00:00.000Z').toISOString(),
      };

      render(
        <TestWrapper>
          <TokenCard token={daysAgoToken} />
        </TestWrapper>
      );

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('should handle invalid dates gracefully', () => {
      const tokenWithInvalidDate = {
        ...mockToken,
        created_at: 'Invalid Date',
      };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithInvalidDate} />
        </TestWrapper>
      );

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should handle missing created_at date', () => {
      const tokenWithoutDate = { ...mockToken, created_at: undefined };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithoutDate} />
        </TestWrapper>
      );

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should navigate to token detail when card is clicked', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic'); // The main div
      fireEvent.click(card);

      expect(mockNavigate).toHaveBeenCalledWith('/token/0x1234567890123456789012345678901234567890');
    });

    it('should generate valid contract address for invalid addresses', () => {
      const tokenWithInvalidAddress = {
        ...mockToken,
        contractAddress: 'invalid-address',
      };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithInvalidAddress} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');
      fireEvent.click(card);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/^\/token\/0x[a-fA-F0-9]{40}$/)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Generated valid contract address')
      );
    });

    it('should handle missing contract address', () => {
      const tokenWithoutAddress = { ...mockToken, contractAddress: undefined };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithoutAddress} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');
      fireEvent.click(card);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/^\/token\/0x[a-fA-F0-9]{40}$/)
      );
    });

    it('should toggle favorite when heart button is clicked', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button');

      // Initially not favorited
      const heartIcon = favoriteButton.querySelector('svg');
      expect(heartIcon).not.toHaveClass('fill-red-500');

      // Click to favorite
      fireEvent.click(favoriteButton);

      // Should now be favorited
      const updatedHeartIcon = favoriteButton.querySelector('svg');
      expect(updatedHeartIcon).toHaveClass('fill-red-500', 'text-red-500');

      // Click to unfavorite
      fireEvent.click(favoriteButton);

      // Should be unfavorited again
      const finalHeartIcon = favoriteButton.querySelector('svg');
      expect(finalHeartIcon).not.toHaveClass('fill-red-500');
    });

    it('should prevent navigation when favorite button is clicked', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button');
      fireEvent.click(favoriteButton);

      // Should not have navigated
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show hover effects when mouse enters and leaves', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');

      // Mouse enter
      fireEvent.mouseEnter(card);
      expect(card).toHaveClass('shadow-lg', 'shadow-black/20', 'transform', '-translate-y-1');

      // Mouse leave
      fireEvent.mouseLeave(card);
      expect(card).not.toHaveClass('shadow-lg', 'shadow-black/20', 'transform', '-translate-y-1');
    });

    it('should show navigation state when navigating', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');
      fireEvent.click(card);

      expect(card).toHaveClass('opacity-75', 'scale-95');
    });
  });

  describe('Contract Address Handling', () => {
    it('should handle contract property fallback', () => {
      const tokenWithContract = {
        ...mockToken,
        contractAddress: undefined,
        contract: '0x9876543210987654321098765432109876543210',
      };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithContract} />
        </TestWrapper>
      );

      expect(screen.getByText('0x9876...3210')).toBeInTheDocument();

      const card = screen.getByRole('generic');
      fireEvent.click(card);

      expect(mockNavigate).toHaveBeenCalledWith('/token/0x9876543210987654321098765432109876543210');
    });

    it('should handle both address properties missing', () => {
      const tokenWithoutAddress = {
        ...mockToken,
        contractAddress: undefined,
        contract: undefined,
      };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithoutAddress} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');
      fireEvent.click(card);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/^\/token\/0x[a-fA-F0-9]{40}$/)
      );
    });
  });

  describe('Creator Information', () => {
    it('should display creator avatar when available', () => {
      const tokenWithAvatar = {
        ...mockToken,
        creatorName: 'Platform Creator',
        creatorAvatar: 'https://example.com/avatar.jpg',
      };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithAvatar} />
        </TestWrapper>
      );

      const avatar = screen.getByAltText('Platform Creator');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should show verification badge for platform creators', () => {
      const platformToken = {
        ...mockToken,
        creatorName: 'Platform Creator',
      };

      render(
        <TestWrapper>
          <TokenCard token={platformToken} />
        </TestWrapper>
      );

      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should not show verification badge for non-platform creators', () => {
      const regularToken = {
        ...mockToken,
        creatorName: 'Regular Creator',
      };

      render(
        <TestWrapper>
          <TokenCard token={regularToken} />
        </TestWrapper>
      );

      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });
  });

  describe('Bonding Progress', () => {
    it('should use token progress when available', () => {
      const tokenWithProgress = {
        ...mockToken,
        progress: 75,
      };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithProgress} />
        </TestWrapper>
      );

      const progressBar = document.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('should use default progress when not provided', () => {
      const tokenWithoutProgress = {
        ...mockToken,
        progress: undefined,
      };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithoutProgress} />
        </TestWrapper>
      );

      const progressBar = document.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '25%' });
    });
  });

  describe('Error Handling', () => {
    it('should handle console errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      // Component should still render despite potential console errors
      expect(screen.getByText('Test Token')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle malformed market cap values', () => {
      const tokenWithMalformedCap = {
        ...mockToken,
        marketCap: 'abc123def',
      };

      render(
        <TestWrapper>
          <TokenCard token={tokenWithMalformedCap} />
        </TestWrapper>
      );

      expect(screen.getByText('MC $123')).toBeInTheDocument();
    });

    it('should handle extreme time differences', () => {
      const futureToken = {
        ...mockToken,
        created_at: new Date('2025-01-01T00:00:00.000Z').toISOString(), // Future date
      };

      render(
        <TestWrapper>
          <TokenCard token={futureToken} />
        </TestWrapper>
      );

      // Should handle gracefully without crashing
      expect(screen.getByText('Test Token')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button semantics for favorite action', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const favoriteButton = screen.getByRole('button');
      expect(favoriteButton).toBeInTheDocument();
    });

    it('should have clickable area for the entire card', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const card = screen.getByRole('generic');
      expect(card).toHaveStyle('cursor: pointer');
    });

    it('should provide alt text for images', () => {
      render(
        <TestWrapper>
          <TokenCard token={mockToken} />
        </TestWrapper>
      );

      const image = screen.getByTestId('lazy-image');
      expect(image).toHaveAttribute('data-alt', 'Test Token');
    });
  });
});