import { useMemo } from 'react';
import type { PerformanceEntry } from '../../../types/performance';
import { formatTime } from '../../../utils/formatters';

interface LCPTimelinePanelProps {
  processedEvents: PerformanceEntry[];
}

export function LCPTimelinePanel({ processedEvents }: LCPTimelinePanelProps) {
  // Extract key milestones
  const milestones = useMemo(() => {
    let ttfb: number | null = null;
    let fcp: number | null = null;
    let lcp: number | null = null;

    processedEvents.forEach(event => {
      if (event.entryType === 'ttfb') {
        ttfb = event.startTime;
      } else if (event.entryType === 'paint' && event.name === 'first-contentful-paint') {
        fcp = event.startTime;
      } else if (event.entryType === 'largest-contentful-paint') {
        lcp = event.startTime;
      }
    });

    return { ttfb, fcp, lcp };
  }, [processedEvents]);

  const { ttfb, fcp, lcp } = milestones;

  // Calculate durations
  const ttfbDuration = ttfb ?? 0;
  const ttfbToFcpDuration = ttfb !== null && fcp !== null ? fcp - ttfb : null;
  const fcpToLcpDuration = fcp !== null && lcp !== null ? lcp - fcp : null;

  // Calculate percentages for visual representation
  const maxTime = lcp || fcp || ttfb || 1;
  const ttfbPercent = ttfb !== null ? (ttfb / maxTime) * 100 : 0;
  const ttfbToFcpPercent = ttfbToFcpDuration !== null ? (ttfbToFcpDuration / maxTime) * 100 : 0;
  const fcpToLcpPercent = fcpToLcpDuration !== null ? (fcpToLcpDuration / maxTime) * 100 : 0;

  const hasData = ttfb !== null || fcp !== null || lcp !== null;

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '8px',
      padding: '24px',
      border: '1px solid #333',
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '16px',
        color: '#4ECDC4',
      }}>
        LCP Timeline Breakdown
      </h3>

      {!hasData ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#888',
        }}>
          No performance metrics available
        </div>
      ) : (
        <>
          {/* Visual Timeline Bar */}
          <div style={{
            marginBottom: '32px',
            backgroundColor: '#0a0a0a',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{
              display: 'flex',
              height: '60px',
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* TTFB segment */}
              {ttfb !== null && (
                <div style={{
                  width: `${ttfbPercent}%`,
                  backgroundColor: '#5CC8FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#000',
                  minWidth: '60px',
                }}>
                  TTFB
                </div>
              )}

              {/* TTFB to FCP segment */}
              {ttfbToFcpDuration !== null && ttfbToFcpDuration > 0 && (
                <div style={{
                  width: `${ttfbToFcpPercent}%`,
                  backgroundColor: '#F38181',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#000',
                  minWidth: '60px',
                }}>
                  FCP
                </div>
              )}

              {/* FCP to LCP segment */}
              {fcpToLcpDuration !== null && fcpToLcpDuration > 0 && (
                <div style={{
                  width: `${fcpToLcpPercent}%`,
                  backgroundColor: '#FF8C42',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#000',
                  minWidth: '60px',
                }}>
                  LCP
                </div>
              )}
            </div>

            {/* Timeline markers */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '12px',
              fontSize: '12px',
              color: '#888',
            }}>
              <span>0ms</span>
              {lcp !== null && <span>{formatTime(lcp)}</span>}
            </div>
          </div>

          {/* Total Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            {/* TTFB Metric */}
            {ttfb !== null && (
              <div style={{
                backgroundColor: '#0a0a0a',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #5CC8FF',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  TTFB
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#5CC8FF',
                  marginBottom: '4px',
                }}>
                  {formatTime(ttfb)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                }}>
                  Time to First Byte
                </div>
              </div>
            )}

            {/* Total FCP Metric */}
            {fcp !== null && (
              <div style={{
                backgroundColor: '#0a0a0a',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #F38181',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  FCP (Total)
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#F38181',
                  marginBottom: '4px',
                }}>
                  {formatTime(fcp)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                }}>
                  First Contentful Paint
                </div>
              </div>
            )}

            {/* Total LCP Metric */}
            {lcp !== null && (
              <div style={{
                backgroundColor: '#0a0a0a',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #FF8C42',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  LCP (Total)
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#FF8C42',
                  marginBottom: '4px',
                }}>
                  {formatTime(lcp)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                }}>
                  Largest Contentful Paint
                </div>
              </div>
            )}
          </div>

          {/* Breakdown Metrics */}
          <div style={{
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#aaa',
          }}>
            Timeline Breakdown
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
          }}>
            {/* TTFB Breakdown */}
            {ttfb !== null && (
              <div style={{
                backgroundColor: '#0a0a0a',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #5CC8FF',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  0ms → TTFB
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#5CC8FF',
                  marginBottom: '4px',
                }}>
                  {formatTime(ttfb)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                }}>
                  Server response time
                </div>
              </div>
            )}

            {/* TTFB to FCP Breakdown */}
            {ttfbToFcpDuration !== null && (
              <div style={{
                backgroundColor: '#0a0a0a',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #F38181',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  TTFB → FCP
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#F38181',
                  marginBottom: '4px',
                }}>
                  {formatTime(ttfbToFcpDuration)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                }}>
                  Time to render first content
                </div>
              </div>
            )}

            {/* FCP to LCP Breakdown */}
            {fcpToLcpDuration !== null && (
              <div style={{
                backgroundColor: '#0a0a0a',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: '4px solid #FF8C42',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  FCP → LCP
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#FF8C42',
                  marginBottom: '4px',
                }}>
                  {formatTime(fcpToLcpDuration)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                }}>
                  Time to largest content paint
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#0a0a0a',
            borderRadius: '8px',
            borderLeft: '4px solid #4ECDC4',
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#4ECDC4',
            }}>
              Summary
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              fontSize: '13px',
            }}>
              {ttfb !== null && (
                <div>
                  <span style={{ color: '#888' }}>TTFB: </span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{formatTime(ttfb)}</span>
                </div>
              )}
              {fcp !== null && (
                <div>
                  <span style={{ color: '#888' }}>FCP: </span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{formatTime(fcp)}</span>
                </div>
              )}
              {lcp !== null && (
                <div>
                  <span style={{ color: '#888' }}>LCP: </span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{formatTime(lcp)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

