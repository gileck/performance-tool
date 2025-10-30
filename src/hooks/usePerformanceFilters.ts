import { useState, useEffect } from 'react';
import type { TabType, ResourceViewTab, SortDirection } from '../types/performance';

interface FilterState {
  // Timeline filters - separate for events and milestones
  timelineEventFilters: Set<string>;
  milestoneFilters: Set<string>;
  selectedMarkNames: Set<string>;
  
  // Table filters
  tableFilters: Set<string>;
  visibleColumns: Set<string>;
  sortColumn: string;
  sortDirection: SortDirection;
  tableSearchTerm: string;
  
  // Resource filters
  resourceFilterFileTypes: Set<string>;
  resourceFilterServices: Set<string>;
  resourceFilterExtensions: Set<string>;
  resourceFilterSubtypes: Set<string>;
  resourceViewTab: ResourceViewTab;
  
  // Settings
  activeTab: TabType;
  showNegativeTimestamps: boolean;
  ssrTimeOffset: number;
  graphEndTime: number | null;
  minDurationMs: number;
  resourceDomainFilters: string[];
  zoomLevel: number;
  panOffset: number;
  
  // Loaded state
  settingsLoaded: boolean;
}

interface FilterActions {
  setTimelineEventFilters: (filters: Set<string>) => void;
  setMilestoneFilters: (filters: Set<string>) => void;
  setSelectedMarkNames: (names: Set<string>) => void;
  setTableFilters: (filters: Set<string>) => void;
  setVisibleColumns: (columns: Set<string>) => void;
  setSortColumn: (column: string) => void;
  setSortDirection: (direction: SortDirection) => void;
  setTableSearchTerm: (term: string) => void;
  setResourceFilterFileTypes: (types: Set<string>) => void;
  setResourceFilterServices: (services: Set<string>) => void;
  setResourceFilterExtensions: (extensions: Set<string>) => void;
  setResourceFilterSubtypes: (subtypes: Set<string>) => void;
  setResourceViewTab: (tab: ResourceViewTab) => void;
  setActiveTab: (tab: TabType) => void;
  setShowNegativeTimestamps: (show: boolean) => void;
  setSsrTimeOffset: (offset: number) => void;
  setGraphEndTime: (time: number | null) => void;
  setMinDurationMs: (duration: number) => void;
  setResourceDomainFilters: (filters: string[]) => void;
  setZoomLevel: (level: number) => void;
  setPanOffset: (offset: number) => void;
  // Helper functions
  toggleTimelineEventFilter: (type: string) => void;
  toggleMilestoneFilter: (type: string) => void;
  selectAllTimelineFilters: () => void;
  clearAllTimelineFilters: () => void;
  toggleMarkName: (markName: string) => void;
  selectAllMarkNames: () => void;
  clearAllMarkNames: () => void;
  toggleTableFilter: (type: string) => void;
  selectAllTableFilters: () => void;
  clearAllTableFilters: () => void;
  toggleColumn: (column: string) => void;
  handleZoom: (delta: number) => void;
  toggleResourceFileType: (fileType: string) => void;
  toggleResourceService: (service: string) => void;
  toggleResourceExtension: (extension: string) => void;
  toggleResourceSubtype: (subtype: string) => void;
  // Dropdown states
  setShowTimelineFilterDropdown: (show: boolean) => void;
  setShowTableFilterDropdown: (show: boolean) => void;
  setShowColumnSelector: (show: boolean) => void;
}

interface FilterDropdowns {
  showTimelineFilterDropdown: boolean;
  showTableFilterDropdown: boolean;
  showColumnSelector: boolean;
}

