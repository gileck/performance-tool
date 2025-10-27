import { useMemo } from 'react';
import type { PerformanceEntry, ResourceViewTab } from '../../../types/performance';
import { getResourceExtras } from '../../../utils/resourceUtils';
import { formatBytes } from '../../../utils/formatters';

interface ResourcesViewProps {
  resourceEvents: PerformanceEntry[];
  resourceFilterFileTypes: Set<string>;
  resourceFilterServices: Set<string>;
  resourceFilterExtensions: Set<string>;
  resourceViewTab: ResourceViewTab;
  onFileTypeToggle: (fileType: string) => void;
  onServiceToggle: (service: string) => void;
  onExtensionToggle: (extension: string) => void;
  onResourceViewTabChange: (tab: ResourceViewTab) => void;
}

export function ResourcesView(props: ResourcesViewProps) {
  const {
    resourceEvents,
    resourceFilterFileTypes,
    resourceFilterServices,
    resourceFilterExtensions,
    resourceViewTab,
    onFileTypeToggle,
    onServiceToggle,
    onExtensionToggle,
    onResourceViewTabChange,
  } = props;

  // Get all unique file types, services, and extensions
  const fileTypes = useMemo(() => {
    return Array.from(new Set(resourceEvents.map(r => getResourceExtras(r.name, undefined).file_type).filter(Boolean) as string[]));
  }, [resourceEvents]);

  const services = useMemo(() => {
    return Array.from(new Set(resourceEvents.map(r => getResourceExtras(r.name, undefined).service).filter(Boolean) as string[]));
  }, [resourceEvents]);

  const extensions = useMemo(() => {
    return Array.from(new Set(resourceEvents.map(r => getResourceExtras(r.name, undefined).file_extension).filter(Boolean) as string[]));
  }, [resourceEvents]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resourceEvents.filter(r => {
      const ex = getResourceExtras(r.name, undefined);
      if (!resourceFilterFileTypes.has('all') && ex.file_type && !resourceFilterFileTypes.has(ex.file_type)) return false;
      if (!resourceFilterServices.has('all') && ex.service && !resourceFilterServices.has(ex.service)) return false;
      if (!resourceFilterExtensions.has('all') && ex.file_extension && !resourceFilterExtensions.has(ex.file_extension)) return false;
      return true;
    });
  }, [resourceEvents, resourceFilterFileTypes, resourceFilterServices, resourceFilterExtensions]);

  // Aggregate by service
  const byService = useMemo(() => {
    const map = new Map<string, { transfer: number; body: number; count: number }>();
    filteredResources.forEach((r: any) => {
      const sv = getResourceExtras(r.name, undefined).service || 'other';
      const curr = map.get(sv) || { transfer: 0, body: 0, count: 0 };
      curr.transfer += r.transferSize || 0;
      curr.body += r.decodedBodySize || 0;
      curr.count += 1;
      map.set(sv, curr);
    });
    return map;
  }, [filteredResources]);

  const totalTransfer = filteredResources.reduce((sum, r: any) => sum + (r.transferSize || 0), 0);
  const totalBody = filteredResources.reduce((sum, r: any) => sum + (r.decodedBodySize || 0), 0);

  // Pie chart slices
  const entries = Array.from(byService.entries());
  const totalForPie = entries.reduce((s, [, v]) => s + v.transfer, 0) || 1;
  let acc = 0;
  const slices = entries.map(([sv, v], idx) => {
    const angle = (v.transfer / totalForPie) * Math.PI * 2;
    const x1 = Math.cos(acc) * 50;
    const y1 = Math.sin(acc) * 50;
    acc += angle;
    const x2 = Math.cos(acc) * 50;
    const y2 = Math.sin(acc) * 50;
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M 0 0 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const colors = ['#4A90E2','#F5A623','#7ED321','#BD10E0','#50E3C2','#B8E986','#F8E71C','#D0021B'];
    const pct = ((v.transfer / totalForPie) * 100);
    return { path, color: colors[idx % colors.length], label: sv, value: v.transfer, pct };
  });

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
      {/* Filters Panel */}
      <div style={{
        width: '320px',
        padding: '16px',
        backgroundColor: '#202020',
        borderRight: '1px solid #333',
      }}>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '12px' }}>Filters</div>
        
        {/* File Types */}
        {fileTypes.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '6px' }}>File Type</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {fileTypes.map(ft => (
                <label key={ft} style={{ color: '#ddd', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={resourceFilterFileTypes.has('all') || resourceFilterFileTypes.has(ft)}
                    onChange={() => onFileTypeToggle(ft)}
                    style={{ marginRight: '6px' }}
                  />
                  {ft}
                </label>
              ))}
            </div>
          </div>
        )}
        
        {/* Services */}
        {services.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '6px' }}>Service</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {services.map(sv => (
                <label key={sv} style={{ color: '#ddd', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={resourceFilterServices.has('all') || resourceFilterServices.has(sv)}
                    onChange={() => onServiceToggle(sv)}
                    style={{ marginRight: '6px' }}
                  />
                  {sv}
                </label>
              ))}
            </div>
          </div>
        )}
        
        {/* Extensions */}
        {extensions.length > 0 && (
          <div>
            <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '6px' }}>Extension</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {extensions.map(ext => (
                <label key={ext} style={{ color: '#ddd', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={resourceFilterExtensions.has('all') || resourceFilterExtensions.has(ext)}
                    onChange={() => onExtensionToggle(ext)}
                    style={{ marginRight: '6px' }}
                  />
                  .{ext}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#ddd', overflow: 'hidden' }}>
        {/* Nested Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #333', backgroundColor: '#252525' }}>
          <button 
            onClick={() => onResourceViewTabChange('list')} 
            style={{ 
              padding: '6px 10px', 
              borderRadius: '6px', 
              border: '1px solid #444', 
              backgroundColor: resourceViewTab === 'list' ? '#333' : '#1f1f1f', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: '12px' 
            }}
          >
            List
          </button>
          <button 
            onClick={() => onResourceViewTabChange('pie')} 
            style={{ 
              padding: '6px 10px', 
              borderRadius: '6px', 
              border: '1px solid #444', 
              backgroundColor: resourceViewTab === 'pie' ? '#333' : '#1f1f1f', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: '12px' 
            }}
          >
            Pie
          </button>
        </div>

        {/* Summary and Content */}
        <div style={{ padding: '16px 20px', overflow: 'auto' }}>
          {/* Totals */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>Total transfer</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatBytes(totalTransfer)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>Total body</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatBytes(totalBody)}</div>
            </div>
          </div>

          {/* Pie Chart */}
          {resourceViewTab === 'pie' && (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <svg width="180" height="180" viewBox="-60 -60 120 120" style={{ background: 'transparent' }}>
                {slices.map((s, i) => (
                  <path key={i} d={s.path} fill={s.color} stroke="#111" strokeWidth="1" />
                ))}
              </svg>
              <div>
                {slices.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: s.color, display: 'inline-block' }} />
                    <span>{s.label}</span>
                    <span style={{ color: '#888' }}>{formatBytes(s.value)} · {s.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List Table */}
          {resourceViewTab === 'list' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#252525', color: '#ddd' }}>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #333' }}>Service</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #333' }}>Files</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #333' }}>Transfer</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #333' }}>Body</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #333' }}>% of total</th>
                </tr>
              </thead>
              <tbody>
                {entries.sort((a,b) => b[1].transfer - a[1].transfer).map(([sv, v]) => (
                  <tr key={sv}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #2a2a2a' }}>{sv}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a' }}>{v.count}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a' }}>{formatBytes(v.transfer)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a' }}>{formatBytes(v.body)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a' }}>{((v.transfer/totalForPie)*100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

