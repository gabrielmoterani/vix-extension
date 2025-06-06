import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDI } from '../contexts/DIContext';
import { TOKENS } from '../core/container/tokens';
import type { IConversationProcessingService } from '~src/core/interfaces';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { resolve } = useDI();
  const conversationService = resolve<IConversationProcessingService>(TOKENS.ConversationProcessingService);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await conversationService.processUserMessage(inputValue);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your message.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, conversationService]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="vix-chat-interface" style={{
      position: 'relative',
      width: '100%',
      backgroundColor: '#ffffff',
      padding: '15px 20px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      fontFamily: 'Arial, sans-serif',
      maxHeight: '400px'
    }}>
      {/* Header */}
      <div style={{ color: '#666', fontSize: '14px' }}>
        VIX AI Assistant
      </div>

      {/* Messages */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        padding: '10px'
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '10px',
              padding: '8px 12px',
              borderRadius: '4px',
              backgroundColor: message.role === 'user' ? '#e3f2fd' : '#f5f5f5',
              marginLeft: message.role === 'user' ? 'auto' : '0',
              marginRight: message.role === 'user' ? '0' : 'auto',
              maxWidth: '80%',
              textAlign: message.role === 'user' ? 'right' : 'left'
            }}
          >
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
        {isLoading && (
          <div style={{ padding: '8px', fontStyle: 'italic', color: '#666' }}>
            Processing your request...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your request here..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px',
            border: '2px solid #4CAF50',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: isLoading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};