import type { PerformanceEntry, PerformanceData } from '../../types/performance';
import { getEventColor } from '../../utils/timelineUtils';
import { getResourceExtras, getEffectiveType } from '../../utils/resourceUtils';
import { formatTime } from '../../utils/formatters';

interface EventDetailsPanelProps {
  selectedEvent: PerformanceEntry | null;
  onClose: () => void;
  siteModels?: PerformanceData['siteModels'];
}

export function EventDetailsPanel({ selectedEvent, onClose, siteModels }: EventDetailsPanelProps) {
  return (
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
            onClick={onClose}
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
            border: `2px solid ${getEventColor(getEffectiveType(selectedEvent, siteModels))}`,
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
                    backgroundColor: getEventColor(getEffectiveType(selectedEvent, siteModels)),
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
              {Object.entries({
                  ...(selectedEvent.entryType === 'resource' ? getResourceExtras(selectedEvent.name, siteModels) : {}),
                  ...selectedEvent,
                })
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
  );
}

