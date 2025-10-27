import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const PerformanceToolPageClient = dynamic(() => import('./PerformanceToolPage'), {
  ssr: false,
});

async function fetchSiteModels(siteUrl: string) {
  try {
    const response = await fetch('/api/fetchSiteModels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ siteUrl }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.siteModels;
  } catch (error) {
    console.error('Error fetching site models:', error);
    return null;
  }
}

function usePerformanceData() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.data?.type === 'performanceData') {
        let enrichedData = event.data;
        const existingSiteUrl = enrichedData.siteModels?.publicModel?.externalBaseUrl;
        const incomingSiteUrl = enrichedData.siteUrl;

        if (!enrichedData.siteModels && (existingSiteUrl || incomingSiteUrl)) {
          const siteUrl = existingSiteUrl || incomingSiteUrl;
          const siteModels = await fetchSiteModels(siteUrl);
          if (siteModels) {
            enrichedData = { ...enrichedData, siteModels };
          }
        }
        setData(enrichedData);
      }
    };
    window.addEventListener('message', handler as any);
    window.opener?.postMessage('opened', '*');
    return () => window.removeEventListener('message', handler as any);
  }, []);

  return data;
}

export default function PerformanceAnalyzerClient() {
  const data = usePerformanceData();
  if (!data) return <div>Loading...</div>;
  return <PerformanceToolPageClient data={data} />;
}


