import type { PerformanceEntry } from '../../../types/performance';
import { LCPTimelinePanel } from './LCPTimelinePanel';
import { PlaceholderPanel } from './PlaceholderPanel';

interface InsightsViewProps {
  processedEvents: PerformanceEntry[];
}

export function InsightsView({ processedEvents }: InsightsViewProps) {
  return (
    <div style={{
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      backgroundColor: '#121212',
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '24px',
        color: '#fff',
      }}>
        Performance Insights
      </h2>

      {/* LCP Timeline Panel */}
      <div style={{ marginBottom: '24px' }}>
        <LCPTimelinePanel processedEvents={processedEvents} />
      </div>

      {/* Placeholder for future panels */}
      <PlaceholderPanel />
    </div>
  );
}

