import type { PerformanceData } from '../../types/performance';

interface PerformanceHeaderProps {
  data: PerformanceData;
  onCopyData: () => void;
  onPrintConsole: () => void;
  onOpenSettings: () => void;
}

export function PerformanceHeader({
  data,
  onCopyData,
  onPrintConsole,
  onOpenSettings,
}: PerformanceHeaderProps) {
  return (
    <div>
      <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>
        Performance Timeline Analyzer
      </h1>
      {data.siteModels?.publicModel?.externalBaseUrl && (
        <div style={{
          marginBottom: '15px',
          fontSize: '14px',
          color: '#aaa',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontWeight: '500' }}>Site:</span>
          <a 
            href={data.siteModels.publicModel.externalBaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#4ECDC4',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            {data.siteModels.publicModel.externalBaseUrl}
          </a>
        </div>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <button
          onClick={onCopyData}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #444',
            backgroundColor: '#333',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Copy all raw data to clipboard"
        >
          📋 Copy Data
        </button>
        <button
          onClick={onPrintConsole}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #444',
            backgroundColor: '#333',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Print data to browser console"
        >
          🖨️ Console
        </button>
        <button
          onClick={onOpenSettings}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #444',
            backgroundColor: '#333',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
          title="Open settings"
        >
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
}

