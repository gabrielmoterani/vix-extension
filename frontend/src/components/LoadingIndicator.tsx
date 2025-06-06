import React, { useState, useEffect } from 'react';

interface LoadingIndicatorProps {
  message?: string;
  onDismiss?: () => void;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = 'Loading VIX', 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div
      className="vix-loading-indicator"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        backgroundColor: '#2196F3',
        color: 'white',
        padding: '10px 20px',
        zIndex: 999998,
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        cursor: 'pointer'
      }}
      onClick={handleDismiss}
      role="status"
      aria-live="polite"
      aria-label="Loading indicator"
    >
      VIX MESSAGE: {message}
    </div>
  );
};