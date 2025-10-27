import { useMemo } from 'react';
import type { PerformanceEntry, PerformanceData } from '../types/performance';
import { processEvents } from '../utils/eventProcessing';
import { getEffectiveType, getResourceExtras } from '../utils/resourceUtils';

interface EventProcessingResult {
  processedEvents: PerformanceEntry[];
  eventTypes: Array<{ type: string; count: number }>;
  standaloneMarkNames: string[];
  negativeTimestampCount: number;
  timelineFilteredEvents: PerformanceEntry[];
  timelineMilestoneEvents: PerformanceEntry[];
  tableFilteredEvents: PerformanceEntry[];
  resourceEvents: PerformanceEntry[];
}

interface ProcessingOptions {
  data: PerformanceData;
  ssrTimeOffset: number;
  timelineFilters: Set<string>;
  selectedMarkNames: Set<string>;
  tableFilters: Set<string>;
  tableSearchTerm: string;
  showNegativeTimestamps: boolean;
  graphEndTime: number | null;
  minDurationMs: number;
  resourceDomainFilters: string[];
}

export function useEventProcessing(options: ProcessingOptions): EventProcessingResult {
  const {
    data,
    ssrTimeOffset,
    timelineFilters,
    selectedMarkNames,
    tableFilters,
    tableSearchTerm,
    showNegativeTimestamps,
    graphEndTime,
    minDurationMs,
    resourceDomainFilters,
  } = options;

  // Process events (combine started/ended events)
  const processedEvents = useMemo(() => {
    return processEvents(data.data, ssrTimeOffset);
  }, [data.data, ssrTimeOffset]);

  // Get all unique event types with counts
  const eventTypes = useMemo(() => {
    const typeCounts = new Map<string, number>();
    processedEvents.forEach(e => {
      const t = getEffectiveType(e, data.siteModels);
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    });
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [processedEvents, data.siteModels]);

  // Get all unique standalone mark names
  const standaloneMarkNames = useMemo(() => {
    const markNames = new Set<string>();
    processedEvents.forEach(e => {
      if (e.entryType === 'mark' && e.duration === 0 && e.startTime >= 0) {
        const nameLower = e.name.toLowerCase();
        const isStartedEnded = nameLower.endsWith(' started') || 
                               nameLower.endsWith(' ended') || 
                               nameLower.endsWith(' finished');
        if (!isStartedEnded) {
          markNames.add(e.name);
        }
      }
    });
    return Array.from(markNames).sort();
  }, [processedEvents]);

  // Count events with negative timestamps
  const negativeTimestampCount = useMemo(() => {
    return processedEvents.filter(e => e.startTime < 0).length;
  }, [processedEvents]);

  // Timeline: Filter events - only include events with duration and positive timestamps
  const timelineFilteredEvents = useMemo(() => {
    let eventsWithDuration = processedEvents.filter(e => {
      if (e.duration <= 0) return false;
      if (minDurationMs > 0 && e.duration < minDurationMs) return false;
      if (!showNegativeTimestamps && e.startTime < 0) return false;
      if (resourceDomainFilters.length > 0 && e.entryType === 'resource') {
        const nameLower = String(e.name || '').toLowerCase();
        const matchesAny = resourceDomainFilters.some(f => nameLower.includes(f.toLowerCase()));
        if (matchesAny) return false; // blacklist: exclude matching resources
      }
      return true;
    });
    
    // Apply end time filter if set
    if (graphEndTime !== null) {
      eventsWithDuration = eventsWithDuration.filter(e => e.startTime <= graphEndTime);
    }
    
    if (timelineFilters.has('all')) return eventsWithDuration;
    return eventsWithDuration.filter(e => timelineFilters.has(getEffectiveType(e, data.siteModels)));
  }, [processedEvents, timelineFilters, graphEndTime, showNegativeTimestamps, minDurationMs, resourceDomainFilters, data.siteModels]);

  // Timeline: Get paint/milestone events separately
  const timelineMilestoneEvents = useMemo(() => {
    let milestones = processedEvents.filter(e => {
      if (!showNegativeTimestamps && e.startTime < 0) return false;
      if (e.duration > 0) return false;
      
      if (e.entryType === 'paint' || e.entryType === 'largest-contentful-paint') {
        return true;
      }
      
      if (e.entryType === 'mark') {
        const nameLower = e.name.toLowerCase();
        const isStartedEnded = nameLower.endsWith(' started') || 
                               nameLower.endsWith(' ended') || 
                               nameLower.endsWith(' finished');
        if (isStartedEnded) return false;
        return true;
      }
      
      return false;
    });
    
    if (graphEndTime !== null) {
      milestones = milestones.filter(e => e.startTime <= graphEndTime);
    }
    
    let filtered = milestones;
    if (!timelineFilters.has('all')) {
      filtered = filtered.filter(e => timelineFilters.has(getEffectiveType(e, data.siteModels)));
    }
    
    if (!selectedMarkNames.has('all')) {
      filtered = filtered.filter(e => {
        if (e.entryType !== 'mark') return true;
        return selectedMarkNames.has(e.name);
      });
    }
    
    return filtered;
  }, [processedEvents, timelineFilters, selectedMarkNames, graphEndTime, showNegativeTimestamps, data.siteModels]);

  // Table: Filter events (includes ALL events)
  const tableFilteredEvents = useMemo(() => {
    let events = [...processedEvents];
    
    // Apply resource domain exclusions (global filter)
    if (resourceDomainFilters.length > 0) {
      events = events.filter(e => {
        if (e.entryType !== 'resource') return true;
        const nameLower = String(e.name || '').toLowerCase();
        const matchesAny = resourceDomainFilters.some(f => nameLower.includes(f.toLowerCase()));
        return !matchesAny;
      });
    }

    // Note: minDurationMs is NOT applied to table - only to timeline
    
    if (!tableFilters.has('all')) {
      events = events.filter(e => tableFilters.has(getEffectiveType(e, data.siteModels)));
    }
    
    if (tableSearchTerm) {
      const searchLower = tableSearchTerm.toLowerCase();
      events = events.filter(e => 
        Object.values(e).some(val => 
          String(val).toLowerCase().includes(searchLower)
        )
      );
    }
    
    return events;
  }, [processedEvents, tableFilters, tableSearchTerm, resourceDomainFilters, data.siteModels]);

  // Resource-only list - apply global settings filters
  const resourceEvents = useMemo(() => {
    let events = processedEvents.filter(e => e.entryType === 'resource');
    
    // Apply resource domain exclusions (global filter)
    if (resourceDomainFilters.length > 0) {
      events = events.filter(e => {
        const nameLower = String(e.name || '').toLowerCase();
        const matchesAny = resourceDomainFilters.some(f => nameLower.includes(f.toLowerCase()));
        return !matchesAny; // exclude if matches any filter
      });
    }
    
    // Note: minDurationMs is NOT applied to resources - only to timeline
    
    return events;
  }, [processedEvents, resourceDomainFilters]);

  return {
    processedEvents,
    eventTypes,
    standaloneMarkNames,
    negativeTimestampCount,
    timelineFilteredEvents,
    timelineMilestoneEvents,
    tableFilteredEvents,
    resourceEvents,
  };
}

