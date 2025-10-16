import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Creator {
  id: string;
  username: string;
  displayName: string;
  walletAddress: string;
  createdAt: string;
  tokensCreated: number;
  avatar?: string;
  bio?: string;
}

interface CreatorContextType {
  creator: Creator | null;
  isCreatorConnected: boolean;
  connectAsCreator: (username: string, walletAddress: string) => void;
  disconnectCreator: () => void;
  updateCreatorProfile: (updates: Partial<Creator>) => void;
}

const CreatorContext = createContext<CreatorContextType | undefined>(undefined);

export const useCreator = () => {
  const context = useContext(CreatorContext);
  if (!context) {
    throw new Error('useCreator must be used within a CreatorProvider');
  }
  return context;
};

interface CreatorProviderProps {
  children: ReactNode;
}

export const CreatorProvider = ({ children }: CreatorProviderProps) => {
  const [creator, setCreator] = useState<Creator | null>(null);

  // Load creator from localStorage on mount
  useEffect(() => {
    const storedCreator = localStorage.getItem('creator');
    if (storedCreator) {
      try {
        setCreator(JSON.parse(storedCreator));
      } catch (error) {
        console.error('Error parsing stored creator:', error);
        localStorage.removeItem('creator');
      }
    }
  }, []);

  // Save creator to localStorage whenever it changes
  useEffect(() => {
    if (creator) {
      localStorage.setItem('creator', JSON.stringify(creator));
    } else {
      localStorage.removeItem('creator');
    }
  }, [creator]);

  const connectAsCreator = (username: string, walletAddress: string) => {
    const newCreator: Creator = {
      id: `creator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: username.toLowerCase().replace(/\s+/g, '_'),
      displayName: username,
      walletAddress,
      createdAt: new Date().toISOString(),
      tokensCreated: 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      bio: `Token creator on the platform`
    };

    setCreator(newCreator);
    console.log('✅ Creator connected:', newCreator);
  };

  const disconnectCreator = () => {
    setCreator(null);
    console.log('🔌 Creator disconnected');
  };

  const updateCreatorProfile = (updates: Partial<Creator>) => {
    if (creator) {
      setCreator({ ...creator, ...updates });
    }
  };

  const value: CreatorContextType = {
    creator,
    isCreatorConnected: !!creator,
    connectAsCreator,
    disconnectCreator,
    updateCreatorProfile
  };

  return (
    <CreatorContext.Provider value={value}>
      {children}
    </CreatorContext.Provider>
  );
};