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
  // Sort events: navigation first, then navigation-phase, then by start time, then by duration
  const sorted = [...events].sort((a, b) => {
    // Prioritize navigation event (goes to lane 0)
    const aIsNav = a.entryType === 'navigation';
    const bIsNav = b.entryType === 'navigation';
    if (aIsNav && !bIsNav) return -1;
    if (!aIsNav && bIsNav) return 1;
    
    // Then prioritize navigation-phase events (goes to lane 1)
    const aIsNavPhase = a.entryType === 'navigation-phase';
    const bIsNavPhase = b.entryType === 'navigation-phase';
    if (aIsNavPhase && !bIsNavPhase) return -1;
    if (!aIsNavPhase && bIsNavPhase) return 1;
    
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
  let maxLaneUsedSoFar = 1; // Track the highest lane used across ALL events processed
  
  return sorted.map((event) => {
    const eventEnd = event.startTime + event.duration;
    const isNav = event.entryType === 'navigation';
    const isNavPhase = event.entryType === 'navigation-phase';
    
    // Navigation event gets lane 0 (first row)
    if (isNav) {
      // Ensure we have at least 1 lane
      while (lanes.length < 1) {
        lanes.push(0);
      }
      lanes[0] = eventEnd;
      return { ...event, lane: 0 };
    }
    
    // Navigation-phase events get lane 1 (second row)
    if (isNavPhase) {
      // Ensure we have at least 2 lanes
      while (lanes.length < 2) {
        lanes.push(0);
      }
      // Always place in lane 1, even if it overlaps (they shouldn't overlap with each other)
      lanes[1] = Math.max(lanes[1], eventEnd);
      return { ...event, lane: 1 };
    }
    
    // Determine the starting lane to search from
    let searchStartLane = 2; // Default: start from lane 2 (navigation uses 0-1)
    
    if (event.startTime > lastStartTime) {
      // New start time - events starting later must go at or below ALL previously assigned lanes
      // This ensures strict chronological ordering: earlier events always appear in earlier rows
      minLaneForNextStartTime = maxLaneUsedSoFar + 1;
      lastStartTime = event.startTime;
      searchStartLane = minLaneForNextStartTime;
    } else if (event.startTime === lastStartTime) {
      // Same start time - allow searching from lane 2 (not constrained by minLaneForNextStartTime)
      // This lets longer-duration events that were sorted first grab earlier lanes
      searchStartLane = 2;
    } else {
      // Earlier start time (shouldn't happen with our sort, but handle it)
      searchStartLane = minLaneForNextStartTime;
    }
    
    // Find the first (topmost) available lane, starting from searchStartLane
    let lane = -1;
    for (let i = searchStartLane; i < lanes.length; i++) {
      if (lanes[i] <= event.startTime) {
        lane = i;
        lanes[i] = eventEnd;
        break;
      }
    }
    
    // If no available lane found in the valid range, create a new one at the bottom
    if (lane === -1) {
      lane = Math.max(lanes.length, searchStartLane);
      // Ensure lanes array is big enough
      while (lanes.length <= lane) {
        lanes.push(0);
      }
      lanes[lane] = eventEnd;
    }
    
    // Track the maximum lane used across ALL events for chronological ordering
    maxLaneUsedSoFar = Math.max(maxLaneUsedSoFar, lane);
    
    return { ...event, lane };
  });
}

export function calculateEventPosition(lane: number): number {
  return lane * LANE_HEIGHT + LANE_OFFSET;
}

