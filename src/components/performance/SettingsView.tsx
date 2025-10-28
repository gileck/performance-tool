import { useState } from 'react';

interface SettingsViewProps {
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

export function SettingsView({
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
}: SettingsViewProps) {
  const [resourceDomainInput, setResourceDomainInput] = useState('');

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
      flex: 1, 
      overflow: 'auto', 
      padding: '24px', 
      backgroundColor: '#1a1a1a',
      color: '#ddd'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: '#fff', marginTop: 0, marginBottom: '24px' }}>Settings</h2>

        {/* SSR Offset */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontWeight: '500' }}>
            SSR startTime adjustment (ms)
          </label>
          <input 
            type="number" 
            value={ssrTimeOffset} 
            onChange={(e) => onSsrTimeOffsetChange(Number(e.target.value) || 0)}
            placeholder="e.g. 1000" 
            style={{
              width: '100%', 
              padding: '10px 12px', 
              backgroundColor: '#111', 
              color: '#fff', 
              border: '1px solid #333', 
              borderRadius: '6px',
              fontSize: '14px'
            }} 
          />
          <div style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>
            Adds this value to startTime of all SSR events. Use to fix negative SSR timestamps.
          </div>
        </div>

        {/* Minimum Duration */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontWeight: '500' }}>
            Minimum event duration (ms) - Timeline only
          </label>
          <input
            type="number"
            value={minDurationMs}
            onChange={(e) => onMinDurationMsChange(Math.max(0, Number(e.target.value) || 0))}
            placeholder="e.g. 5"
            style={{
              width: '100%', 
              padding: '10px 12px', 
              backgroundColor: '#111', 
              color: '#fff', 
              border: '1px solid #333', 
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <div style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>
            Hides events from the Timeline whose duration is less than this value.
          </div>
        </div>

        {/* Resource Domain Filters (Blacklist) */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontWeight: '500' }}>
            Resource domains to exclude (global)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={resourceDomainInput}
              onChange={(e) => setResourceDomainInput(e.target.value)}
              placeholder="e.g. cdn.example.com or 'google'"
              style={{ 
                flex: 1, 
                padding: '10px 12px', 
                backgroundColor: '#111', 
                color: '#fff', 
                border: '1px solid #333', 
                borderRadius: '6px',
                fontSize: '14px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddDomain();
              }}
            />
            <button
              onClick={handleAddDomain}
              style={{ 
                padding: '10px 16px', 
                borderRadius: '6px', 
                border: '1px solid #444', 
                backgroundColor: '#333', 
                color: '#fff', 
                cursor: 'pointer', 
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Exclude
            </button>
          </div>
          {resourceDomainFilters.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {resourceDomainFilters.map((f, idx) => (
                <span 
                  key={`${f}-${idx}`} 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '6px 12px', 
                    backgroundColor: '#1f1f1f', 
                    border: '1px solid #333', 
                    borderRadius: '16px', 
                    color: '#ddd', 
                    fontSize: '13px' 
                  }}
                >
                  {f}
                  <button
                    onClick={() => handleRemoveDomain(f)}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: '#999', 
                      cursor: 'pointer', 
                      fontSize: '16px',
                      padding: 0,
                      lineHeight: 1
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>
            Resource events whose name includes any of these values will be hidden from all views. Leave empty to show all resources.
          </div>
        </div>

        {/* Graph End Time */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontWeight: '500' }}>
            Graph end time (ms, optional)
          </label>
          <input 
            type="number" 
            value={graphEndTime ?? ''} 
            onChange={(e) => {
              const v = e.target.value === '' ? null : Number(e.target.value);
              onGraphEndTimeChange(v as any);
            }} 
            placeholder="e.g. 4000" 
            style={{
              width: '100%', 
              padding: '10px 12px', 
              backgroundColor: '#111', 
              color: '#fff', 
              border: '1px solid #333', 
              borderRadius: '6px',
              fontSize: '14px'
            }} 
          />
          <div style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>
            Show only events whose startTime is less than or equal to this value.
          </div>
        </div>

        {/* Toggle negative timestamps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <input 
            id="toggle-negative" 
            type="checkbox" 
            checked={showNegativeTimestamps}
            onChange={(e) => onShowNegativeTimestampsChange(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="toggle-negative" style={{ color: '#ccc', cursor: 'pointer' }}>
            Show events with negative startTime
          </label>
        </div>
      </div>
    </div>
  );
}

