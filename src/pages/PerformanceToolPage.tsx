import { useState, useMemo, useRef, useEffect } from 'react';

interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  [key: string]: any;
}

// default export moved to bottom to avoid early export during SSR compile

interface PerformanceData {
  type: string;
  data: PerformanceEntry[];
  siteModels?: {
    publicModel?: {
      externalBaseUrl?: string;
      siteDisplayName?: string;
    };
  };
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  'navigation': '#FF6B6B',
  'resource': '#4ECDC4',
  'mark': '#FFE66D',
  'measure': '#95E1D3',
  'paint': '#F38181',
  'longtask': '#AA96DA',
  'visibility-state': '#FCBAD3',
  'largest-contentful-paint': '#FF8C42',
  'first-input': '#6BCF7F',
  'layout-shift': '#FB6376',
  'SSR': '#A78BFA',
  'default': '#A0A0A0',
};

export function PerformanceToolPage({ data }: { data: PerformanceData }) {
  if (!data || !Array.isArray(data.data)) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#121212', color: '#ffffff', minHeight: '100vh' }}>
        <h1>Performance Tool</h1>
        <p>No data available yet. Waiting for message from opener...</p>
      </div>
    );
  }
  const [selectedEvent, setSelectedEvent] = useState<PerformanceEntry | null>(null);
  
  // Timeline-specific state
  const [timelineFilters, setTimelineFilters] = useState<Set<string>>(new Set(['all']));
  const [showTimelineFilterDropdown, setShowTimelineFilterDropdown] = useState(false);
  const [selectedMarkNames, setSelectedMarkNames] = useState<Set<string>>(new Set(['all']));
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [hoveredEvent, setHoveredEvent] = useState<PerformanceEntry | null>(null);
  const [timelineCursorPosition, setTimelineCursorPosition] = useState<{ x: number; time: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  
  // Table-specific state
  const [tableFilters, setTableFilters] = useState<Set<string>>(new Set(['all']));
  const [showTableFilterDropdown, setShowTableFilterDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'table'>('timeline');
  const [sortColumn, setSortColumn] = useState<string>('startTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(['name', 'entryType', 'startTime', 'duration']));
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  // Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [ssrTimeOffset, setSsrTimeOffset] = useState(0);
  const [graphEndTime, setGraphEndTime] = useState<number | null>(null);
  const [showNegativeTimestamps, setShowNegativeTimestamps] = useState(false);
  const [minDurationMs, setMinDurationMs] = useState(0);

  // Persist filter selections in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('performance-tool:filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.timelineFilters)) {
          setTimelineFilters(new Set(parsed.timelineFilters));
        }
        if (Array.isArray(parsed.selectedMarkNames)) {
          setSelectedMarkNames(new Set(parsed.selectedMarkNames));
        }
        if (Array.isArray(parsed.tableFilters)) {
          setTableFilters(new Set(parsed.tableFilters));
        }
        if (Array.isArray(parsed.visibleColumns)) {
          setVisibleColumns(new Set(parsed.visibleColumns));
        }
        if (parsed.activeTab === 'timeline' || parsed.activeTab === 'table') {
          setActiveTab(parsed.activeTab);
        }
        if (typeof parsed.showNegativeTimestamps === 'boolean') {
          setShowNegativeTimestamps(parsed.showNegativeTimestamps);
        }
        if (typeof parsed.ssrTimeOffset === 'number') {
          setSsrTimeOffset(parsed.ssrTimeOffset);
        }
        if (parsed.graphEndTime === null || typeof parsed.graphEndTime === 'number') {
          setGraphEndTime(parsed.graphEndTime);
        }
        if (typeof parsed.minDurationMs === 'number') {
          setMinDurationMs(parsed.minDurationMs);
        }
      }
    } catch (err) {
      console.error('Failed to load saved filters:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const payload = {
        timelineFilters: Array.from(timelineFilters),
        selectedMarkNames: Array.from(selectedMarkNames),
        tableFilters: Array.from(tableFilters),
        visibleColumns: Array.from(visibleColumns),
        activeTab,
        showNegativeTimestamps,
        ssrTimeOffset,
        graphEndTime,
        minDurationMs,
      };
      localStorage.setItem('performance-tool:filters', JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to save filters:', err);
    }
  }, [
    timelineFilters,
    selectedMarkNames,
    tableFilters,
    visibleColumns,
    activeTab,
    showNegativeTimestamps,
    ssrTimeOffset,
    graphEndTime,
    minDurationMs,
  ]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showTimelineFilterDropdown && !target.closest('.timeline-filter-dropdown-container')) {
        setShowTimelineFilterDropdown(false);
      }
      if (showTableFilterDropdown && !target.closest('.table-filter-dropdown-container')) {
        setShowTableFilterDropdown(false);
      }
      if (showColumnSelector && !target.closest('.column-selector-container')) {
        setShowColumnSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTimelineFilterDropdown, showTableFilterDropdown, showColumnSelector]);

  // Parse and combine started/ended or started/finished events
  const processedEvents = useMemo(() => {
    // Apply SSR offset to SSR events
    const events = data.data.map(event => {
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

    // Helper function to normalize event name (remove server suffix)
    const normalizeName = (name: string): { normalized: string; isServer: boolean } => {
      const lowerName = name.toLowerCase();
      if (lowerName.endsWith(' (server)')) {
        return {
          normalized: name.substring(0, name.length - 9), // Remove " (server)"
          isServer: true
        };
      }
      return { normalized: name, isServer: false };
    };

    // First pass: find all "started" events
    events.forEach((event, index) => {
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
    events.forEach((event, index) => {
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
    events.forEach((event, index) => {
      if (!usedIndices.has(index)) {
        combinedEvents.push(event);
      }
    });

    return combinedEvents;
  }, [data.data, ssrTimeOffset]);

  // Get all unique event types with counts
  const eventTypes = useMemo(() => {
    const typeCounts = new Map<string, number>();
    processedEvents.forEach(e => {
      typeCounts.set(e.entryType, (typeCounts.get(e.entryType) || 0) + 1);
    });
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [processedEvents]);

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

  // Count events with negative timestamps (hidden from timeline)
  const negativeTimestampCount = useMemo(() => {
    return processedEvents.filter(e => e.startTime < 0).length;
  }, [processedEvents]);

  // Timeline: Filter events - only include events with duration and positive timestamps (unless showNegativeTimestamps is enabled)
  const timelineFilteredEvents = useMemo(() => {
    let eventsWithDuration = processedEvents.filter(e => {
      if (e.duration <= 0) return false;
      if (minDurationMs > 0 && e.duration < minDurationMs) return false;
      if (!showNegativeTimestamps && e.startTime < 0) return false;
      return true;
    });
    
    // Apply end time filter if set
    if (graphEndTime !== null) {
      eventsWithDuration = eventsWithDuration.filter(e => e.startTime <= graphEndTime);
    }
    
    if (timelineFilters.has('all')) return eventsWithDuration;
    return eventsWithDuration.filter(e => timelineFilters.has(e.entryType));
  }, [processedEvents, timelineFilters, graphEndTime, showNegativeTimestamps, minDurationMs]);

  // Timeline: Get paint/milestone events separately (these are rendered as vertical lines)
  const timelineMilestoneEvents = useMemo(() => {
    let milestones = processedEvents.filter(e => {
      if (!showNegativeTimestamps && e.startTime < 0) return false; // Exclude negative timestamps (unless enabled)
      if (e.duration > 0) return false; // Only events with duration 0
      if (minDurationMs > 0 && e.duration < minDurationMs) return false; // duration is 0 for milestones, so this only hides if threshold is 0
      
      // Include paint and LCP events
      if (e.entryType === 'paint' || e.entryType === 'largest-contentful-paint') {
        return true;
      }
      
      // Include mark events that are NOT part of started/ended pairs
      if (e.entryType === 'mark') {
        const nameLower = e.name.toLowerCase();
        const isStartedEnded = nameLower.endsWith(' started') || 
                               nameLower.endsWith(' ended') || 
                               nameLower.endsWith(' finished');
        return !isStartedEnded;
      }
      
      return false;
    });
    
    // Apply end time filter if set
    if (graphEndTime !== null) {
      milestones = milestones.filter(e => e.startTime <= graphEndTime);
    }
    
    // Apply entry type filter
    let filtered = milestones;
    if (!timelineFilters.has('all')) {
      filtered = filtered.filter(e => timelineFilters.has(e.entryType));
    }
    
    // Apply mark name filter
    if (!selectedMarkNames.has('all')) {
      filtered = filtered.filter(e => {
        if (e.entryType !== 'mark') return true; // Non-mark events pass through
        return selectedMarkNames.has(e.name);
      });
    }
    
    return filtered;
  }, [processedEvents, timelineFilters, selectedMarkNames, graphEndTime, showNegativeTimestamps, minDurationMs]);

  // Table: Filter events (includes ALL events - no timestamp filtering)
  const tableFilteredEvents = useMemo(() => {
    let events = [...processedEvents]; // Include all events, even with negative timestamps
    
    // Apply duration and type filters
    if (minDurationMs > 0) {
      events = events.filter(e => e.duration >= minDurationMs);
    }
    if (!tableFilters.has('all')) {
      events = events.filter(e => tableFilters.has(e.entryType));
    }
    
    // Apply search filter
    if (tableSearchTerm) {
      const searchLower = tableSearchTerm.toLowerCase();
      events = events.filter(e => 
        Object.values(e).some(val => 
          String(val).toLowerCase().includes(searchLower)
        )
      );
    }
    
    return events;
  }, [processedEvents, tableFilters, tableSearchTerm, minDurationMs]);

  // Timeline: Handle filter toggle
  const toggleTimelineFilter = (type: string) => {
    const newFilters = new Set(timelineFilters);
    
    if (type === 'all') {
      setTimelineFilters(new Set(['all']));
    } else {
      newFilters.delete('all');
      if (newFilters.has(type)) {
        newFilters.delete(type);
        if (newFilters.size === 0) {
          newFilters.add('all');
        }
      } else {
        newFilters.add(type);
      }
      setTimelineFilters(newFilters);
    }
  };

  // Timeline: Select all filters
  const selectAllTimelineFilters = () => {
    const allTypes = new Set(eventTypes.map(et => et.type));
    setTimelineFilters(allTypes);
  };

  // Timeline: Clear all filters
  const clearAllTimelineFilters = () => {
    setTimelineFilters(new Set(['all']));
    setSelectedMarkNames(new Set(['all']));
  };

  // Timeline: Toggle mark name
  const toggleMarkName = (markName: string) => {
    const newMarks = new Set(selectedMarkNames);
    
    if (markName === 'all') {
      setSelectedMarkNames(new Set(['all']));
    } else {
      newMarks.delete('all');
      if (newMarks.has(markName)) {
        newMarks.delete(markName);
        if (newMarks.size === 0) {
          newMarks.add('all');
        }
      } else {
        newMarks.add(markName);
      }
      setSelectedMarkNames(newMarks);
    }
  };

  // Timeline: Select all mark names
  const selectAllMarkNames = () => {
    const allMarks = new Set(standaloneMarkNames);
    setSelectedMarkNames(allMarks);
  };

  // Timeline: Clear all mark names
  const clearAllMarkNames = () => {
    setSelectedMarkNames(new Set(['all']));
  };

  // Table: Handle filter toggle
  const toggleTableFilter = (type: string) => {
    const newFilters = new Set(tableFilters);
    
    if (type === 'all') {
      setTableFilters(new Set(['all']));
    } else {
      newFilters.delete('all');
      if (newFilters.has(type)) {
        newFilters.delete(type);
        if (newFilters.size === 0) {
          newFilters.add('all');
        }
      } else {
        newFilters.add(type);
      }
      setTableFilters(newFilters);
    }
  };

  // Table: Select all filters
  const selectAllTableFilters = () => {
    const allTypes = new Set(eventTypes.map(et => et.type));
    setTableFilters(allTypes);
  };

  // Table: Clear all filters
  const clearAllTableFilters = () => {
    setTableFilters(new Set(['all']));
  };

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    const allEvents = [...timelineFilteredEvents, ...timelineMilestoneEvents];
    if (allEvents.length === 0) return { min: 0, max: 1000 };
    
    const max = Math.max(
      ...allEvents.map(e => e.startTime + e.duration)
    );
    // When showing negative timestamps, extend the min to include them
    const minStart = showNegativeTimestamps
      ? Math.min(0, ...allEvents.map(e => e.startTime))
      : 0;
    return { min: minStart, max };
  }, [timelineFilteredEvents, timelineMilestoneEvents, showNegativeTimestamps]);

  // Convert time to pixels
  const timeToPixels = (time: number) => {
    const viewportWidth = 1000; // Base width
    const scaledWidth = viewportWidth * zoomLevel;
    return ((time - timelineBounds.min) / (timelineBounds.max - timelineBounds.min)) * scaledWidth + panOffset;
  };

  // Convert pixels to time
  const pixelsToTime = (pixels: number) => {
    const viewportWidth = 1000; // Base width
    const scaledWidth = viewportWidth * zoomLevel;
    const adjustedPixels = pixels - panOffset;
    return timelineBounds.min + (adjustedPixels / scaledWidth) * (timelineBounds.max - timelineBounds.min);
  };

  // Get color for event type
  const getEventColor = (entryType: string) => {
    return EVENT_TYPE_COLORS[entryType] || EVENT_TYPE_COLORS.default;
  };

  // Calculate event positions with smart stacking to avoid overlaps (for timeline)
  const eventsWithPositions = useMemo(() => {
    // Sort events by start time first, then by end time (descending) for same start times
    const sorted = [...timelineFilteredEvents].sort((a, b) => {
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
    
    return sorted.map((event, index) => {
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
  }, [timelineFilteredEvents]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(10, prev + delta)));
  };

  // Format time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format event name
  const formatEventName = (name: string) => {
    if (name.length > 80) return name.substring(0, 77) + '...';
    return name;
  };

  // Handle mouse move on timeline
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineContentRef.current) return;
    
    const rect = timelineContentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineContentRef.current.scrollLeft;
    const time = pixelsToTime(x);
    
    setTimelineCursorPosition({ x, time });
  };

  const handleTimelineMouseLeave = () => {
    setTimelineCursorPosition(null);
  };

  // Copy raw data to clipboard
  const copyRawData = async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      alert('Raw data copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy data:', err);
      alert('Failed to copy data to clipboard');
    }
  };

  // Print raw data to console
  const printToConsole = () => {
    console.log('Performance Data:', data);
    console.log('Processed Events:', processedEvents);
    console.log('Timeline Filtered Events:', timelineFilteredEvents);
    console.log('Timeline Milestone Events:', timelineMilestoneEvents);
    console.log('Table Filtered Events:', tableFilteredEvents);
    alert('Data printed to console. Open DevTools to view.');
  };

  // Get all available columns from the table data
  const allColumns = useMemo(() => {
    const columnSet = new Set<string>();
    tableFilteredEvents.forEach(event => {
      Object.keys(event).forEach(key => {
        if (!key.startsWith('_') && key !== 'lane') {
          columnSet.add(key);
        }
      });
    });
    return Array.from(columnSet).sort();
  }, [tableFilteredEvents]);

  // Sort table data
  const sortedTableData = useMemo(() => {
    return [...tableFilteredEvents].sort((a, b) => {
      const aVal = a[sortColumn as keyof PerformanceEntry];
      const bVal = b[sortColumn as keyof PerformanceEntry];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [tableFilteredEvents, sortColumn, sortDirection]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Toggle column visibility
  const toggleColumn = (column: string) => {
    const newColumns = new Set(visibleColumns);
    if (newColumns.has(column)) {
      newColumns.delete(column);
    } else {
      newColumns.add(column);
    }
    setVisibleColumns(newColumns);
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '2px solid #333',
        backgroundColor: '#252525',
      }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
            Performance Timeline Analyzer
          </h1>
          {data.siteModels?.publicModel?.externalBaseUrl && (
            <div style={{
              marginBottom: '15px',
              fontSize: '14px',
              color: '#aaa',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontWeight: '500' }}>Site:</span>
              <a 
                href={data.siteModels.publicModel.externalBaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#4ECDC4',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {data.siteModels.publicModel.externalBaseUrl}
              </a>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Timeline Filter (only shown when timeline tab is active) */}
          {activeTab === 'timeline' && (
            <div className="timeline-filter-dropdown-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Filter:</label>
              <button
                onClick={() => setShowTimelineFilterDropdown(!showTimelineFilterDropdown)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#333',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  minWidth: '200px',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {timelineFilters.has('all') 
                    ? `All (${processedEvents.length})`
                    : `${timelineFilters.size} selected`
                  }
                </span>
                <span style={{ marginLeft: '8px' }}>▼</span>
              </button>
              
              {showTimelineFilterDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '60px',
                  marginTop: '4px',
                  backgroundColor: '#333',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  padding: '8px',
                  zIndex: 1000,
                  minWidth: '250px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}>
                  {/* Action buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #444',
                  }}>
                    <button
                      onClick={selectAllTimelineFilters}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        backgroundColor: '#444',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllTimelineFilters}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #555',
                        backgroundColor: '#444',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  {/* All option */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '13px',
                      backgroundColor: timelineFilters.has('all') ? '#444' : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = timelineFilters.has('all') ? '#444' : 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={timelineFilters.has('all')}
                      onChange={() => toggleTimelineFilter('all')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>All ({processedEvents.length})</span>
                  </label>

                  <div style={{ height: '1px', backgroundColor: '#444', margin: '8px 0' }} />

                  {/* Individual event types */}
                  {eventTypes.map(({ type, count }) => (
                    <label
                      key={type}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '13px',
                        backgroundColor: timelineFilters.has(type) ? '#444' : 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = timelineFilters.has(type) ? '#444' : 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={timelineFilters.has(type)}
                        onChange={() => toggleTimelineFilter(type)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor: getEventColor(type),
                          border: '1px solid rgba(0,0,0,0.3)',
                        }}
                      />
                      <span>{type} ({count})</span>
                    </label>
                  ))}

                  {/* Mark Names Filter (shown when mark type is selected or visible) */}
                  {(timelineFilters.has('all') || timelineFilters.has('mark')) && standaloneMarkNames.length > 0 && (
                    <>
                      <div style={{ height: '1px', backgroundColor: '#444', margin: '8px 0' }} />
                      
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '6px 8px',
                        color: '#aaa',
                      }}>
                        Filter Marks:
                      </div>

                      {/* Mark actions */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '8px',
                        paddingBottom: '8px',
                        borderBottom: '1px solid #444',
                        paddingLeft: '8px',
                        paddingRight: '8px',
                      }}>
                        <button
                          onClick={selectAllMarkNames}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: '1px solid #555',
                            backgroundColor: '#444',
                            color: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          All Marks
                        </button>
                        <button
                          onClick={clearAllMarkNames}
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: '1px solid #555',
                            backgroundColor: '#444',
                            color: '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          Clear Marks
                        </button>
                      </div>

                      {/* All marks option */}
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: selectedMarkNames.has('all') ? '#444' : 'transparent',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedMarkNames.has('all') ? '#444' : 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMarkNames.has('all')}
                          onChange={() => toggleMarkName('all')}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>All Marks ({standaloneMarkNames.length})</span>
                      </label>

                      {/* Individual mark names */}
                      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {standaloneMarkNames.map(markName => (
                          <label
                            key={markName}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '11px',
                              backgroundColor: selectedMarkNames.has(markName) ? '#444' : 'transparent',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedMarkNames.has(markName) ? '#444' : 'transparent'}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMarkNames.has(markName)}
                              onChange={() => toggleMarkName(markName)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }} title={markName}>{markName}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Zoom Controls (only shown when timeline tab is active) */}
          {activeTab === 'timeline' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Zoom:</label>
            <button
              onClick={() => handleZoom(-0.2)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              −
            </button>
            <span style={{ fontSize: '14px', minWidth: '60px', textAlign: 'center' }}>
              {(zoomLevel * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => handleZoom(0.2)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              disabled={zoomLevel === 1}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: zoomLevel === 1 ? '#2a2a2a' : '#333',
                color: zoomLevel === 1 ? '#666' : '#fff',
                cursor: zoomLevel === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
              }}
              title="Reset zoom to 100%"
            >
              Reset
            </button>
          </div>
          )}

          {/* Data Export Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <button
              onClick={copyRawData}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Copy all raw data to clipboard"
            >
              📋 Copy Data
            </button>
            <button
              onClick={printToConsole}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Print data to browser console"
            >
              🖨️ Console
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#333',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Open settings"
            >
              ⚙️ Settings
            </button>
          </div>

          {/* Stats */}
          {activeTab === 'timeline' ? (
            <div style={{ fontSize: '14px', color: '#aaa', marginLeft: '15px' }}>
              Total Duration: {formatTime(timelineBounds.max)} | Events: {timelineFilteredEvents.length} | 
              Milestones: {timelineMilestoneEvents.length} | 
              Combined: {processedEvents.filter((e: any) => e._isCombined).length}
            </div>
          ) : (
            <div style={{ fontSize: '14px', color: '#aaa', marginLeft: '15px' }}>
              Table Events: {tableFilteredEvents.length} | Total: {processedEvents.length}
            </div>
          )}
        </div>

        {/* Legend (Timeline only) */}
        {activeTab === 'timeline' && (
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #333',
          }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: '#888' }}>Legend:</span>
            {eventTypes.map(({ type, count }) => {
                const filteredCount = timelineFilteredEvents.filter(e => e.entryType === type).length;
                const milestoneCount = timelineMilestoneEvents.filter(e => e.entryType === type).length;
                const totalCount = filteredCount + milestoneCount;
                const isMilestone = type === 'paint' || type === 'largest-contentful-paint';
                
                if (totalCount === 0) return null;
                return (
                  <div
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                    }}
                  >
                    {isMilestone ? (
                      <div
                        style={{
                          width: '2px',
                          height: '16px',
                          backgroundColor: getEventColor(type),
                          border: '1px solid rgba(0,0,0,0.3)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '16px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor: getEventColor(type),
                          border: '1px solid rgba(0,0,0,0.3)',
                        }}
                      />
                    )}
                    <span style={{ color: '#aaa' }}>
                      {type} ({totalCount}){isMilestone && ' ⎸'}
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0',
          borderTop: '1px solid #333',
          backgroundColor: '#202020',
        }}>
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: activeTab === 'timeline' ? '#252525' : '#202020',
              color: activeTab === 'timeline' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'timeline' ? 'bold' : 'normal',
              borderBottom: activeTab === 'timeline' ? '2px solid #4ECDC4' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveTab('table')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: activeTab === 'table' ? '#252525' : '#202020',
              color: activeTab === 'table' ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'table' ? 'bold' : 'normal',
              borderBottom: activeTab === 'table' ? '2px solid #4ECDC4' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Events Table
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Timeline View */}
        {activeTab === 'timeline' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Compact inline banner for hidden negative events */}
          {negativeTimestampCount > 0 && !showNegativeTimestamps && (
            <div style={{
              padding: '6px 10px',
              backgroundColor: '#3a2a1a',
              borderLeft: '4px solid #ff9800',
              fontSize: '12px',
              color: '#ffcc80'
            }}>
              ⚠️ {negativeTimestampCount} event{negativeTimestampCount !== 1 ? 's are' : ' is'} hidden due to negative startTime. Use Settings to show or offset SSR timestamps.
            </div>
          )}
          {/* Settings Modal */}
          {showSettingsModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }} onClick={() => setShowSettingsModal(false)}>
              <div className="settings-modal" style={{
                width: '520px', backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '16px 18px'
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#fff' }}>Settings</h3>
                  <button onClick={() => setShowSettingsModal(false)} style={{
                    background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '18px'
                  }}>✕</button>
                </div>

                {/* SSR Offset */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#ccc', marginBottom: '6px' }}>SSR startTime adjustment (ms)</label>
                  <input type="number" value={ssrTimeOffset} onChange={(e) => setSsrTimeOffset(Number(e.target.value) || 0)}
                    placeholder="e.g. 1000" style={{
                      width: '100%', padding: '8px 10px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px'
                    }} />
                  <div style={{ color: '#888', fontSize: '12px', marginTop: '6px' }}>
                    Adds this value to startTime of all SSR events. Use to fix negative SSR timestamps.
                  </div>
                </div>

                {/* Minimum Duration */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#ccc', marginBottom: '6px' }}>Minimum event duration (ms)</label>
                  <input
                    type="number"
                    value={minDurationMs}
                    onChange={(e) => setMinDurationMs(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="e.g. 5"
                    style={{
                      width: '100%', padding: '8px 10px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px'
                    }}
                  />
                  <div style={{ color: '#888', fontSize: '12px', marginTop: '6px' }}>
                    Hides events whose duration is less than this value.
                  </div>
                </div>

                {/* Graph End Time */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', color: '#ccc', marginBottom: '6px' }}>Graph end time (ms, optional)</label>
                  <input type="number" value={graphEndTime ?? ''} onChange={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value);
                    setGraphEndTime(v as any);
                  }} placeholder="e.g. 4000" style={{
                      width: '100%', padding: '8px 10px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px'
                    }} />
                  <div style={{ color: '#888', fontSize: '12px', marginTop: '6px' }}>
                    Show only events whose startTime is less than or equal to this value.
                  </div>
                </div>

                {/* Toggle negative timestamps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <input id="toggle-negative" type="checkbox" checked={showNegativeTimestamps}
                    onChange={(e) => setShowNegativeTimestamps(e.target.checked)} />
                  <label htmlFor="toggle-negative" style={{ color: '#ccc' }}>Show events with negative startTime</label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setShowSettingsModal(false)} style={{
                    padding: '6px 12px', borderRadius: '6px', border: '1px solid #444', backgroundColor: '#333', color: '#fff', cursor: 'pointer'
                  }}>Close</button>
                </div>
              </div>
            </div>
          )}
          {/* Time Scale */}
          <div style={{
            height: '40px',
            borderBottom: '1px solid #333',
            position: 'relative',
            backgroundColor: '#202020',
            overflow: 'hidden',
          }}>
            {[0, 0.25, 0.5, 0.75, 1].map(fraction => {
              const time = timelineBounds.min + (timelineBounds.max - timelineBounds.min) * fraction;
              const left = timeToPixels(time);
              return (
                <div
                  key={fraction}
                  style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: 0,
                    height: '100%',
                    borderLeft: '1px solid #444',
                    paddingLeft: '5px',
                    paddingTop: '10px',
                    fontSize: '12px',
                    color: '#888',
                  }}
                >
                  {formatTime(time)}
                </div>
              );
            })}
          </div>

          {/* Timeline Content */}
          <div
            ref={timelineRef}
            style={{
              flex: 1,
              overflow: 'auto',
              position: 'relative',
              backgroundColor: '#1a1a1a',
              padding: '20px',
            }}
          >
            {/* Single unified timeline */}
            <div 
              ref={timelineContentRef}
              onMouseMove={handleTimelineMouseMove}
              onMouseLeave={handleTimelineMouseLeave}
              style={{
                position: 'relative',
                minHeight: '200px',
                width: '100%',
              }}
            >
              {/* Vertical cursor line */}
              {timelineCursorPosition && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${timelineCursorPosition.x}px`,
                      top: 0,
                      bottom: 0,
                      width: '1px',
                      backgroundColor: '#ffffff',
                      opacity: 0.5,
                      pointerEvents: 'none',
                      zIndex: 50,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `${timelineCursorPosition.x + 5}px`,
                      top: '10px',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid #ffffff',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      pointerEvents: 'none',
                      zIndex: 51,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTime(timelineCursorPosition.time)}
                  </div>
                </>
              )}

              {/* Regular events with duration */}
              {eventsWithPositions.map((event, index) => {
                const left = timeToPixels(event.startTime);
                const width = Math.max(2, timeToPixels(event.startTime + event.duration) - left);
                const top = event.lane * 35 + 10;

                // Calculate how much text we can show based on width
                const getDisplayText = () => {
                  if (width < 30) return '';
                  
                  const maxChars = Math.floor(width / 6); // Approximate chars that fit
                  if (maxChars < 5) return '';
                  
                  const name = event.name.length > maxChars 
                    ? event.name.substring(0, maxChars - 3) + '...'
                    : event.name;
                  return name;
                };

                return (
                  <div
                    key={`event-${index}`}
                    onMouseEnter={() => setHoveredEvent(event)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => setSelectedEvent(event)}
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: '28px',
                      backgroundColor: getEventColor(event.entryType),
                      border: selectedEvent === event ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '6px',
                      paddingRight: '6px',
                      fontSize: '11px',
                      color: '#000',
                      fontWeight: '500',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      boxShadow: hoveredEvent === event ? '0 4px 12px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.2)',
                      transform: hoveredEvent === event ? 'scale(1.05)' : 'scale(1)',
                      zIndex: hoveredEvent === event ? 100 : 1,
                    }}
                    title={event.name}
                  >
                    {getDisplayText()}
                  </div>
                );
              })}

              {/* Milestone events (paint, LCP, etc.) as vertical lines */}
              {timelineMilestoneEvents.map((event, index) => {
                const left = timeToPixels(event.startTime);
                const color = getEventColor(event.entryType);
                
                return (
                  <div
                    key={`milestone-${index}`}
                    style={{
                      position: 'absolute',
                      left: `${left}px`,
                      top: 0,
                      bottom: 0,
                      pointerEvents: 'none',
                    }}
                  >
                    {/* Label above the line */}
                    <div
                      onMouseEnter={() => setHoveredEvent(event)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: '-25px',
                        transform: 'translateX(-50%)',
                        padding: '3px 6px',
                        backgroundColor: color,
                        color: '#000',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap',
                        border: selectedEvent === event ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        zIndex: hoveredEvent === event ? 100 : 10,
                      }}
                      title={event.name}
                    >
                      {event.name}
                    </div>
                    {/* Vertical line */}
                    <div
                      onMouseEnter={() => setHoveredEvent(event)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: 0,
                        width: '0',
                        height: '100%',
                        borderLeft: '2px dotted #FF4444',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        zIndex: hoveredEvent === event ? 100 : 10,
                        boxShadow: hoveredEvent === event ? '0 0 8px #FF4444' : 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        )}

        {/* Table View */}
        {activeTab === 'table' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
            {/* Table Controls */}
            <div style={{
              padding: '15px 20px',
              backgroundColor: '#252525',
              borderBottom: '1px solid #333',
              display: 'flex',
              gap: '15px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              {/* Search */}
              <input
                type="text"
                value={tableSearchTerm}
                onChange={(e) => setTableSearchTerm(e.target.value)}
                placeholder="Search events..."
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#333',
                  color: '#fff',
                  fontSize: '14px',
                  minWidth: '200px',
                }}
              />

              {/* Table Filter */}
              <div className="table-filter-dropdown-container" style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTableFilterDropdown(!showTableFilterDropdown)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    backgroundColor: '#333',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Filter: {tableFilters.has('all') ? 'All' : `${tableFilters.size} types`}
                </button>
                
                {showTableFilterDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    backgroundColor: '#333',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '8px',
                    zIndex: 1000,
                    minWidth: '200px',
                    maxHeight: '400px',
                    overflow: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}>
                    {/* Action buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #444',
                    }}>
                      <button
                        onClick={selectAllTableFilters}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #555',
                          backgroundColor: '#444',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearAllTableFilters}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #555',
                          backgroundColor: '#444',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    {/* All option */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '13px',
                        backgroundColor: tableFilters.has('all') ? '#444' : 'transparent',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = tableFilters.has('all') ? '#444' : 'transparent'}
                    >
                      <input
                        type="checkbox"
                        checked={tableFilters.has('all')}
                        onChange={() => toggleTableFilter('all')}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>All ({processedEvents.length})</span>
                    </label>

                    <div style={{ height: '1px', backgroundColor: '#444', margin: '8px 0' }} />

                    {/* Individual event types */}
                    {eventTypes.map(({ type, count }) => (
                      <label
                        key={type}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '13px',
                          backgroundColor: tableFilters.has(type) ? '#444' : 'transparent',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = tableFilters.has(type) ? '#444' : 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={tableFilters.has(type)}
                          onChange={() => toggleTableFilter(type)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{type} ({count})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ fontSize: '14px', fontWeight: '500', color: '#888' }}>
                Showing {sortedTableData.length} events
              </div>
              
              {/* Column Selector */}
              <div className="column-selector-container" style={{ position: 'relative', marginLeft: 'auto' }}>
                <button
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    backgroundColor: '#333',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Columns ({visibleColumns.size})
                </button>
                
                {showColumnSelector && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#333',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '8px',
                    zIndex: 1000,
                    minWidth: '200px',
                    maxHeight: '400px',
                    overflow: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}>
                    {allColumns.map(column => (
                      <label
                        key={column}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontSize: '13px',
                          backgroundColor: visibleColumns.has(column) ? '#444' : 'transparent',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = visibleColumns.has(column) ? '#444' : 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(column)}
                          onChange={() => toggleColumn(column)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{column}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#252525',
                  zIndex: 10,
                }}>
                  <tr>
                    {Array.from(visibleColumns).map(column => (
                      <th
                        key={column}
                        onClick={() => handleSort(column)}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontWeight: 'bold',
                          color: '#fff',
                          borderBottom: '2px solid #333',
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {column}
                          {sortColumn === column && (
                            <span style={{ fontSize: '10px' }}>
                              {sortDirection === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTableData.map((event, index) => (
                    <tr
                      key={index}
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        backgroundColor: selectedEvent === event ? '#2a3a3a' : index % 2 === 0 ? '#1a1a1a' : '#1e1e1e',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedEvent === event ? '#2a3a3a' : index % 2 === 0 ? '#1a1a1a' : '#1e1e1e'}
                    >
                      {Array.from(visibleColumns).map(column => {
                        const value = event[column as keyof PerformanceEntry];
                        let displayValue = '';
                        
                        if (value === undefined || value === null) {
                          displayValue = '-';
                        } else if (column === 'startTime' || column === 'duration') {
                          displayValue = formatTime(value as number);
                        } else if (typeof value === 'object') {
                          displayValue = JSON.stringify(value);
                        } else {
                          displayValue = String(value);
                        }
                        
                        return (
                          <td
                            key={column}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid #2a2a2a',
                              color: '#ccc',
                              maxWidth: '400px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={displayValue}
                          >
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Details Panel */}
        <div style={{
          width: '400px',
          borderLeft: '2px solid #333',
          backgroundColor: '#252525',
          overflow: 'auto',
          padding: '20px',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Event Details
            </h2>
            {selectedEvent && (
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#333',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: '1',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close details"
              >
                ×
              </button>
            )}
          </div>

          {selectedEvent ? (
            <div>
              <div style={{
                padding: '15px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                marginBottom: '15px',
                border: `2px solid ${getEventColor(selectedEvent.entryType)}`,
              }}>
                {(selectedEvent as any)._isCombined && (
                  <div style={{
                    padding: '8px 10px',
                    backgroundColor: '#2a4a2a',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    fontSize: '11px',
                    color: '#9FE6A0',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{ fontSize: '14px' }}>✓</span>
                    Combined from started/ended events
                  </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                    Type
                  </span>
                  <div style={{
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: getEventColor(selectedEvent.entryType),
                      }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                      {selectedEvent.entryType}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                    Name
                  </span>
                  <div style={{
                    marginTop: '4px',
                    fontSize: '13px',
                    wordBreak: 'break-all',
                    lineHeight: '1.5',
                  }}>
                    {selectedEvent.name}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                      Start Time
                    </span>
                    <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 'bold', color: '#4ECDC4' }}>
                      {formatTime(selectedEvent.startTime)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                      Duration
                    </span>
                    <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 'bold', color: '#FFE66D' }}>
                      {formatTime(selectedEvent.duration)}
                    </div>
                  </div>
                </div>

                {(selectedEvent as any)._isCombined && (selectedEvent as any)._endEvent && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #333',
                  }}>
                    <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                      End Time
                    </span>
                    <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 'bold', color: '#F38181' }}>
                      {formatTime((selectedEvent as any)._endEvent.startTime)}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Properties */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#aaa' }}>
                  Additional Properties
                </h3>
                <div style={{ fontSize: '12px' }}>
                  {Object.entries(selectedEvent)
                    .filter(([key]) => !['name', 'entryType', 'startTime', 'duration', '_isCombined', '_endEvent', '_originalIndex', '_isServer', 'lane'].includes(key))
                    .map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          padding: '8px',
                          backgroundColor: '#1a1a1a',
                          borderRadius: '4px',
                          marginBottom: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <span style={{ color: '#888', fontWeight: '500' }}>{key}:</span>
                        <span style={{
                          color: '#fff',
                          textAlign: 'right',
                          wordBreak: 'break-all',
                          maxWidth: '60%',
                        }}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
              <p>Click on an event in the timeline to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredEvent && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          border: `2px solid ${getEventColor(hoveredEvent.entryType)}`,
          borderRadius: '8px',
          maxWidth: '500px',
          fontSize: '13px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: getEventColor(hoveredEvent.entryType) }}>
            {hoveredEvent.entryType}
            {(hoveredEvent as any)._isCombined && (
              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9FE6A0' }}>
                ✓ Combined
              </span>
            )}
          </div>
          <div style={{ marginBottom: '6px', wordBreak: 'break-all' }}>
            {hoveredEvent.name}
          </div>
          <div style={{ color: '#aaa', fontSize: '12px' }}>
            Start: {formatTime(hoveredEvent.startTime)} | Duration: {formatTime(hoveredEvent.duration)}
          </div>
        </div>
      )}
    </div>
  );
}

export default PerformanceToolPage;

export async function getStaticProps() {
  const data = { type: 'placeholder', data: [] } as any;
  return {
    props: { data },
  };
}