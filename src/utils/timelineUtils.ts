import type { PerformanceEntry, TimelineBounds, EventWithPosition } from '../types/performance';
import { EVENT_TYPE_COLORS, VIEWPORT_WIDTH, LANE_HEIGHT, LANE_OFFSET } from '../constants/performance';

export function getEventColor(entryType: string): string {
  return EVENT_TYPE_COLORS[entryType] || EVENT_TYPE_COLORS.default;
}

export function calculateTimelineBounds(
  filteredEvents: PerformanceEntry[],
  milestoneEvents: PerformanceEntry[],
  showNegativeTimestamps: boolean
): TimelineBounds {
  const allEvents = [...filteredEvents, ...milestoneEvents];
  if (allEvents.length === 0) return { min: 0, max: 1000 };
  
  const max = Math.max(...allEvents.map(e => e.startTime + e.duration));
  // When showing negative timestamps, extend the min to include them
  const minStart = showNegativeTimestamps
    ? Math.min(0, ...allEvents.map(e => e.startTime))
    : 0;
  return { min: minStart, max };
}

export function timeToPixels(
  time: number,
  bounds: TimelineBounds,
  zoomLevel: number,
  panOffset: number
): number {
  const scaledWidth = VIEWPORT_WIDTH * zoomLevel;
  return ((time - bounds.min) / (bounds.max - bounds.min)) * scaledWidth + panOffset;
}

export function pixelsToTime(
  pixels: number,
  bounds: TimelineBounds,
  zoomLevel: number,
  panOffset: number
): number {
  const scaledWidth = VIEWPORT_WIDTH * zoomLevel;
  const adjustedPixels = pixels - panOffset;
  return bounds.min + (adjustedPixels / scaledWidth) * (bounds.max - bounds.min);
}

export function calculateLanePositions(events: PerformanceEntry[]): EventWithPosition[] {
  // Sort events by start time first, then by end time (descending) for same start times
  const sorted = [...events].sort((a, b) => {
    // First sort by start time (ascending - earlier events first)
    if (a.startTime !== b.startTime) {
      return a.startTime - b.startTime;
    }
    // If start times are the same, sort by end time (descending - longer duration first)
    // This puts parent/caller events above their children/callees
    const aEnd = a.startTime + a.duration;
    const bEnd = b.startTime + b.duration;
    return bEnd - aEnd;
  });
  
  // Track occupied lanes - each lane stores when it becomes available (endTime)
  const lanes: Array<number> = []; // stores endTime for each lane
  
  // Track the minimum lane that should be used for the next event to maintain chronological order
  // This prevents later events from appearing above earlier events
  let minLaneForNextStartTime = 0;
  let lastStartTime = -1;
  
  return sorted.map((event) => {
    const eventEnd = event.startTime + event.duration;
    
    // If this event starts later than the previous event, update the minimum lane constraint
    if (event.startTime > lastStartTime) {
      // Find the lowest lane that's still occupied at this start time
      let lowestOccupiedLane = -1;
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] > event.startTime) {
          lowestOccupiedLane = i;
        }
      }
      // Can only go above occupied lanes, not above where previous events were placed
      minLaneForNextStartTime = Math.max(0, lowestOccupiedLane + 1);
      lastStartTime = event.startTime;
    }
    
    // Find the first (topmost) available lane, but not higher than minLaneForNextStartTime
    let lane = -1;
    for (let i = minLaneForNextStartTime; i < lanes.length; i++) {
      if (lanes[i] <= event.startTime) {
        lane = i;
        lanes[i] = eventEnd;
        break;
      }
    }
    
    // If no available lane found in the valid range, create a new one at the bottom
    if (lane === -1) {
      lane = Math.max(lanes.length, minLaneForNextStartTime);
      // Ensure lanes array is big enough
      while (lanes.length <= lane) {
        lanes.push(0);
      }
      lanes[lane] = eventEnd;
    }
    
    return { ...event, lane };
  });
}

export function calculateEventPosition(lane: number): number {
  return lane * LANE_HEIGHT + LANE_OFFSET;
}

