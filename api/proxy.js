// Vercel serverless proxy for financial data scraping (uso personale).
// Allowed: Yahoo Finance + BNP Paribas Investimenti
// Usage: /api/proxy?url=https%3A%2F%2Ffinance.yahoo.com%2Fquote%2FBAMI.MI%2F
//
// Protezione: accetta solo richieste same-origin (la dashboard servita dallo
// stesso dominio). Non è autenticazione: un client non-browser può falsificare
// gli header. Per un limite reale aggiungere una regola di rate limit nel
// Firewall di Vercel su /api/proxy.

const ALLOWED_HOSTS = new Set([
  'finance.yahoo.com',
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'investimenti.bnpparibas.it',
]);

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function isSameOrigin(req) {
  const site = req.headers['sec-fetch-site'];
  if (site) return site === 'same-origin';
  // Browser senza Fetch Metadata: confronta Origin con Host.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; }
  catch (e) { return false; }
}

function parseAllowed(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  if (u.port && u.port !== '443') return null;
  return ALLOWED_HOSTS.has(u.hostname) ? u : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin, Sec-Fetch-Site');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Forbidden' });

  const { url } = req.query;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url parameter' });

  // req.query è già decodificato da Vercel; nessun secondo decodeURIComponent.
  const target = parseAllowed(url);
  if (!target) return res.status(403).json({ error: 'URL not allowed' });

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    };
    // Redirect seguiti a mano (max 3), solo verso host consentiti.
    let current = target;
    let response;
    for (let hop = 0; hop <= 3; hop++) {
      response = await fetch(current.href, { headers, redirect: 'manual', signal: AbortSignal.timeout(10000) });
      if (response.status < 300 || response.status >= 400) break;
      const loc = response.headers.get('location');
      const next = loc && parseAllowed(new URL(loc, current).href);
      if (!next || hop === 3) return res.status(502).json({ error: 'Blocked redirect' });
      current = next;
    }

    const text = await response.text();
    if (text.length > MAX_BYTES) return res.status(502).json({ error: 'Response too large' });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(response.status).send(text);
  } catch (e) {
    res.status(502).json({ error: 'Upstream error' });
  }
}
