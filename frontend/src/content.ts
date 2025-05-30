import 'reflect-metadata';
import { diContainer } from './core/container/Container';
import { TOKENS } from './core/container/tokens';
import type { IBrowserEventHandler } from './core/interfaces';

// Configure all dependencies
diContainer.configure();

// Initialize browser event handler
try {
  const browserEventHandler = diContainer.resolve<IBrowserEventHandler>(TOKENS.BrowserEventHandler);
  browserEventHandler.setupEventListeners();
  
  console.log('VIX Extension: Initialized successfully');
} catch (error) {
  console.error('VIX Extension: Failed to initialize', error);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  try {
    const browserEventHandler = diContainer.resolve<IBrowserEventHandler>(TOKENS.BrowserEventHandler);
    browserEventHandler.cleanup();
  } catch (error) {
    console.error('VIX Extension: Cleanup failed', error);
  }
});