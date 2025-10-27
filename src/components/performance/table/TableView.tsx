import { useMemo } from 'react';
import type { PerformanceEntry, PerformanceData, SortDirection } from '../../../types/performance';
import { getDisplayResourceName } from '../../../utils/resourceUtils';
import { formatTime } from '../../../utils/formatters';

interface TableViewProps {
  // Data
  filteredEvents: PerformanceEntry[];
  eventTypes: Array<{ type: string; count: number }>;
  siteModels?: PerformanceData['siteModels'];
  processedEventsCount: number;
  
  // State
  tableFilters: Set<string>;
  tableSearchTerm: string;
  visibleColumns: Set<string>;
  sortColumn: string;
  sortDirection: SortDirection;
  showFilterDropdown: boolean;
  showColumnSelector: boolean;
  
  // Actions
  onFilterToggle: (type: string) => void;
  onSelectAllFilters: () => void;
  onClearAllFilters: () => void;
  onSearchChange: (term: string) => void;
  onSort: (column: string) => void;
  onColumnToggle: (column: string) => void;
  onEventSelect: (event: PerformanceEntry) => void;
  setShowFilterDropdown: (show: boolean) => void;
  setShowColumnSelector: (show: boolean) => void;
}

export function TableView(props: TableViewProps) {
  const {
    filteredEvents,
    eventTypes,
    siteModels,
    processedEventsCount,
    tableFilters,
    tableSearchTerm,
    visibleColumns,
    sortColumn,
    sortDirection,
    showFilterDropdown,
    showColumnSelector,
    onFilterToggle,
    onSelectAllFilters,
    onClearAllFilters,
    onSearchChange,
    onSort,
    onColumnToggle,
    onEventSelect,
    setShowFilterDropdown,
    setShowColumnSelector,
  } = props;

  // Get all available columns
  const allColumns = useMemo(() => {
    const columnSet = new Set<string>();
    filteredEvents.forEach(event => {
      Object.keys(event).forEach(key => {
        if (!key.startsWith('_') && key !== 'lane') {
          columnSet.add(key);
        }
      });
    });
    return Array.from(columnSet).sort();
  }, [filteredEvents]);

  // Sort table data
  const sortedData = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const aVal = a[sortColumn as keyof PerformanceEntry];
      const bVal = b[sortColumn as keyof PerformanceEntry];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredEvents, sortColumn, sortDirection]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
      {/* Table Controls */}
      <div style={{
        padding: '15px 20px',
        backgroundColor: '#252525',
        borderBottom: '1px solid #333',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <input
          type="text"
          value={tableSearchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search events..."
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #444',
            backgroundColor: '#333',
            color: '#fff',
            fontSize: '14px',
            minWidth: '200px',
          }}
        />

        {/* Filter Dropdown */}
        <div className="table-filter-dropdown-container" style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #444',
              backgroundColor: '#333',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Filter: {tableFilters.has('all') ? 'All' : `${tableFilters.size} types`}
          </button>
          
          {showFilterDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: '#333',
              border: '1px solid #444',
              borderRadius: '6px',
              padding: '8px',
              zIndex: 1000,
              minWidth: '200px',
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
                  backgroundColor: tableFilters.has('all') ? '#444' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={tableFilters.has('all')}
                  onChange={() => onFilterToggle('all')}
                  style={{ cursor: 'pointer' }}
                />
                <span>All ({processedEventsCount})</span>
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
                    backgroundColor: tableFilters.has(type) ? '#444' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={tableFilters.has(type)}
                    onChange={() => onFilterToggle(type)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{type} ({count})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: '14px', fontWeight: '500', color: '#888' }}>
          Showing {sortedData.length} events
        </div>
        
        {/* Column Selector */}
        <div className="column-selector-container" style={{ position: 'relative', marginLeft: 'auto' }}>
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #444',
              backgroundColor: '#333',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Columns ({visibleColumns.size})
          </button>
          
          {showColumnSelector && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              backgroundColor: '#333',
              border: '1px solid #444',
              borderRadius: '6px',
              padding: '8px',
              zIndex: 1000,
              minWidth: '200px',
              maxHeight: '400px',
              overflow: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}>
              {allColumns.map(column => (
                <label
                  key={column}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: visibleColumns.has(column) ? '#444' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleColumns.has(column)}
                    onChange={() => onColumnToggle(column)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{column}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px',
        }}>
          <thead style={{
            position: 'sticky',
            top: 0,
            backgroundColor: '#252525',
            zIndex: 10,
          }}>
            <tr>
              {Array.from(visibleColumns).map(column => (
                <th
                  key={column}
                  onClick={() => onSort(column)}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    color: '#fff',
                    borderBottom: '2px solid #333',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {column}
                    {sortColumn === column && (
                      <span style={{ fontSize: '10px' }}>
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((event, index) => (
              <tr
                key={index}
                onClick={() => onEventSelect(event)}
                style={{
                  backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#1e1e1e',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
              >
                {Array.from(visibleColumns).map(column => {
                  const value = event[column as keyof PerformanceEntry];
                  let displayValue = '';
                  
                  if (value === undefined || value === null) {
                    displayValue = '-';
                  } else if (column === 'startTime' || column === 'duration') {
                    displayValue = formatTime(value as number);
                  } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value);
                  } else {
                    if (column === 'name' && event.entryType === 'resource') {
                      displayValue = getDisplayResourceName(String(value), siteModels?.publicModel?.externalBaseUrl);
                    } else {
                      displayValue = String(value);
                    }
                  }
                  
                  return (
                    <td
                      key={column}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #2a2a2a',
                        color: '#ccc',
                        maxWidth: '400px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={displayValue}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

