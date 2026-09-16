// api/zenex.js
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ZENEX_API_KEY = 'ZNX_5N3NLP36B6TNR6OGHKOX2JML';
  const ZENEX_BASE = 'https://api.zenexnetwork.com';

  try {
    const action = req.query.action;
    let targetUrl = '';
    let fetchOptions = {
      headers: {
        'mapikey': ZENEX_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    // Routing based on action
    if (action === 'getnum') {
      targetUrl = `${ZENEX_BASE}/v1/getnum`;
      fetchOptions.method = 'POST';
      fetchOptions.body = JSON.stringify(req.body);
    } 
    else if (action === 'numsuccess') {
      targetUrl = `${ZENEX_BASE}/v1/numsuccess/info`;
      fetchOptions.method = 'GET';
    } 
    else if (action === 'broadcast') {
      targetUrl = `https://www.zenexnetwork.com/api/v1/global-broadcast`;
      fetchOptions.method = 'GET';
    } 
    else {
      return res.status(400).json({ error: 'Invalid action parameter' });
    }

    // Call Zenex API from the server
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
