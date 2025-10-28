import { useMemo, useState } from 'react';
import type { PerformanceEntry, ResourceViewTab } from '../../../types/performance';
import { getResourceExtras } from '../../../utils/resourceUtils';
import { formatBytes } from '../../../utils/formatters';

interface ResourcesViewProps {
  resourceEvents: PerformanceEntry[];
  resourceFilterFileTypes: Set<string>;
  resourceFilterServices: Set<string>;
  resourceFilterExtensions: Set<string>;
  resourceFilterSubtypes: Set<string>;
  resourceViewTab: ResourceViewTab;
  onFileTypeToggle: (fileType: string) => void;
  onServiceToggle: (service: string) => void;
  onExtensionToggle: (extension: string) => void;
  onSubtypeToggle: (subtype: string) => void;
  onResourceViewTabChange: (tab: ResourceViewTab) => void;
  onEventSelect?: (event: PerformanceEntry) => void;
}

export function ResourcesView(props: ResourcesViewProps) {
  const {
    resourceEvents,
    resourceFilterFileTypes,
    resourceFilterServices,
    resourceFilterExtensions,
    resourceFilterSubtypes,
    resourceViewTab,
    onFileTypeToggle,
    onServiceToggle,
    onExtensionToggle,
    onSubtypeToggle,
    onResourceViewTabChange,
    onEventSelect,
  } = props;

  // Get all unique file types, services, extensions, and subtypes
  const fileTypes = useMemo(() => {
    return Array.from(new Set(resourceEvents.map(r => getResourceExtras(r.name, undefined).file_type).filter(Boolean) as string[]));
  }, [resourceEvents]);

  const services = useMemo(() => {
    return Array.from(new Set(resourceEvents.map(r => getResourceExtras(r.name, undefined).service).filter(Boolean) as string[]));
  }, [resourceEvents]);

  const extensions = useMemo(() => {
    return Array.from(new Set(resourceEvents.map(r => getResourceExtras(r.name, undefined).file_extension).filter(Boolean) as string[]));
  }, [resourceEvents]);

  const subtypes = useMemo(() => {
    return Array.from(new Set(resourceEvents.map(r => getResourceExtras(r.name, undefined).resource_subtype).filter(Boolean) as string[]));
  }, [resourceEvents]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resourceEvents.filter(r => {
      const ex = getResourceExtras(r.name, undefined);
      
      // Subtype filter: if not 'all', only include resources with that exact subtype
      if (!resourceFilterSubtypes.has('all')) {
        if (!ex.resource_subtype || !resourceFilterSubtypes.has(ex.resource_subtype)) {
          return false;
        }
      }
      
      // File type filter: if not 'all', only include resources with that file type
      if (!resourceFilterFileTypes.has('all')) {
        if (!ex.file_type || !resourceFilterFileTypes.has(ex.file_type)) {
          return false;
        }
      }
      
      // Service filter: if not 'all', only include resources with that service
      if (!resourceFilterServices.has('all')) {
        if (!ex.service || !resourceFilterServices.has(ex.service)) {
          return false;
        }
      }
      
      // Extension filter: if not 'all', only include resources with that extension
      if (!resourceFilterExtensions.has('all')) {
        if (!ex.file_extension || !resourceFilterExtensions.has(ex.file_extension)) {
          return false;
        }
      }
      
      return true;
    });
  }, [resourceEvents, resourceFilterFileTypes, resourceFilterServices, resourceFilterExtensions, resourceFilterSubtypes]);

  // Track expanded services
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  // Aggregate by service with resources
  const byService = useMemo(() => {
    const map = new Map<string, { transfer: number; body: number; count: number; resources: PerformanceEntry[] }>();
    filteredResources.forEach((r: any) => {
      const sv = getResourceExtras(r.name, undefined).service || 'other';
      const curr = map.get(sv) || { transfer: 0, body: 0, count: 0, resources: [] };
      curr.transfer += r.transferSize || 0;
      curr.body += r.decodedBodySize || 0;
      curr.count += 1;
      curr.resources.push(r);
      map.set(sv, curr);
    });
    return map;
  }, [filteredResources]);

  const toggleService = (service: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev);
      if (next.has(service)) {
        next.delete(service);
      } else {
        next.add(service);
      }
      return next;
    });
  };

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
        width: '250px',
        padding: '16px',
        backgroundColor: '#202020',
        borderRight: '1px solid #333',
        overflowY: 'auto',
      }}>
        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '16px' }}>Filters</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Subtypes Section */}
          {subtypes.length > 0 && (
            <>
              <div style={{ color: '#aaa', fontSize: '11px', fontWeight: 'bold', marginTop: '8px', marginBottom: '4px', textTransform: 'uppercase' }}>
                Type
              </div>
              {subtypes.map(st => (
                <label key={`st-${st}`} style={{ color: '#ddd', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                  <input
                    type="checkbox"
                    checked={resourceFilterSubtypes.has('all') || resourceFilterSubtypes.has(st)}
                    onChange={() => onSubtypeToggle(st)}
                    style={{ marginRight: '8px' }}
                  />
                  {st}
                </label>
              ))}
            </>
          )}

          {/* File Types Section */}
          {fileTypes.length > 0 && (
            <>
              <div style={{ color: '#aaa', fontSize: '11px', fontWeight: 'bold', marginTop: '16px', marginBottom: '4px', textTransform: 'uppercase' }}>
                File Type
              </div>
              {fileTypes.map(ft => (
                <label key={`ft-${ft}`} style={{ color: '#ddd', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                  <input
                    type="checkbox"
                    checked={resourceFilterFileTypes.has('all') || resourceFilterFileTypes.has(ft)}
                    onChange={() => onFileTypeToggle(ft)}
                    style={{ marginRight: '8px' }}
                  />
                  {ft}
                </label>
              ))}
            </>
          )}
          
          {/* Services Section */}
          {services.length > 0 && (
            <>
              <div style={{ color: '#aaa', fontSize: '11px', fontWeight: 'bold', marginTop: '16px', marginBottom: '4px', textTransform: 'uppercase' }}>
                Service
              </div>
              {services.map(sv => (
                <label key={`sv-${sv}`} style={{ color: '#ddd', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                  <input
                    type="checkbox"
                    checked={resourceFilterServices.has('all') || resourceFilterServices.has(sv)}
                    onChange={() => onServiceToggle(sv)}
                    style={{ marginRight: '8px' }}
                  />
                  {sv}
                </label>
              ))}
            </>
          )}
          
          {/* Extensions Section */}
          {extensions.length > 0 && (
            <>
              <div style={{ color: '#aaa', fontSize: '11px', fontWeight: 'bold', marginTop: '16px', marginBottom: '4px', textTransform: 'uppercase' }}>
                Extension
              </div>
              {extensions.map(ext => (
                <label key={`ext-${ext}`} style={{ color: '#ddd', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                  <input
                    type="checkbox"
                    checked={resourceFilterExtensions.has('all') || resourceFilterExtensions.has(ext)}
                    onChange={() => onExtensionToggle(ext)}
                    style={{ marginRight: '8px' }}
                  />
                  .{ext}
                </label>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#ddd', overflow: 'hidden' }}>
        {/* Nested Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #333', backgroundColor: '#252525' }}>
          <button 
            onClick={() => onResourceViewTabChange('all')} 
            style={{ 
              padding: '6px 10px', 
              borderRadius: '6px', 
              border: '1px solid #444', 
              backgroundColor: resourceViewTab === 'all' ? '#333' : '#1f1f1f', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: '12px' 
            }}
          >
            All
          </button>
          <button 
            onClick={() => onResourceViewTabChange('services')} 
            style={{ 
              padding: '6px 10px', 
              borderRadius: '6px', 
              border: '1px solid #444', 
              backgroundColor: resourceViewTab === 'services' ? '#333' : '#1f1f1f', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: '12px' 
            }}
          >
            Services
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
                {[...slices].sort((a, b) => b.value - a.value).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: s.color, display: 'inline-block' }} />
                    <span>{s.label}</span>
                    <span style={{ color: '#888' }}>{formatBytes(s.value)} · {s.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Resources Table - Flat List */}
          {resourceViewTab === 'all' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#252525', color: '#ddd' }}>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #333' }}>Resource</th>
                  <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #333' }}>Service</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #333' }}>Transfer</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #333' }}>Body</th>
                  <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #333' }}>% of total</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredResources]
                  .sort((a: any, b: any) => (b.transferSize || 0) - (a.transferSize || 0))
                  .map((resource: any, idx: number) => {
                    const extras = getResourceExtras(resource.name, undefined);
                    const serviceName = extras.service || 'other';
                    return (
                      <tr 
                        key={idx}
                        style={{ 
                          cursor: onEventSelect ? 'pointer' : 'default',
                          transition: 'background-color 0.15s'
                        }}
                        onClick={() => {
                          if (onEventSelect) {
                            onEventSelect(resource);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (onEventSelect) {
                            e.currentTarget.style.backgroundColor = '#252525';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td 
                          style={{ 
                            padding: '8px', 
                            borderBottom: '1px solid #2a2a2a',
                            fontSize: '11px',
                            maxWidth: '500px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={resource.name}
                        >
                          {resource.name}
                        </td>
                        <td style={{ padding: '8px', borderBottom: '1px solid #2a2a2a', fontSize: '11px', color: '#aaa' }}>
                          {serviceName}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a', fontSize: '11px' }}>
                          {formatBytes(resource.transferSize || 0)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a', fontSize: '11px' }}>
                          {formatBytes(resource.decodedBodySize || 0)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a', fontSize: '11px' }}>
                          {totalTransfer > 0 ? ((resource.transferSize || 0) / totalTransfer * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}

          {/* Services Table - Grouped by Service */}
          {resourceViewTab === 'services' && (
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
                {entries.sort((a,b) => b[1].transfer - a[1].transfer).map(([sv, v]) => {
                  const isExpanded = expandedServices.has(sv);
                  // Sort resources by transfer size (largest first)
                  const sortedResources = [...v.resources].sort((a: any, b: any) => 
                    (b.transferSize || 0) - (a.transferSize || 0)
                  );
                  return (
                    <>
                      <tr key={sv} style={{ cursor: 'pointer' }} onClick={() => toggleService(sv)}>
                        <td style={{ padding: '8px', borderBottom: '1px solid #2a2a2a' }}>
                          <span style={{ marginRight: '6px' }}>{isExpanded ? '▼' : '▶'}</span>
                          {sv}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a' }}>{v.count}</td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a' }}>{formatBytes(v.transfer)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a' }}>{formatBytes(v.body)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a' }}>{((v.transfer/totalForPie)*100).toFixed(1)}%</td>
                      </tr>
                      {isExpanded && sortedResources.map((resource: any, idx: number) => {
                        return (
                          <tr 
                            key={`${sv}-${idx}`} 
                            style={{ 
                              backgroundColor: '#1a1a1a', 
                              cursor: onEventSelect ? 'pointer' : 'default',
                              transition: 'background-color 0.15s'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEventSelect) {
                                onEventSelect(resource);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (onEventSelect) {
                                e.currentTarget.style.backgroundColor = '#252525';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#1a1a1a';
                            }}
                          >
                            <td 
                              style={{ 
                                padding: '8px 8px 8px 32px', 
                                borderBottom: '1px solid #2a2a2a', 
                                fontSize: '11px', 
                                color: '#aaa',
                                maxWidth: '500px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={resource.name}
                            >
                              {resource.name}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a', fontSize: '11px', color: '#aaa' }}>
                              -
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a', fontSize: '11px', color: '#ddd' }}>
                              {formatBytes(resource.transferSize || 0)}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a', fontSize: '11px', color: '#ddd' }}>
                              {formatBytes(resource.decodedBodySize || 0)}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #2a2a2a', fontSize: '11px', color: '#aaa' }}>
                              {totalTransfer > 0 ? ((resource.transferSize || 0) / totalTransfer * 100).toFixed(1) : '0.0'}%
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

