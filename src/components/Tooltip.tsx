import styled from 'styled-components';
import { useEffect, useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipContent = styled.div<{ $show: boolean; $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => $top}px;
  left: ${({ $left }) => $left}px;
  transform: translateX(-50%) translateY(${({ $show }) => $show ? '0' : '-6px'});
  background: #ffffff;
  color: #000000;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
  pointer-events: none;
  opacity: ${({ $show }) => $show ? 1 : 0};
  visibility: ${({ $show }) => $show ? 'visible' : 'hidden'};
  transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.08);
  
  &::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-bottom-color: #ffffff;
  }
  
  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-bottom-color: rgba(0, 0, 0, 0.08);
    margin-bottom: -1px;
  }
`;

interface TooltipProps {
  children: ReactNode;
  text: string;
}

export function Tooltip({ children, text }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2
      });
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    updatePosition();
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setShow(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (show) {
        updatePosition();
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show]);

  return (
    <>
      <TooltipWrapper 
        ref={wrapperRef}
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </TooltipWrapper>
      {typeof document !== 'undefined' && createPortal(
        <TooltipContent $show={show} $top={position.top} $left={position.left}>
          {text}
        </TooltipContent>,
        document.body
      )}
    </>
  );
}

