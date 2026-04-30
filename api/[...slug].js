export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extract the backend path from the URL
  // /api/auth => backend/api/auth.php
  // /api/clientes => backend/api/clientes.php
  const slug = req.query.slug || [];
  const path = slug.join('/');
  
  // Map to backend PHP file
  const backendUrl = `https://ferreteriajamarraya.rf.gd/backend/${path}.php`;

  try {
    // Forward the request to the real backend
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Include body if present
    if (req.method !== 'GET' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const backendResponse = await fetch(backendUrl, fetchOptions);
    const data = await backendResponse.json();

    res.status(backendResponse.status).json(data);
  } catch (error) {
    console.error(`Proxy error for ${backendUrl}:`, error);
    res.status(500).json({
      error: 'Backend proxy error',
      message: error.message,
    });
  }
}
