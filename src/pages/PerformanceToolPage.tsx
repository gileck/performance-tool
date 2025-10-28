import { useState, useMemo, useEffect } from 'react';
import type { PerformanceEntry, PerformanceData, TabType, ResourceViewTab, SortDirection } from '../types/performance';
import { usePerformanceFilters } from '../hooks/usePerformanceFilters';
import { useEventProcessing } from '../hooks/useEventProcessing';
import { useTimelineInteraction } from '../hooks/useTimelineInteraction';
import { PerformanceHeader } from '../components/performance/PerformanceHeader';
import { TabNavigation } from '../components/performance/TabNavigation';
import { EventDetailsPanel } from '../components/performance/EventDetailsPanel';
import { TimelineView } from '../components/performance/timeline/TimelineView';
import { TimelineControls } from '../components/performance/timeline/TimelineControls';
import { TableView } from '../components/performance/table/TableView';
import { ResourcesView } from '../components/performance/resources/ResourcesView';
import { SettingsView } from '../components/performance/SettingsView';
import { calculateTimelineBounds, pixelsToTime, getEventColor } from '../utils/timelineUtils';
import { getEffectiveType } from '../utils/resourceUtils';
import { formatTime } from '../utils/formatters';

export function PerformanceToolPage({ data }: { data: PerformanceData }) {
  if (!data || !Array.isArray(data.data)) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#121212', color: '#ffffff', minHeight: '100vh' }}>
        <h1>Performance Tool</h1>
        <p>No data available yet. Waiting for message from opener...</p>
      </div>
    );
  }

  // Selected event state
  const [selectedEvent, setSelectedEvent] = useState<PerformanceEntry | null>(null);

  // Table state
  const [sortColumn, setSortColumn] = useState<string>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Use custom hooks
  const [filters, filterActions, filterDropdowns] = usePerformanceFilters();
  const [timelineInteraction, timelineHandlers] = useTimelineInteraction();

  // Get activeTab and resourceViewTab from filters
  const activeTab = filters.activeTab;
  const resourceViewTab = filters.resourceViewTab;

  // Sync URL with tab state on mount
  useEffect(() => {
    if (!filters.settingsLoaded) return; // Wait for settings to load first
    
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab') as TabType | null;
    const urlResourceView = params.get('resourceView') as ResourceViewTab | null;
    
    if (urlTab && (urlTab === 'timeline' || urlTab === 'table' || urlTab === 'resources' || urlTab === 'settings')) {
      if (urlTab !== activeTab) {
        filterActions.setActiveTab(urlTab);
      }
    }
    
    if (urlResourceView && (urlResourceView === 'all' || urlResourceView === 'services' || urlResourceView === 'pie')) {
      if (urlResourceView !== resourceViewTab) {
        filterActions.setResourceViewTab(urlResourceView);
      }
    }
  }, [filters.settingsLoaded]); // Only run once after settings load

  // Update URL when tabs change
  useEffect(() => {
    if (!filters.settingsLoaded) return; // Don't update URL until settings are loaded
    
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    if (activeTab === 'resources') {
      params.set('resourceView', resourceViewTab);
    } else {
      params.delete('resourceView');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab, resourceViewTab, filters.settingsLoaded]);

  // Process events
  const eventData = useEventProcessing({
    data,
    ssrTimeOffset: filters.ssrTimeOffset,
    timelineFilters: filters.timelineFilters,
    selectedMarkNames: filters.selectedMarkNames,
    tableFilters: filters.tableFilters,
    tableSearchTerm: filters.tableSearchTerm,
    showNegativeTimestamps: filters.showNegativeTimestamps,
    graphEndTime: filters.graphEndTime,
    minDurationMs: filters.minDurationMs,
    resourceDomainFilters: filters.resourceDomainFilters,
  });

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    return calculateTimelineBounds(
      eventData.timelineFilteredEvents,
      eventData.timelineMilestoneEvents,
      filters.showNegativeTimestamps
    );
  }, [eventData.timelineFilteredEvents, eventData.timelineMilestoneEvents, filters.showNegativeTimestamps]);

  // Helper to convert pixels to time
  const toTime = (pixels: number) => pixelsToTime(pixels, timelineBounds, filters.zoomLevel, filters.panOffset);

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
    console.log('Processed Events:', eventData.processedEvents);
    console.log('Timeline Filtered Events:', eventData.timelineFilteredEvents);
    console.log('Timeline Milestone Events:', eventData.timelineMilestoneEvents);
    console.log('Table Filtered Events:', eventData.tableFilteredEvents);
    alert('Data printed to console. Open DevTools to view.');
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div style={{
      backgroundColor: '#121212',
      color: '#ffffff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PerformanceHeader
          data={data}
          onCopyData={copyRawData}
          onPrintConsole={printToConsole}
        />
      </div>

      {/* Main Tabs Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={filterActions.setActiveTab}
      />

      <div style={{ padding: '16px 24px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeTab === 'timeline' && (
            <TimelineControls
              processedEvents={eventData.processedEvents}
              eventTypes={eventData.eventTypes}
              standaloneMarkNames={eventData.standaloneMarkNames}
              timelineFilteredEvents={eventData.timelineFilteredEvents}
              timelineMilestoneEvents={eventData.timelineMilestoneEvents}
              timelineBounds={timelineBounds}
              siteModels={data.siteModels}
              timelineFilters={filters.timelineFilters}
              selectedMarkNames={filters.selectedMarkNames}
              zoomLevel={filters.zoomLevel}
              showFilterDropdown={filterDropdowns.showTimelineFilterDropdown}
              onFilterToggle={filterActions.toggleTimelineFilter}
              onSelectAllFilters={filterActions.selectAllTimelineFilters}
              onClearAllFilters={filterActions.clearAllTimelineFilters}
              onMarkNameToggle={filterActions.toggleMarkName}
              onSelectAllMarkNames={filterActions.selectAllMarkNames}
              onClearAllMarkNames={filterActions.clearAllMarkNames}
              onZoomChange={filterActions.handleZoom}
              onResetZoom={() => filterActions.setZoomLevel(1)}
              setShowFilterDropdown={filterActions.setShowTimelineFilterDropdown}
            />
          )}
          
          {activeTab === 'table' && (
            <div style={{ fontSize: '14px', color: '#aaa' }}>
              Table Events: {eventData.tableFilteredEvents.length} | Total: {eventData.processedEvents.length}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Timeline View */}
        {activeTab === 'timeline' && (
          <TimelineView
            processedEvents={eventData.processedEvents}
            filteredEvents={eventData.timelineFilteredEvents}
            milestoneEvents={eventData.timelineMilestoneEvents}
            eventTypes={eventData.eventTypes}
            standaloneMarkNames={eventData.standaloneMarkNames}
            negativeTimestampCount={eventData.negativeTimestampCount}
            bounds={timelineBounds}
            siteModels={data.siteModels}
            timelineFilters={filters.timelineFilters}
            selectedMarkNames={filters.selectedMarkNames}
            zoomLevel={filters.zoomLevel}
            panOffset={filters.panOffset}
            hoveredEvent={timelineInteraction.hoveredEvent}
            cursorPosition={timelineInteraction.timelineCursorPosition}
            showNegativeTimestamps={filters.showNegativeTimestamps}
            showFilterDropdown={filterDropdowns.showTimelineFilterDropdown}
            onFilterToggle={filterActions.toggleTimelineFilter}
            onSelectAllFilters={filterActions.selectAllTimelineFilters}
            onClearAllFilters={filterActions.clearAllTimelineFilters}
            onMarkNameToggle={filterActions.toggleMarkName}
            onSelectAllMarkNames={filterActions.selectAllMarkNames}
            onClearAllMarkNames={filterActions.clearAllMarkNames}
            onZoomChange={filterActions.handleZoom}
            onResetZoom={() => filterActions.setZoomLevel(1)}
            onEventSelect={setSelectedEvent}
            onEventHover={timelineHandlers.setHoveredEvent}
            onMouseMove={(e) => timelineHandlers.handleTimelineMouseMove(e, toTime)}
            onMouseLeave={timelineHandlers.handleTimelineMouseLeave}
            setShowFilterDropdown={filterActions.setShowTimelineFilterDropdown}
            timelineRef={timelineInteraction.timelineRef}
            timelineContentRef={timelineInteraction.timelineContentRef}
          />
        )}

        {/* Table View */}
        {activeTab === 'table' && (
          <TableView
            filteredEvents={eventData.tableFilteredEvents}
            eventTypes={eventData.eventTypes}
            siteModels={data.siteModels}
            processedEventsCount={eventData.processedEvents.length}
            tableFilters={filters.tableFilters}
            tableSearchTerm={filters.tableSearchTerm}
            visibleColumns={filters.visibleColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            showFilterDropdown={filterDropdowns.showTableFilterDropdown}
            showColumnSelector={filterDropdowns.showColumnSelector}
            onFilterToggle={filterActions.toggleTableFilter}
            onSelectAllFilters={filterActions.selectAllTableFilters}
            onClearAllFilters={filterActions.clearAllTableFilters}
            onSearchChange={filterActions.setTableSearchTerm}
            onSort={handleSort}
            onColumnToggle={filterActions.toggleColumn}
            onEventSelect={setSelectedEvent}
            setShowFilterDropdown={filterActions.setShowTableFilterDropdown}
            setShowColumnSelector={filterActions.setShowColumnSelector}
          />
        )}

        {/* Resources View */}
        {activeTab === 'resources' && (
          <ResourcesView
            resourceEvents={eventData.resourceEvents}
            resourceFilterFileTypes={filters.resourceFilterFileTypes}
            resourceFilterServices={filters.resourceFilterServices}
            resourceFilterExtensions={filters.resourceFilterExtensions}
            resourceFilterSubtypes={filters.resourceFilterSubtypes}
            resourceViewTab={filters.resourceViewTab}
            onFileTypeToggle={filterActions.toggleResourceFileType}
            onServiceToggle={filterActions.toggleResourceService}
            onExtensionToggle={filterActions.toggleResourceExtension}
            onSubtypeToggle={filterActions.toggleResourceSubtype}
            onResourceViewTabChange={filterActions.setResourceViewTab}
            onEventSelect={setSelectedEvent}
            siteModels={data.siteModels}
          />
        )}

        {/* Settings View */}
        {activeTab === 'settings' && (
          <SettingsView
            ssrTimeOffset={filters.ssrTimeOffset}
            onSsrTimeOffsetChange={filterActions.setSsrTimeOffset}
            minDurationMs={filters.minDurationMs}
            onMinDurationMsChange={filterActions.setMinDurationMs}
            resourceDomainFilters={filters.resourceDomainFilters}
            onResourceDomainFiltersChange={filterActions.setResourceDomainFilters}
            graphEndTime={filters.graphEndTime}
            onGraphEndTimeChange={filterActions.setGraphEndTime}
            showNegativeTimestamps={filters.showNegativeTimestamps}
            onShowNegativeTimestampsChange={filterActions.setShowNegativeTimestamps}
          />
        )}

        {/* Details Panel - Only render when an event is selected */}
        {selectedEvent && (
          <EventDetailsPanel
            selectedEvent={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            siteModels={data.siteModels}
          />
        )}
      </div>

      {/* Hover Tooltip */}
      {timelineInteraction.hoveredEvent && activeTab === 'timeline' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          border: `2px solid ${getEventColor(getEffectiveType(timelineInteraction.hoveredEvent, data.siteModels))}`,
          borderRadius: '8px',
          maxWidth: '500px',
          fontSize: '13px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: getEventColor(getEffectiveType(timelineInteraction.hoveredEvent, data.siteModels)) }}>
            {getEffectiveType(timelineInteraction.hoveredEvent, data.siteModels)}
            {(timelineInteraction.hoveredEvent as any)._isCombined && (
              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#9FE6A0' }}>
                ✓ Combined
              </span>
            )}
          </div>
          <div style={{ marginBottom: '6px', wordBreak: 'break-all' }}>
            {timelineInteraction.hoveredEvent.name}
          </div>
          <div style={{ color: '#aaa', fontSize: '12px' }}>
            Start: {formatTime(timelineInteraction.hoveredEvent.startTime)} | Duration: {formatTime(timelineInteraction.hoveredEvent.duration)}
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

