import type { PerformanceEntry } from '../types/performance';

interface NormalizedName {
  normalized: string;
  isServer: boolean;
}

export function normalizeName(name: string): NormalizedName {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith(' (server)')) {
    return {
      normalized: name.substring(0, name.length - 9), // Remove " (server)"
      isServer: true
    };
  }
  return { normalized: name, isServer: false };
}

export function processEvents(events: PerformanceEntry[], ssrTimeOffset: number): PerformanceEntry[] {
  // Apply SSR offset to SSR events
  const eventsWithOffset = events.map(event => {
    if (event.entryType === 'SSR' && ssrTimeOffset !== 0) {
      return {
        ...event,
        startTime: event.startTime + ssrTimeOffset
      };
    }
    return event;
  });

  const startedEvents = new Map<string, PerformanceEntry>();
  const combinedEvents: PerformanceEntry[] = [];
  const usedIndices = new Set<number>();

  // First pass: find all "started" events
  eventsWithOffset.forEach((event, index) => {
    const { normalized, isServer } = normalizeName(event.name);
    const lowerName = normalized.toLowerCase();
    
    if (lowerName.endsWith(' started')) {
      const baseName = normalized.substring(0, normalized.length - 8); // Remove " started"
      const key = `${baseName.toLowerCase()}${isServer ? '_server' : ''}`;
      startedEvents.set(key, { ...event, _originalIndex: index, _isServer: isServer } as any);
      usedIndices.add(index);
    }
  });

  // Second pass: find matching "ended" or "finished" events
  eventsWithOffset.forEach((event, index) => {
    const { normalized, isServer } = normalizeName(event.name);
    const lowerName = normalized.toLowerCase();
    
    if (lowerName.endsWith(' ended')) {
      const baseName = normalized.substring(0, normalized.length - 6); // Remove " ended"
      const key = `${baseName.toLowerCase()}${isServer ? '_server' : ''}`;
      const startedEvent = startedEvents.get(key);
      if (startedEvent) {
        combinedEvents.push({
          ...startedEvent,
          name: baseName + (isServer ? ' (server)' : ''),
          duration: event.startTime - startedEvent.startTime,
          entryType: startedEvent.entryType,
          _isCombined: true,
          _endEvent: event,
        } as any);
        usedIndices.add(index);
        startedEvents.delete(key);
      }
    } else if (lowerName.endsWith(' finished')) {
      const baseName = normalized.substring(0, normalized.length - 9); // Remove " finished"
      const key = `${baseName.toLowerCase()}${isServer ? '_server' : ''}`;
      const startedEvent = startedEvents.get(key);
      if (startedEvent) {
        combinedEvents.push({
          ...startedEvent,
          name: baseName + (isServer ? ' (server)' : ''),
          duration: event.startTime - startedEvent.startTime,
          entryType: startedEvent.entryType,
          _isCombined: true,
          _endEvent: event,
        } as any);
        usedIndices.add(index);
        startedEvents.delete(key);
      }
    }
  });

  // Third pass: add all non-combined events and break down navigation
  eventsWithOffset.forEach((event, index) => {
    if (!usedIndices.has(index)) {
      // Break down navigation entries into phases
      if (event.entryType === 'navigation') {
        combinedEvents.push(event); // Keep the original navigation event
        
        // Add navigation timing phases as synthetic events
        const phases = extractNavigationPhases(event);
        combinedEvents.push(...phases);
      } else {
        combinedEvents.push(event);
      }
    }
  });

  return combinedEvents;
}

// Extract significant navigation timing phases
function extractNavigationPhases(navEvent: PerformanceEntry): PerformanceEntry[] {
  const phases: PerformanceEntry[] = [];
  const minDuration = 1; // Minimum 1ms to be considered significant
  
  // Helper to add a phase if duration is significant
  const addPhase = (name: string, start: number, end: number, color?: string) => {
    const duration = end - start;
    if (duration >= minDuration) {
      phases.push({
        name,
        entryType: 'navigation-phase',
        startTime: start,
        duration,
        ...(color && { _color: color }),
        _navigationPhase: true,
      } as any);
    }
  };
  
  const nav = navEvent as any;
  
  // 1. DNS Lookup
  if (nav.domainLookupStart && nav.domainLookupEnd) {
    addPhase('DNS Lookup', nav.domainLookupStart, nav.domainLookupEnd);
  }
  
  // 2. TCP Connection
  if (nav.connectStart && nav.connectEnd) {
    addPhase('TCP Connection', nav.connectStart, nav.connectEnd);
  }
  
  // 3. Request (waiting for server)
  if (nav.requestStart && nav.responseStart) {
    addPhase('Request (TTFB)', nav.requestStart, nav.responseStart);
  }
  
  // 4. Response (downloading)
  if (nav.responseStart && nav.responseEnd) {
    addPhase('Response Download', nav.responseStart, nav.responseEnd);
  }
  
  // 5. DOM Interactive (parsing)
  if (nav.responseEnd && nav.domInteractive) {
    addPhase('DOM Parsing', nav.responseEnd, nav.domInteractive);
  }
  
  // 6. DOM Content Loaded
  if (nav.domContentLoadedEventStart && nav.domContentLoadedEventEnd) {
    addPhase('DOMContentLoaded', nav.domContentLoadedEventStart, nav.domContentLoadedEventEnd);
  }
  
  // 7. DOM Complete (additional resources)
  if (nav.domContentLoadedEventEnd && nav.domComplete) {
    addPhase('Loading Resources', nav.domContentLoadedEventEnd, nav.domComplete);
  }
  
  // 8. Load Event
  if (nav.loadEventStart && nav.loadEventEnd) {
    addPhase('Load Event', nav.loadEventStart, nav.loadEventEnd);
  }
  
  return phases;
}

