import { injectable } from 'tsyringe';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { DIProvider } from '../contexts/DIContext';
import { ChatInterface } from '../components/ChatInterface';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { SummaryIndicator } from '../components/SummaryIndicator';

interface LoadingState {
  element: HTMLElement;
  root: Root;
  currentMessage: string;
}

@injectable()
export class ReactPresentationBridge {
  private chatRoot: Root | null = null;
  private loadingState: LoadingState | null = null;
  private summaryRoot: Root | null = null;

  showChatInterface(): void {
    // Check if already exists
    if (document.getElementById('vix-chat-interface')) return;

    const chatContainer = document.createElement('div');
    chatContainer.id = 'vix-chat-interface';
    document.body.insertBefore(chatContainer, document.body.firstChild);

    this.chatRoot = createRoot(chatContainer);
    this.chatRoot.render(
      React.createElement(DIProvider, {}, 
        React.createElement(ChatInterface, {
          onClose: () => this.hideChatInterface()
        })
      )
    );

    console.log('ChatInterface (React) rendered');
  }

  hideChatInterface(): void {
    const container = document.getElementById('vix-chat-interface');
    if (container && this.chatRoot) {
      this.chatRoot.unmount();
      container.remove();
      this.chatRoot = null;
    }
  }

  showLoadingIndicator(message: string = 'Loading VIX'): HTMLElement | string {
    // If already exists, update it
    if (this.loadingState) {
      this.updateLoadingStatus(this.loadingState.element, message);
      return this.loadingState.element;
    }

    const loadingContainer = document.createElement('div');
    loadingContainer.id = 'vix-loading-indicator';
    document.body.insertBefore(loadingContainer, document.body.firstChild);

    const root = createRoot(loadingContainer);
    
    this.loadingState = {
      element: loadingContainer,
      root,
      currentMessage: message
    };

    root.render(
      React.createElement(DIProvider, {},
        React.createElement(LoadingIndicator, { 
          message,
          onDismiss: () => this.hideLoadingIndicator()
        })
      )
    );

    console.log('LoadingIndicator (React) rendered with message:', message);
    return loadingContainer;
  }

  updateLoadingStatus(element: HTMLElement | null, message: string): void {
    if (this.loadingState && this.loadingState.root) {
      this.loadingState.currentMessage = message;
      this.loadingState.root.render(
        React.createElement(DIProvider, {},
          React.createElement(LoadingIndicator, { 
            message,
            onDismiss: () => this.hideLoadingIndicator()
          })
        )
      );
      console.log('LoadingIndicator updated with message:', message);
    }
  }

  showLoadingError(element: HTMLElement | null, error: Error): void {
    if (this.loadingState && this.loadingState.root) {
      this.loadingState.root.render(
        React.createElement(DIProvider, {},
          React.createElement(LoadingIndicator, { 
            message: this.loadingState.currentMessage,
            showError: true,
            errorMessage: error.message,
            onDismiss: () => this.hideLoadingIndicator()
          })
        )
      );
      console.error('LoadingIndicator showing error:', error);
    }
  }

  fadeOutLoading(element: HTMLElement | null): void {
    // React component handles auto-fade, just clean up after delay
    setTimeout(() => {
      this.hideLoadingIndicator();
    }, 10000); // 9s fade + 1s transition
  }

  hideLoadingIndicator(): void {
    if (this.loadingState) {
      this.loadingState.root.unmount();
      this.loadingState.element.remove();
      this.loadingState = null;
    }
  }

  showSummaryIndicator(summary: string): void {
    // Remove existing summary if present
    this.hideSummaryIndicator();

    // Check if should append to chat interface or body
    const chatInterface = document.getElementById('vix-chat-interface');
    let summaryContainer: HTMLElement;

    if (chatInterface) {
      summaryContainer = document.createElement('div');
      summaryContainer.id = 'vix-summary-indicator';
      chatInterface.appendChild(summaryContainer);
    } else {
      summaryContainer = document.createElement('div');
      summaryContainer.id = 'vix-summary-indicator';
      document.body.insertBefore(summaryContainer, document.body.firstChild);
    }

    this.summaryRoot = createRoot(summaryContainer);
    this.summaryRoot.render(
      React.createElement(DIProvider, {},
        React.createElement(SummaryIndicator, {
          summary,
          onDismiss: () => this.hideSummaryIndicator()
        })
      )
    );

    console.log('SummaryIndicator (React) rendered');
  }

  hideSummaryIndicator(): void {
    const container = document.getElementById('vix-summary-indicator');
    if (container && this.summaryRoot) {
      this.summaryRoot.unmount();
      container.remove();
      this.summaryRoot = null;
    }
  }

  updateSummaryIndicator(summary: string): void {
    if (this.summaryRoot) {
      this.summaryRoot.render(
        React.createElement(DIProvider, {},
          React.createElement(SummaryIndicator, {
            summary,
            onDismiss: () => this.hideSummaryIndicator()
          })
        )
      );
    } else {
      this.showSummaryIndicator(summary);
    }
  }
}