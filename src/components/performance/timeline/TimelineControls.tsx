import type { PerformanceEntry, PerformanceData, TimelineBounds } from '../../../types/performance';
import { getEventColor } from '../../../utils/timelineUtils';
import { getEffectiveType } from '../../../utils/resourceUtils';
import { formatTime } from '../../../utils/formatters';

interface TimelineControlsProps {
  processedEvents: PerformanceEntry[];
  eventTypes: Array<{ type: string; count: number }>;
  standaloneMarkNames: string[];
  timelineFilteredEvents: PerformanceEntry[];
  timelineMilestoneEvents: PerformanceEntry[];
  timelineBounds: TimelineBounds;
  siteModels?: PerformanceData['siteModels'];

  timelineEventFilters: Set<string>;
  milestoneFilters: Set<string>;
  selectedMarkNames: Set<string>;
  zoomLevel: number;
  showFilterDropdown: boolean;

  onEventFilterToggle: (type: string) => void;
  onMilestoneFilterToggle: (type: string) => void;
  onSelectAllFilters: () => void;
  onClearAllFilters: () => void;
  onMarkNameToggle: (markName: string) => void;
  onSelectAllMarkNames: () => void;
  onClearAllMarkNames: () => void;
  onZoomChange: (delta: number) => void;
  onResetZoom: () => void;

  setShowFilterDropdown: (show: boolean) => void;
}

export function TimelineControls(props: TimelineControlsProps) {
  const {
    processedEvents,
    eventTypes,
    standaloneMarkNames,
    timelineFilteredEvents,
    timelineMilestoneEvents,
    timelineBounds,
    siteModels,
    timelineEventFilters,
    milestoneFilters,
    selectedMarkNames,
    zoomLevel,
    showFilterDropdown,
    onEventFilterToggle,
    onMilestoneFilterToggle,
    onSelectAllFilters,
    onClearAllFilters,
    onMarkNameToggle,
    onSelectAllMarkNames,
    onClearAllMarkNames,
    onZoomChange,
    onResetZoom,
    setShowFilterDropdown,
  } = props;

  // Separate event types into timeline events and milestone markers
  const milestoneTypes = ['paint', 'largest-contentful-paint', 'ttfb'];
  const timelineEventTypes = eventTypes.filter(({ type }) => !milestoneTypes.includes(type));
  const milestoneEventTypes = eventTypes.filter(({ type }) => milestoneTypes.includes(type));

  const handleSelectAll = () => {
    // Select all timeline event types
    timelineEventTypes.forEach(({ type }) => {
      if (!timelineEventFilters.has(type)) {
        onEventFilterToggle(type);
      }
    });
    // Select all milestone types
    milestoneEventTypes.forEach(({ type }) => {
      if (!milestoneFilters.has(type)) {
        onMilestoneFilterToggle(type);
      }
    });
    // Select all mark names
    standaloneMarkNames.forEach((markName) => {
      if (!selectedMarkNames.has(markName)) {
        onMarkNameToggle(markName);
      }
    });
  };

  const handleSelectAllMarks = () => {
    standaloneMarkNames.forEach((markName) => {
      if (!selectedMarkNames.has(markName)) {
        onMarkNameToggle(markName);
      }
    });
  };

  return (
    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Filter Dropdown */}
      <div className="timeline-filter-dropdown-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '14px', fontWeight: '500' }}>Filter:</label>
        <button
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
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
            {timelineEventFilters.size + milestoneFilters.size + selectedMarkNames.size} selected
          </span>
          <span style={{ marginLeft: '8px' }}>▼</span>
        </button>
        
        {showFilterDropdown && (
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
            minWidth: '280px',
            maxHeight: '500px',
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
                onClick={handleSelectAll}
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
                onClick={onClearAllFilters}
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

            {/* Timeline Events Section */}
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '6px 8px',
              color: '#aaa',
              backgroundColor: '#2a2a2a',
              borderRadius: '4px',
              marginBottom: '8px',
            }}>
              Timeline Events
            </div>

            {timelineEventTypes.map(({ type, count }) => (
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
                  backgroundColor: timelineEventFilters.has(type) ? '#444' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={timelineEventFilters.has(type)}
                  onChange={() => onEventFilterToggle(type)}
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

            {/* Milestone Markers Section */}
            {milestoneEventTypes.length > 0 && (
              <>
                <div style={{ height: '1px', backgroundColor: '#444', margin: '12px 0' }} />
                
                <div style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '6px 8px',
                  color: '#aaa',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '4px',
                  marginBottom: '8px',
                }}>
                  Milestone Markers
                </div>

                {milestoneEventTypes.map(({ type, count }) => {
                  const displayName = type === 'largest-contentful-paint' ? 'LCP' : 
                                     type === 'paint' ? 'Paint (FP/FCP)' : 
                                     type.toUpperCase();
                  return (
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
                        backgroundColor: milestoneFilters.has(type) ? '#444' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={milestoneFilters.has(type)}
                        onChange={() => onMilestoneFilterToggle(type)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div
                        style={{
                          width: '2px',
                          height: '16px',
                          backgroundColor: getEventColor(type),
                          border: '1px solid rgba(0,0,0,0.3)',
                        }}
                      />
                      <span>{displayName} ({count})</span>
                    </label>
                  );
                })}
              </>
            )}

            {/* Mark Names Filter */}
            {standaloneMarkNames.length > 0 && (
              <>
                <div style={{ height: '1px', backgroundColor: '#444', margin: '12px 0' }} />
                
                <div style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  padding: '6px 8px',
                  color: '#aaa',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '4px',
                  marginBottom: '8px',
                }}>
                  Mark Names
                </div>

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
                    onClick={handleSelectAllMarks}
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
                    onClick={onClearAllMarkNames}
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
                    >
                      <input
                        type="checkbox"
                        checked={selectedMarkNames.has(markName)}
                        onChange={() => onMarkNameToggle(markName)}
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

      {/* Zoom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontSize: '14px', fontWeight: '500' }}>Zoom:</label>
        <button
          onClick={() => onZoomChange(-0.2)}
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
          onClick={() => onZoomChange(0.2)}
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
          onClick={onResetZoom}
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

      {/* Stats */}
      <div style={{ fontSize: '14px', color: '#aaa', marginLeft: '15px' }}>
        Total Duration: {formatTime(timelineBounds.max)} | Events: {timelineFilteredEvents.length} | 
        Milestones: {timelineMilestoneEvents.length} | 
        Combined: {processedEvents.filter((e: any) => e._isCombined).length}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #333',
        width: '100%',
      }}>
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#888' }}>Legend:</span>
        {eventTypes.map(({ type, count }) => {
            const filteredCount = timelineFilteredEvents.filter(e => getEffectiveType(e, siteModels) === type).length;
            const milestoneCount = timelineMilestoneEvents.filter(e => getEffectiveType(e, siteModels) === type).length;
            const totalCount = filteredCount + milestoneCount;
            const isMilestone = milestoneTypes.includes(type);
            
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
    </div>
  );
}
