// Vercel serverless proxy for Yahoo Finance HTML scraping.
// Usage: /api/proxy?url=https%3A%2F%2Ffinance.yahoo.com%2Fquote%2FBAMI.MI%2F
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  let decoded;
  try { decoded = decodeURIComponent(url); }
  catch(e) { return res.status(400).json({ error: 'Invalid url encoding' }); }

  // Only allow Yahoo Finance to prevent open-proxy abuse
  if (!decoded.startsWith('https://finance.yahoo.com/') &&
      !decoded.startsWith('https://query1.finance.yahoo.com/') &&
      !decoded.startsWith('https://query2.finance.yahoo.com/')) {
    return res.status(403).json({ error: 'URL not allowed' });
  }

  try {
    const response = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(10000),
    });

    const text = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(response.ok ? 200 : response.status).send(text);
  } catch(e) {
    res.status(502).json({ error: e.message });
  }
}
