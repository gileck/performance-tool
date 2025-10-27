import { useState, useEffect } from 'react';
import type { TabType, ResourceViewTab, SortDirection } from '../types/performance';

interface FilterState {
  // Timeline filters
  timelineFilters: Set<string>;
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
  setTimelineFilters: (filters: Set<string>) => void;
  setSelectedMarkNames: (names: Set<string>) => void;
  setTableFilters: (filters: Set<string>) => void;
  setVisibleColumns: (columns: Set<string>) => void;
  setSortColumn: (column: string) => void;
  setSortDirection: (direction: SortDirection) => void;
  setTableSearchTerm: (term: string) => void;
  setResourceFilterFileTypes: (types: Set<string>) => void;
  setResourceFilterServices: (services: Set<string>) => void;
  setResourceFilterExtensions: (extensions: Set<string>) => void;
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
  toggleTimelineFilter: (type: string) => void;
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
  const [timelineFilters, setTimelineFilters] = useState<Set<string>>(new Set(['all']));
  const [selectedMarkNames, setSelectedMarkNames] = useState<Set<string>>(new Set(['all']));
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
  const [resourceViewTab, setResourceViewTab] = useState<ResourceViewTab>('list');
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
        if (parsed.resourceViewTab === 'list' || parsed.resourceViewTab === 'pie') {
          setResourceViewTab(parsed.resourceViewTab);
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
        timelineFilters: Array.from(timelineFilters),
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
    timelineFilters,
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
    sortColumn,
    sortDirection,
    resourceViewTab,
  ]);

  const state: FilterState = {
    timelineFilters,
    selectedMarkNames,
    tableFilters,
    visibleColumns,
    sortColumn,
    sortDirection,
    tableSearchTerm,
    resourceFilterFileTypes,
    resourceFilterServices,
    resourceFilterExtensions,
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

  // Toggle helpers
  const toggleTimelineFilter = (type: string) => {
    const newFilters = new Set(timelineFilters);
    if (type === 'all') {
      setTimelineFilters(new Set(['all']));
    } else {
      newFilters.delete('all');
      if (newFilters.has(type)) {
        newFilters.delete(type);
        if (newFilters.size === 0) newFilters.add('all');
      } else {
        newFilters.add(type);
      }
      setTimelineFilters(newFilters);
    }
  };

  const selectAllTimelineFilters = () => {
    setTimelineFilters(new Set(['all']));
  };

  const clearAllTimelineFilters = () => {
    setTimelineFilters(new Set(['all']));
    setSelectedMarkNames(new Set(['all']));
  };

  const toggleMarkName = (markName: string) => {
    const newMarks = new Set(selectedMarkNames);
    if (markName === 'all') {
      setSelectedMarkNames(new Set(['all']));
    } else {
      newMarks.delete('all');
      if (newMarks.has(markName)) {
        newMarks.delete(markName);
        if (newMarks.size === 0) newMarks.add('all');
      } else {
        newMarks.add(markName);
      }
      setSelectedMarkNames(newMarks);
    }
  };

  const selectAllMarkNames = () => {
    setSelectedMarkNames(new Set(['all']));
  };

  const clearAllMarkNames = () => {
    setSelectedMarkNames(new Set(['all']));
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

  const actions: FilterActions = {
    setTimelineFilters,
    setSelectedMarkNames,
    setTableFilters,
    setVisibleColumns,
    setSortColumn,
    setSortDirection,
    setTableSearchTerm,
    setResourceFilterFileTypes,
    setResourceFilterServices,
    setResourceFilterExtensions,
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
    toggleTimelineFilter,
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

