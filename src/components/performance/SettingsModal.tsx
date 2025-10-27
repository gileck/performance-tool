import { useState } from 'react';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  ssrTimeOffset: number;
  onSsrTimeOffsetChange: (value: number) => void;
  minDurationMs: number;
  onMinDurationMsChange: (value: number) => void;
  resourceDomainFilters: string[];
  onResourceDomainFiltersChange: (filters: string[]) => void;
  graphEndTime: number | null;
  onGraphEndTimeChange: (value: number | null) => void;
  showNegativeTimestamps: boolean;
  onShowNegativeTimestampsChange: (value: boolean) => void;
}

export function SettingsModal({
  show,
  onClose,
  ssrTimeOffset,
  onSsrTimeOffsetChange,
  minDurationMs,
  onMinDurationMsChange,
  resourceDomainFilters,
  onResourceDomainFiltersChange,
  graphEndTime,
  onGraphEndTimeChange,
  showNegativeTimestamps,
  onShowNegativeTimestampsChange,
}: SettingsModalProps) {
  const [resourceDomainInput, setResourceDomainInput] = useState('');

  if (!show) return null;

  const handleAddDomain = () => {
    const val = resourceDomainInput.trim();
    if (val && !resourceDomainFilters.includes(val)) {
      onResourceDomainFiltersChange([...resourceDomainFilters, val]);
      setResourceDomainInput('');
    }
  };

  const handleRemoveDomain = (filter: string) => {
    onResourceDomainFiltersChange(resourceDomainFilters.filter(f => f !== filter));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div className="settings-modal" style={{
        width: '520px', backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '16px 18px'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>Settings</h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '18px'
          }}>✕</button>
        </div>

        {/* SSR Offset */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '6px' }}>SSR startTime adjustment (ms)</label>
          <input type="number" value={ssrTimeOffset} onChange={(e) => onSsrTimeOffsetChange(Number(e.target.value) || 0)}
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
            onChange={(e) => onMinDurationMsChange(Math.max(0, Number(e.target.value) || 0))}
            placeholder="e.g. 5"
            style={{
              width: '100%', padding: '8px 10px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px'
            }}
          />
          <div style={{ color: '#888', fontSize: '12px', marginTop: '6px' }}>
            Hides events whose duration is less than this value.
          </div>
        </div>

        {/* Resource Domain Filters (Blacklist) */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '6px' }}>Resource domains to exclude</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={resourceDomainInput}
              onChange={(e) => setResourceDomainInput(e.target.value)}
              placeholder="e.g. cdn.example.com or 'google'"
              style={{ flex: 1, padding: '8px 10px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddDomain();
              }}
            />
            <button
              onClick={handleAddDomain}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #444', backgroundColor: '#333', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
            >
              Exclude
            </button>
          </div>
          {resourceDomainFilters.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {resourceDomainFilters.map((f, idx) => (
                <span key={`${f}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: '#1f1f1f', border: '1px solid #333', borderRadius: '12px', color: '#ddd', fontSize: '12px' }}>
                  {f}
                  <button
                    onClick={() => handleRemoveDomain(f)}
                    style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px' }}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div style={{ color: '#888', fontSize: '12px', marginTop: '6px' }}>
            Resource events whose name includes any of these values will be hidden. Leave empty to show all resources.
          </div>
        </div>

        {/* Graph End Time */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '6px' }}>Graph end time (ms, optional)</label>
          <input type="number" value={graphEndTime ?? ''} onChange={(e) => {
            const v = e.target.value === '' ? null : Number(e.target.value);
            onGraphEndTimeChange(v as any);
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
            onChange={(e) => onShowNegativeTimestampsChange(e.target.checked)} />
          <label htmlFor="toggle-negative" style={{ color: '#ccc' }}>Show events with negative startTime</label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={{
            padding: '6px 12px', borderRadius: '6px', border: '1px solid #444', backgroundColor: '#333', color: '#fff', cursor: 'pointer'
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

