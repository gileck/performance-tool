import { useEffect, useState } from "react";
import { PerformanceToolPage } from "./PerformanceToolPage";

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
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'performanceData') {
        console.log('performanceData', event.data);
        
        // If siteModels doesn't exist but we have a site URL, fetch it
        let enrichedData = event.data;
        const existingSiteUrl = enrichedData.siteModels?.publicModel?.externalBaseUrl;
        const incomingSiteUrl = enrichedData.siteUrl; // Check if siteUrl is provided in the event data
        
        // If siteModels doesn't exist and we have a URL to fetch from
        if (!enrichedData.siteModels && (existingSiteUrl || incomingSiteUrl)) {
          const siteUrl = existingSiteUrl || incomingSiteUrl;
          const siteModels = await fetchSiteModels(siteUrl);
          if (siteModels) {
            enrichedData = {
              ...enrichedData,
              siteModels,
            };
          }
        }
        
        setData(enrichedData);
      }
    });
    window.opener.postMessage('opened', '*');

  }, []);

  return data;
}

export default function Home() {

  const data = usePerformanceData();
  if (!data) return <div>Loading...</div>;

  return <PerformanceToolPage data={data} />;
}
