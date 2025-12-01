'use client';

import { BookOpen, FileText, Loader2, GripVertical, Gift } from 'lucide-react';
import { useCreditSummary } from '@/contexts/credit-summary-context';
import { Card } from '@/components/ui/card';
import { useState, useEffect, useRef } from 'react';

const DEFAULT_POSITION = { x: -24, y: 50 };
const STORAGE_KEY = 'floating-credit-widget-position';

export function FloatingCreditWidget() {
  const { creditSummary, isLoading } = useCreditSummary();
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedPosition = localStorage.getItem(STORAGE_KEY);
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        console.error('Failed to parse saved position:', e);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!cardRef.current) return;
    
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 0);

    const newPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    };
    
    setPosition(newPosition);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosition));
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const newX = touch.clientX - dragOffset.x;
    const newY = touch.clientY - dragOffset.y;

    const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 0);

    const newPosition = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    };
    
    setPosition(newPosition);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosition));
    e.preventDefault();
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset, position]);

  if (isLoading) {
    return (
      <div 
        className="fixed z-50"
        style={{ 
          right: position.x === DEFAULT_POSITION.x ? `${Math.abs(DEFAULT_POSITION.x)}px` : 'auto',
          left: position.x !== DEFAULT_POSITION.x ? `${position.x}px` : 'auto',
          top: position.y === DEFAULT_POSITION.y ? `${position.y}%` : `${position.y}px`,
          transform: position.y === DEFAULT_POSITION.y ? 'translateY(-50%)' : 'none',
        }}
      >
        <Card className="p-3 shadow-lg border-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Loader2 className="h-4 w-4 animate-spin" />
        </Card>
      </div>
    );
  }

  if (!creditSummary) {
    return null;
  }

  return (
    <div 
      ref={cardRef}
      className="fixed z-50"
      style={{ 
        right: position.x === DEFAULT_POSITION.x ? `${Math.abs(DEFAULT_POSITION.x)}px` : 'auto',
        left: position.x !== DEFAULT_POSITION.x ? `${position.x}px` : 'auto',
        top: position.y === DEFAULT_POSITION.y ? `${position.y}%` : `${position.y}px`,
        transform: position.y === DEFAULT_POSITION.y ? 'translateY(-50%)' : 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <Card 
        className="p-4 shadow-lg border-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Credits Remaining
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Book Creation</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-primary">
                    {creditSummary.bookCreditsAvailable.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    of {creditSummary.bookCreditsTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">AI Words Credit</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-primary">
                    {creditSummary.wordCreditsAvailable.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    of {creditSummary.wordCreditsTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Offer Credits</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-primary">
                    {creditSummary.offerCreditsAvailable.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    of {creditSummary.offerCreditsTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
