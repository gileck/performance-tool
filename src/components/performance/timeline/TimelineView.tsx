import type { PerformanceEntry, PerformanceData, EventWithPosition } from '../../../types/performance';
import { timeToPixels, calculateLanePositions, calculateEventPosition, getEventColor } from '../../../utils/timelineUtils';
import { getDisplayResourceName, getResourceExtras, getEffectiveType } from '../../../utils/resourceUtils';
import { formatTime } from '../../../utils/formatters';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../../../constants/performance';

interface TimelineViewProps {
  // Data
  processedEvents: PerformanceEntry[];
  filteredEvents: PerformanceEntry[];
  milestoneEvents: PerformanceEntry[];
  eventTypes: Array<{ type: string; count: number }>;
  standaloneMarkNames: string[];
  negativeTimestampCount: number;
  bounds: { min: number; max: number };
  siteModels?: PerformanceData['siteModels'];
  
  // State
  timelineFilters: Set<string>;
  selectedMarkNames: Set<string>;
  zoomLevel: number;
  panOffset: number;
  hoveredEvent: PerformanceEntry | null;
  cursorPosition: { x: number; time: number } | null;
  showNegativeTimestamps: boolean;
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
  onEventSelect: (event: PerformanceEntry) => void;
  onEventHover: (event: PerformanceEntry | null) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  setShowFilterDropdown: (show: boolean) => void;
  
  // Refs
  timelineRef: React.RefObject<HTMLDivElement>;
  timelineContentRef: React.RefObject<HTMLDivElement>;
}

export function TimelineView(props: TimelineViewProps) {
  const {
    processedEvents,
    filteredEvents,
    milestoneEvents,
    eventTypes,
    standaloneMarkNames,
    negativeTimestampCount,
    bounds,
    siteModels,
    timelineFilters,
    selectedMarkNames,
    zoomLevel,
    panOffset,
    hoveredEvent,
    cursorPosition,
    showNegativeTimestamps,
    showFilterDropdown,
    onFilterToggle,
    onSelectAllFilters,
    onClearAllFilters,
    onMarkNameToggle,
    onSelectAllMarkNames,
    onClearAllMarkNames,
    onZoomChange,
    onResetZoom,
    onEventSelect,
    onEventHover,
    onMouseMove,
    onMouseLeave,
    setShowFilterDropdown,
    timelineRef,
    timelineContentRef,
  } = props;

  const eventsWithPositions: EventWithPosition[] = calculateLanePositions(filteredEvents);

  const toPixels = (time: number) => timeToPixels(time, bounds, zoomLevel, panOffset);

  // Calculate the total height needed based on max lane
  const maxLane = eventsWithPositions.reduce((max, event) => Math.max(max, event.lane), 0);
  const timelineHeight = Math.max(200, calculateEventPosition(maxLane) + 50); // Add padding at bottom

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Warning Banner */}
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
      
      {/* Time Scale */}
      <div style={{
        height: '40px',
        borderBottom: '1px solid #333',
        position: 'relative',
        backgroundColor: '#202020',
        overflow: 'hidden',
      }}>
        {[0, 0.25, 0.5, 0.75, 1].map(fraction => {
          const time = bounds.min + (bounds.max - bounds.min) * fraction;
          const left = toPixels(time);
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
        <div 
          ref={timelineContentRef}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          style={{
            position: 'relative',
            height: `${timelineHeight}px`,
            width: '100%',
          }}
        >
          {/* Cursor Line */}
          {cursorPosition && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: `${cursorPosition.x}px`,
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
                  left: `${cursorPosition.x + 5}px`,
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
                {formatTime(cursorPosition.time)}
              </div>
            </>
          )}

          {/* Event Bars */}
          {eventsWithPositions.map((event, index) => {
            const left = toPixels(event.startTime);
            const width = Math.max(2, toPixels(event.startTime + event.duration) - left);
            const top = calculateEventPosition(event.lane);

            const getDisplayText = () => {
              if (width < 30) return '';
              const maxChars = Math.floor(width / 6);
              if (maxChars < 5) return '';
              const raw = event.entryType === 'resource' ? getDisplayResourceName(event.name, siteModels?.publicModel?.externalBaseUrl) : event.name;
              return raw.length > maxChars ? raw.substring(0, maxChars - 3) + '...' : raw;
            };

            return (
              <div
                key={`event-${index}`}
                onMouseEnter={() => onEventHover(event)}
                onMouseLeave={() => onEventHover(null)}
                onClick={() => onEventSelect(event)}
                style={{
                  position: 'absolute',
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: '28px',
                  backgroundColor: getEventColor(getEffectiveType(event, siteModels)),
                  border: '1px solid rgba(0,0,0,0.3)',
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
                title={event.entryType === 'resource' ? getDisplayResourceName(event.name, siteModels?.publicModel?.externalBaseUrl) : event.name}
              >
                {getDisplayText()}
                {hoveredEvent === event && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '-22px',
                      transform: 'translateX(-50%)',
                      padding: '2px 6px',
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      color: '#fff',
                      fontSize: '10px',
                      border: '1px solid #444',
                      borderRadius: '3px',
                      pointerEvents: 'none',
                      zIndex: 200,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatTime(event.duration)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Milestone Markers */}
          {milestoneEvents.map((event, index) => {
            const left = toPixels(event.startTime);
            const color = getEventColor(getEffectiveType(event, siteModels));
            
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
                {/* Label */}
                <div
                  onMouseEnter={() => onEventHover(event)}
                  onMouseLeave={() => onEventHover(null)}
                  onClick={() => onEventSelect(event)}
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
                    border: '1px solid rgba(0,0,0,0.3)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    zIndex: hoveredEvent === event ? 100 : 10,
                  }}
                  title={event.entryType === 'resource' ? getDisplayResourceName(event.name, siteModels?.publicModel?.externalBaseUrl) : event.name}
                >
                  {event.entryType === 'resource' ? getDisplayResourceName(event.name, siteModels?.publicModel?.externalBaseUrl) : event.name}
                </div>
                {/* Line */}
                <div
                  onMouseEnter={() => onEventHover(event)}
                  onMouseLeave={() => onEventHover(null)}
                  onClick={() => onEventSelect(event)}
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: 0,
                    width: '0',
                    height: '100%',
                    borderLeft: `2px dotted ${color}`,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    zIndex: hoveredEvent === event ? 100 : 10,
                    boxShadow: hoveredEvent === event ? `0 0 8px ${color}` : 'none',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

