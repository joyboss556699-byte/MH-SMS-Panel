// api/zenex.js - Vercel Serverless Function

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ZENEX_API_KEY = process.env.ZENEX_API_KEY;
  const ZENEX_BASE = process.env.ZENEX_BASE || 'https://api.zenexnetwork.com';
  const ZENEX_WEB = process.env.ZENEX_WEB || 'https://www.zenexnetwork.com';

  // Validate API Key
  if (!ZENEX_API_KEY) {
    console.error('❌ ZENEX_API_KEY not configured');
    return res.status(500).json({
      error: 'API configuration missing',
      message: 'ZENEX_API_KEY not set in environment variables'
    });
  }

  const { action } = req.query;

  try {
    let targetUrl = '';
    let fetchOptions = {
      method: 'GET',
      headers: {
        'mapkey': ZENEX_API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'MH-SMS-Panel/1.0'
      },
      timeout: 10000
    };

    console.log(`📡 Zenex API Request: action=${action}`);

    // Route handling
    switch (action) {
      case 'getnum':
        targetUrl = `${ZENEX_BASE}/v1/getnum`;
        fetchOptions.method = 'POST';
        fetchOptions.body = JSON.stringify(req.body || {});
        break;

      case 'numsuccess':
        targetUrl = `${ZENEX_BASE}/v1/numsuccess/info`;
        break;

      case 'active-ranges':
        targetUrl = `${ZENEX_BASE}/v1/active-ranges`;
        break;

      case 'global-broadcast':
        targetUrl = `${ZENEX_WEB}/api/v1/global-broadcast`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: `Unknown action: ${action}. Valid actions: getnum, numsuccess, active-ranges, global-broadcast`
        });
    }

    console.log(`🔗 Fetching: ${targetUrl}`);

    // Fetch from Zenex API
    const response = await fetch(targetUrl, fetchOptions);

    console.log(`📊 Response status: ${response.status}`);

    // Check response content type
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, try to parse as text
      const text = await response.text();
      console.warn(`⚠️ Non-JSON response: ${text.substring(0, 100)}`);
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(502).json({
          success: false,
          error: 'Invalid response format',
          message: 'Zenex API returned non-JSON response',
          status: response.status,
          details: text.substring(0, 200)
        });
      }
    }

    // Check if response is successful
    if (!response.ok) {
      console.error(`❌ API Error: ${JSON.stringify(data)}`);
      return res.status(response.status).json({
        success: false,
        error: data.error || 'API request failed',
        message: data.message || `HTTP ${response.status}`,
        data: data
      });
    }

    // Return successful response
    console.log(`✅ Success: ${action}`);
    return res.status(200).json({
      success: true,
      meta: { code: 200 },
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`🔥 Error in zenex handler:`, error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      action: action,
      timestamp: new Date().toISOString()
    });
  }
}
