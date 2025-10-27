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

  // Third pass: add all non-combined events
  eventsWithOffset.forEach((event, index) => {
    if (!usedIndices.has(index)) {
      combinedEvents.push(event);
    }
  });

  return combinedEvents;
}