export function usePerformanceFilters(): [FilterState, FilterActions, FilterDropdowns] {
  // Initialize with all types enabled by default
  const [timelineEventFilters, setTimelineEventFilters] = useState<Set<string>>(new Set());
  const [milestoneFilters, setMilestoneFilters] = useState<Set<string>>(new Set());
  const [selectedMarkNames, setSelectedMarkNames] = useState<Set<string>>(new Set());
  const [tableFilters, setTableFilters] = useState<Set<string>>(new Set(['all']));
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['name', 'entryType', 'startTime', 'duration'])
  );
  const [sortColumn, setSortColumn] = useState<string>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [resourceFilterFileTypes, setResourceFilterFileTypes] = useState<Set<string>>(new Set(['all']));
  const [resourceFilterServices, setResourceFilterServices] = useState<Set<string>>(new Set(['all']));
  const [resourceFilterExtensions, setResourceFilterExtensions] = useState<Set<string>>(new Set(['all']));
  const [resourceFilterSubtypes, setResourceFilterSubtypes] = useState<Set<string>>(new Set(['all']));
  const [resourceViewTab, setResourceViewTab] = useState<ResourceViewTab>('services');
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [showNegativeTimestamps, setShowNegativeTimestamps] = useState(false);
  const [ssrTimeOffset, setSsrTimeOffset] = useState(0);
  const [graphEndTime, setGraphEndTime] = useState<number | null>(null);
  const [minDurationMs, setMinDurationMs] = useState(0);
  const [resourceDomainFilters, setResourceDomainFilters] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Dropdown states
  const [showTimelineFilterDropdown, setShowTimelineFilterDropdown] = useState(false);
  const [showTableFilterDropdown, setShowTableFilterDropdown] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('performance-tool:filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.timelineEventFilters)) {
          setTimelineEventFilters(new Set(parsed.timelineEventFilters));
        }
        if (Array.isArray(parsed.milestoneFilters)) {
          setMilestoneFilters(new Set(parsed.milestoneFilters));
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
        if (parsed.activeTab === 'timeline' || parsed.activeTab === 'table' || parsed.activeTab === 'resources') {
          setActiveTab(parsed.activeTab);
        }
        if (Array.isArray(parsed.resourceFilterFileTypes)) {
          setResourceFilterFileTypes(new Set(parsed.resourceFilterFileTypes));
        }
        if (Array.isArray(parsed.resourceFilterServices)) {
          setResourceFilterServices(new Set(parsed.resourceFilterServices));
        }
        if (Array.isArray(parsed.resourceFilterExtensions)) {
          setResourceFilterExtensions(new Set(parsed.resourceFilterExtensions));
        }
        if (Array.isArray(parsed.resourceFilterSubtypes)) {
          setResourceFilterSubtypes(new Set(parsed.resourceFilterSubtypes));
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
        if (Array.isArray(parsed.resourceDomainFilters)) {
          setResourceDomainFilters(parsed.resourceDomainFilters.filter((s: any) => typeof s === 'string'));
        }
        if (typeof parsed.zoomLevel === 'number') {
          setZoomLevel(Math.max(0.5, Math.min(10, parsed.zoomLevel)));
        }
        if (typeof parsed.panOffset === 'number') {
          setPanOffset(parsed.panOffset);
        }
        if (typeof parsed.tableSearchTerm === 'string') {
          setTableSearchTerm(parsed.tableSearchTerm);
        }
        if (typeof parsed.sortColumn === 'string') {
          setSortColumn(parsed.sortColumn);
        }
        if (parsed.sortDirection === 'asc' || parsed.sortDirection === 'desc') {
          setSortDirection(parsed.sortDirection);
        }
        if (parsed.resourceViewTab === 'all' || parsed.resourceViewTab === 'services' || parsed.resourceViewTab === 'pie') {
          setResourceViewTab(parsed.resourceViewTab);
        } else if (parsed.resourceViewTab === 'list') {
          // Migrate old 'list' to new 'services'
          setResourceViewTab('services');
        }
      }
      setSettingsLoaded(true);
    } catch (err) {
      console.error('Failed to load saved filters:', err);
      setSettingsLoaded(true);
    }
  }, []);

  // Save settings to localStorage on change
  useEffect(() => {
    if (!settingsLoaded) return;
    try {
      const payload = {
        timelineEventFilters: Array.from(timelineEventFilters),
        milestoneFilters: Array.from(milestoneFilters),
        selectedMarkNames: Array.from(selectedMarkNames),
        tableFilters: Array.from(tableFilters),
        visibleColumns: Array.from(visibleColumns),
        activeTab,
        showNegativeTimestamps,
        ssrTimeOffset,
        graphEndTime,
        minDurationMs,
        resourceDomainFilters,
        zoomLevel,
        panOffset,
        tableSearchTerm,
        resourceFilterFileTypes: Array.from(resourceFilterFileTypes),
        resourceFilterServices: Array.from(resourceFilterServices),
        resourceFilterExtensions: Array.from(resourceFilterExtensions),
        resourceFilterSubtypes: Array.from(resourceFilterSubtypes),
        sortColumn,
        sortDirection,
        resourceViewTab,
      };
      localStorage.setItem('performance-tool:filters', JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to save filters:', err);
    }
  }, [
    settingsLoaded,
    timelineEventFilters,
    milestoneFilters,
    selectedMarkNames,
    tableFilters,
    visibleColumns,
    activeTab,
    showNegativeTimestamps,
    ssrTimeOffset,
    graphEndTime,
    minDurationMs,
    resourceDomainFilters,
    zoomLevel,
    panOffset,
    tableSearchTerm,
    resourceFilterFileTypes,
    resourceFilterServices,
    resourceFilterExtensions,
    resourceFilterSubtypes,
    sortColumn,
    sortDirection,
    resourceViewTab,
  ]);

  const state: FilterState = {
    timelineEventFilters,
    milestoneFilters,
    selectedMarkNames,
    tableFilters,
    visibleColumns,
    sortColumn,
    sortDirection,
    tableSearchTerm,
    resourceFilterFileTypes,
    resourceFilterServices,
    resourceFilterExtensions,
    resourceFilterSubtypes,
    resourceViewTab,
    activeTab,
    showNegativeTimestamps,
    ssrTimeOffset,
    graphEndTime,
    minDurationMs,
    resourceDomainFilters,
    zoomLevel,
    panOffset,
    settingsLoaded,
  };

  // Toggle helpers - simple: checked = shown
  const toggleTimelineEventFilter = (type: string) => {
    setTimelineEventFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  const toggleMilestoneFilter = (type: string) => {
    setMilestoneFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      return newFilters;
    });
  };

  const selectAllTimelineFilters = () => {
    // This will be called with all types from the UI
    // For now, just a placeholder - UI will handle it
  };

  const clearAllTimelineFilters = () => {
    setTimelineEventFilters(new Set());
    setMilestoneFilters(new Set());
    setSelectedMarkNames(new Set());
  };

  const toggleMarkName = (markName: string) => {
    setSelectedMarkNames(prev => {
      const newMarks = new Set(prev);
      if (newMarks.has(markName)) {
        newMarks.delete(markName);
      } else {
        newMarks.add(markName);
      }
      return newMarks;
    });
  };

  const selectAllMarkNames = () => {
    // Placeholder - UI will handle setting all mark names
  };

  const clearAllMarkNames = () => {
    setSelectedMarkNames(new Set());
  };

  const toggleTableFilter = (type: string) => {
    const newFilters = new Set(tableFilters);
    if (type === 'all') {
      setTableFilters(new Set(['all']));
    } else {
      newFilters.delete('all');
      if (newFilters.has(type)) {
        newFilters.delete(type);
        if (newFilters.size === 0) newFilters.add('all');
      } else {
        newFilters.add(type);
      }
      setTableFilters(newFilters);
    }
  };

  const selectAllTableFilters = () => {
    setTableFilters(new Set(['all']));
  };

  const clearAllTableFilters = () => {
    setTableFilters(new Set(['all']));
  };

  const toggleColumn = (column: string) => {
    const newColumns = new Set(visibleColumns);
    if (newColumns.has(column)) {
      newColumns.delete(column);
    } else {
      newColumns.add(column);
    }
    setVisibleColumns(newColumns);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(10, prev + delta)));
  };

  const toggleResourceFileType = (fileType: string) => {
    const ns = new Set(resourceFilterFileTypes);
    ns.delete('all');
    if (ns.has(fileType)) ns.delete(fileType); else ns.add(fileType);
    if (ns.size === 0) ns.add('all');
    setResourceFilterFileTypes(ns);
  };

  const toggleResourceService = (service: string) => {
    const ns = new Set(resourceFilterServices);
    ns.delete('all');
    if (ns.has(service)) ns.delete(service); else ns.add(service);
    if (ns.size === 0) ns.add('all');
    setResourceFilterServices(ns);
  };

  const toggleResourceExtension = (extension: string) => {
    const ns = new Set(resourceFilterExtensions);
    ns.delete('all');
    if (ns.has(extension)) ns.delete(extension); else ns.add(extension);
    if (ns.size === 0) ns.add('all');
    setResourceFilterExtensions(ns);
  };

  const toggleResourceSubtype = (subtype: string) => {
    const ns = new Set(resourceFilterSubtypes);
    ns.delete('all');
    if (ns.has(subtype)) ns.delete(subtype); else ns.add(subtype);
    if (ns.size === 0) ns.add('all');
    setResourceFilterSubtypes(ns);
  };

  const actions: FilterActions = {
    setTimelineEventFilters,
    setMilestoneFilters,
    setSelectedMarkNames,
    setTableFilters,
    setVisibleColumns,
    setSortColumn,
    setSortDirection,
    setTableSearchTerm,
    setResourceFilterFileTypes,
    setResourceFilterServices,
    setResourceFilterExtensions,
    setResourceFilterSubtypes,
    setResourceViewTab,
    setActiveTab,
    setShowNegativeTimestamps,
    setSsrTimeOffset,
    setGraphEndTime,
    setMinDurationMs,
    setResourceDomainFilters,
    setZoomLevel,
    setPanOffset,
    // Helper functions
    toggleTimelineEventFilter,
    toggleMilestoneFilter,
    selectAllTimelineFilters,
    clearAllTimelineFilters,
    toggleMarkName,
    selectAllMarkNames,
    clearAllMarkNames,
    toggleTableFilter,
    selectAllTableFilters,
    clearAllTableFilters,
    toggleColumn,
    handleZoom,
    toggleResourceFileType,
    toggleResourceService,
    toggleResourceExtension,
    toggleResourceSubtype,
    // Dropdown states
    setShowTimelineFilterDropdown,
    setShowTableFilterDropdown,
    setShowColumnSelector,
  };

  const dropdowns = {
    showTimelineFilterDropdown,
    showTableFilterDropdown,
    showColumnSelector,
  };

  return [state, actions, dropdowns];
}

