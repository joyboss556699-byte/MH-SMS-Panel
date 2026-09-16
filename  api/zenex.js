// api/zenex.js - Vercel Serverless Function
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mapikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ZENEX_API_KEY = 'ZNX_5N3NLP36B6TNR6OGHKOX2JML';
  const ZENEX_BASE = 'https://api.zenexnetwork.com';
  const ZENEX_WEB = 'https://www.zenexnetwork.com';

  try {
    const action = req.query.action;
    let targetUrl = '';
    let fetchOptions = {
      headers: {
        'mapikey': ZENEX_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    // Route handling
    if (action === 'getnum') {
      targetUrl = `${ZENEX_BASE}/v1/getnum`;
      fetchOptions.method = 'POST';
      fetchOptions.body = JSON.stringify(req.body);
    } 
    else if (action === 'numsuccess') {
      targetUrl = `${ZENEX_BASE}/v1/numsuccess/info`;
      fetchOptions.method = 'GET';
    } 
    else if (action === 'active-ranges') {
      targetUrl = `${ZENEX_BASE}/v1/active-ranges`;
      fetchOptions.method = 'GET';
    } 
    else if (action === 'global-broadcast') {
      targetUrl = `${ZENEX_WEB}/api/v1/global-broadcast`;
      fetchOptions.method = 'GET';
    } 
    else {
      return res.status(400).json({ 
        error: 'Invalid action',
        message: 'Use: getnum, numsuccess, active-ranges, or global-broadcast'
      });
    }

    console.log(`Proxying to: ${targetUrl}`);

    const response = await fetch(targetUrl, fetchOptions);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Zenex returned non-JSON:', text.substring(0, 200));
      return res.status(502).json({ 
        error: 'Zenex API returned HTML',
        message: 'API might be down or blocking requests',
        status: response.status
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ 
      error: error.message,
      message: 'Internal server error'
    });
  }
}
