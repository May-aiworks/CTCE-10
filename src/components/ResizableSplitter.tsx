import React, { useState, useCallback, useEffect, useRef } from 'react';
import './ResizableSplitter.css';

interface ResizableSplitterProps {
  onResize: (leftWidth: number) => void;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  onResize,
  initialLeftWidth = 400,
  minLeftWidth = 250,
  minRightWidth = 400,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const container = splitterRef.current?.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newLeftWidth = e.clientX - containerRect.left;

      // Check constraints
      const maxLeftWidth = containerRect.width - minRightWidth;
      if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
        onResize(newLeftWidth);
      }
    },
    [isDragging, minLeftWidth, minRightWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={splitterRef}
      className={`resizable-splitter ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <div className="splitter-icon">⟷</div>
    </div>
  );
};
