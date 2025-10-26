// API handler to fetch site models from a given URL
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  siteModels?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { siteUrl } = req.body;

  if (!siteUrl) {
    return res.status(400).json({ error: 'siteUrl is required' });
  }

  try {
    // Append the dumpSiteModel query parameter to the URL
    const url = new URL(siteUrl);
    url.searchParams.set('dumpSiteModel', 'true');

    // Make the fetch request
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const siteModels = await response.json();
    
    return res.status(200).json({ siteModels });
  } catch (error) {
    console.error('Error fetching site models:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch site models' 
    });
  }
}

