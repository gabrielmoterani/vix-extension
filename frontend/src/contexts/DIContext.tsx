import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { diContainer } from '../core/container/Container';
import { TOKENS } from '../core/container/tokens';
import type { IDomModifier } from '~src/core/interfaces';

interface DIContextType {
  container: typeof diContainer;
  resolve: <T>(token: symbol) => T;
}

const DIContext = createContext<DIContextType | null>(null);

export const DIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Configure container once
  useEffect(() => {
    diContainer.configure();
  }, []);

  const contextValue: DIContextType = {
    container: diContainer,
    resolve: (token: symbol) => diContainer.resolve(token)
  };

  return (
    <DIContext.Provider value={contextValue}>
      {children}
    </DIContext.Provider>
  );
}

export const useDI = () => {
  const context = useContext(DIContext);
  if (!context) {
    throw new Error('useDI must be used within DIProvider');
  }
  return context;
}


export const useConversationService = () => {
  const { resolve } = useDI();
  return resolve<IConversationProcessingService>(TOKENS.ConversationProcessingService);
}

export const useDomModifier = () => {
  const { resolve } = useDI();
  return resolve<IDomModifier>(TOKENS.DomModifier);
}