import { useState, useRef } from 'react';
import type { PerformanceEntry, CursorPosition } from '../types/performance';

interface TimelineInteractionState {
  hoveredEvent: PerformanceEntry | null;
  timelineCursorPosition: CursorPosition | null;
  timelineRef: React.RefObject<HTMLDivElement>;
  timelineContentRef: React.RefObject<HTMLDivElement>;
}

interface TimelineInteractionHandlers {
  setHoveredEvent: (event: PerformanceEntry | null) => void;
  handleTimelineMouseMove: (e: React.MouseEvent<HTMLDivElement>, pixelsToTime: (pixels: number) => number) => void;
  handleTimelineMouseLeave: () => void;
}

export function useTimelineInteraction(): [TimelineInteractionState, TimelineInteractionHandlers] {
  const [hoveredEvent, setHoveredEvent] = useState<PerformanceEntry | null>(null);
  const [timelineCursorPosition, setTimelineCursorPosition] = useState<CursorPosition | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>, pixelsToTime: (pixels: number) => number) => {
    if (!timelineContentRef.current) return;
    
    const rect = timelineContentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineContentRef.current.scrollLeft;
    const time = pixelsToTime(x);
    
    setTimelineCursorPosition({ x, time });
  };

  const handleTimelineMouseLeave = () => {
    setTimelineCursorPosition(null);
  };

  const state: TimelineInteractionState = {
    hoveredEvent,
    timelineCursorPosition,
    timelineRef: timelineRef as React.RefObject<HTMLDivElement>,
    timelineContentRef: timelineContentRef as React.RefObject<HTMLDivElement>,
  };

  const handlers: TimelineInteractionHandlers = {
    setHoveredEvent,
    handleTimelineMouseMove,
    handleTimelineMouseLeave,
  };

  return [state, handlers];
}

