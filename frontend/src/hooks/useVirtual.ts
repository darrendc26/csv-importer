import { useState, useEffect, UIEvent, useRef } from 'react';

interface UseVirtualProps {
  totalCount: number;
  estimateRowHeight: number;
  buffer?: number;
}

export function useVirtual({
  totalCount,
  estimateRowHeight,
  buffer = 5,
}: UseVirtualProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor container clientHeight for viewport resizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => {
      setContainerHeight(el.clientHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(handleResize);
    observer.observe(el);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const startIndex = Math.max(0, Math.floor(scrollTop / estimateRowHeight) - buffer);
  const endIndex = Math.min(totalCount - 1, Math.floor((scrollTop + containerHeight) / estimateRowHeight) + buffer);

  const totalHeight = totalCount * estimateRowHeight;
  const offsetY = startIndex * estimateRowHeight;

  return {
    containerRef,
    handleScroll,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
  };
}
