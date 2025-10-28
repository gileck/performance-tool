import { useEffect, useState } from "react";
import { PerformanceToolPage } from "./PerformanceToolPage";
import hardcodedData from "../../performanceData.json";

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
  const [data, setData] = useState<any>(hardcodedData);
  const [dataSource, setDataSource] = useState<null | 'fresh' | 'local'>('fresh');
  
  // Hardcoded data mode - using performanceData.json directly
  useEffect(() => {
    console.log('Using hardcoded performance data from performanceData.json');
    setData(hardcodedData);
    setDataSource('fresh');
  }, []);

  return { data, dataSource };
}

export default function Home() {

  const { data, dataSource } = usePerformanceData();
  if (!data) return <div>Loading...</div>;

  return (
    <div>
      {dataSource && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: dataSource === 'fresh' ? '#123d2a' : '#4a350f',
            color: dataSource === 'fresh' ? '#9FE6A0' : '#FFD27D',
            borderBottom: '1px solid #333'
          }}
        >
          {dataSource === 'fresh' ? 'Using fresh performance data' : 'Using cached performance data from local storage'}
        </div>
      )}
      <PerformanceToolPage data={data} />
    </div>
  );
}
