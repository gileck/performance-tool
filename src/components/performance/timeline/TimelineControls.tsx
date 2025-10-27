import type { PerformanceEntry } from '../../../types/performance';
import { getEventColor } from '../../../utils/timelineUtils';
import { getEffectiveType } from '../../../utils/resourceUtils';
import { formatTime } from '../../../utils/formatters';
import { MIN_ZOOM, MAX_ZOOM } from '../../../constants/performance';

interface TimelineControlsProps {
  // Data
  processedEvents: PerformanceEntry[];
  eventTypes: Array<{ type: string; count: number }>;
  standaloneMarkNames: string[];
  timelineFilteredEvents: PerformanceEntry[];
  timelineMilestoneEvents: PerformanceEntry[];
  timelineBounds: { min: number; max: number };
  siteModels?: any;
  
  // State
  timelineFilters: Set<string>;
  selectedMarkNames: Set<string>;
  zoomLevel: number;
  showFilterDropdown: boolean;
  
  // Actions
  onFilterToggle: (type: string) => void;
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
    timelineFilters,
    selectedMarkNames,
    zoomLevel,
    showFilterDropdown,
    onFilterToggle,
    onSelectAllFilters,
    onClearAllFilters,
    onMarkNameToggle,
    onSelectAllMarkNames,
    onClearAllMarkNames,
    onZoomChange,
    onResetZoom,
    setShowFilterDropdown,
  } = props;

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
            {timelineFilters.has('all') 
              ? `All (${processedEvents.length})`
              : `${timelineFilters.size} selected`
            }
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
                onClick={onSelectAllFilters}
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
            >
              <input
                type="checkbox"
                checked={timelineFilters.has('all')}
                onChange={() => onFilterToggle('all')}
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
              >
                <input
                  type="checkbox"
                  checked={timelineFilters.has(type)}
                  onChange={() => onFilterToggle(type)}
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

            {/* Mark Names Filter */}
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
                    onClick={onSelectAllMarkNames}
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
                >
                  <input
                    type="checkbox"
                    checked={selectedMarkNames.has('all')}
                    onChange={() => onMarkNameToggle('all')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>All Marks ({standaloneMarkNames.length})</span>
                </label>

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
    </div>
  );
}

