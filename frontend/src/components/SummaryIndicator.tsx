import React, { useState, useEffect } from 'react';

interface SummaryIndicatorProps {
  summary: string;
  onDismiss?: () => void;
}

export const SummaryIndicator: React.FC<SummaryIndicatorProps> = ({ 
  summary, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      handleDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="vix-summary-indicator"
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '10px 20px',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        boxSizing: 'border-box',
        wordWrap: 'break-word',
        lineHeight: 1.4
      }}
      onClick={handleDismiss}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Page summary"
      aria-live="polite"
      tabIndex={0}
    >
      VIX SUMMARY: {summary}
    </div>
  );
};