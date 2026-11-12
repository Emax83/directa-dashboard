# CLAUDE.md — Progetto DIRECTA

Dashboard finanziario single-file per conto Directa SIM 75769.

## File principale

`E:\DOCUMENTI\Claude\Projects\DIRECTA\index.html` — tutto inline (HTML + CSS + JS), nessun backend, unica dipendenza Chart.js 4.4.1, servita in locale da `vendor/chart.umd.min.js` (nessuna CDN).

---

## Formato CSV Directa

- Encoding: UTF-8 con BOM
- Separatore: `;`
- Decimali: virgola (`1.234,56`)
- Date: `dd-mm-yyyy`
- 9 righe di intestazione da saltare (metadati account)
- Colonne rilevanti: Data, ISIN, Ticker, Descrizione, Tipo movimento, Quantità, Prezzo, Importo, Commissioni, Tasse, Saldo

### Categorie movimenti (`r.cat`)
| cat | significato |
|-----|-------------|
| `BUY` | acquisto |
| `SELL` | vendita |
| `DIVIDEND` | dividendo azione |
| `ETF_INCOME` | provento ETF |
| `COUPON` | cedola certificato (reddito diverso → compensa minusvalenze) |
| `COMMISSION` | commissione |
| `TAX` | ritenuta fiscale |
| `TOBIN` | tobin tax |

---

## Struttura JS principale

### Globale `G`
```js
G = {
  rows,            // tutti i movimenti parsati
  positions,       // posizioni aperte (array)
  closedPositions, // posizioni chiuse (array)
  realized,        // totale plusvalenze/minusvalenze realizzate
  realizedByYear,  // { year: { plus, minus, net } }
  monthly,         // { 'YYYY-MM': { inc, exp } }
  yearly,          // { year: { inc, exp } }
  payers,          // { ticker: totale_reddito }
  _lastPm,         // ultimo price map usato in renderTable
}
```

### `buildPositions(rows)` → `{ open, closed, realized }`
Calcola posizioni con metodo FIFO del prezzo medio.

### `renderTable(pm)`
`pm` = price map `{ yahooSymbol: { regularMarketPrice, regularMarketChange, regularMarketChangePercent, fetchedAt } }`

### `fetchPrices(forceRefresh = false)`
- Solo HTML scraping Yahoo Finance (`data-testid="qsp-price"`)
- Sequenziale, 500ms delay tra ticker
- Cache localStorage 24h (`directa_prices_v1`)
- `forceRefresh=true` → ignora cache (usato dal pulsante ↻ Aggiorna)

---

## localStorage keys

| chiave | contenuto |
|--------|-----------|
| `directa_rows_v1` | movimenti serializzati (date come ISO string) |
| `directa_meta_v1` | `{ savedAt, maxDate, rowCount }` |
| `directa_prices_v1` | `{ yahooSym: { regularMarketPrice, regularMarketChange, regularMarketChangePercent, fetchedAt } }` |

Pulsante "Cancella dati" → svuota tutti e tre.

---

## TICKER_ALIASES
```js
const TICKER_ALIASES = {
  'USOPA': 'US',  // UnipolSai: rinominato dopo fusione
};
```
Usato ovunque: `const t = TICKER_ALIASES[r.ticker] || r.ticker`.

## TMETA — metadati ticker
```js
const TMETA = {
  BAMI:  { y:'BAMI.MI',  t:'Azione', s:'Bancari',  g:'Italia' },
  // ... tutti i ticker del portafoglio
};
```
Campi: `y` = Yahoo symbol, `t` = tipo, `s` = settore, `g` = area geografica.
Certificati hanno `y: null` (nessun prezzo live).

### Tipo strumento — rilevato da `guessType(ticker, isin, desc)`
- Ticker `P1*`, `P2*`, `BT*`, `NL*` oppure ISIN `NLBNPIT*` → `Certif.`
- Descrizione contiene keyword ETF → `ETF`
- Altrimenti → `Azione`

---

## Tabella strumenti live — 14 colonne
Ticker | Strumento | Tipo | Q.tà | Prezzo Medio | Prezzo Live | Valore (€) | Peso % | P&L (€) | P&L % | Total Return | YoC % | Barra | Data Prezzo

- **Total Return** = P&L latente + tutti i redditi storici ricevuti da quel ticker
- **YoC %** = reddito totale ricevuto / prezzo medio di carico
- **Data Prezzo** = ora (se oggi) oppure `dd/mm` (se precedente)
- Colspan separator row e total row: **14**

---

## Import CSV — 3 modalità
1. **↑ Aggiorna** (`csvFileUpdate`) — sostituisce tutto il localStorage con il nuovo CSV
2. **↑ Incrementale** (`csvFileIncremental`) — merge: mantiene righe cache precedenti al `minDate(newCSV) - 1 giorno`, appende le nuove
3. **🗑 Cancella dati** — modale di conferma → svuota localStorage

All'avvio, se localStorage ha dati → carica automaticamente senza mostrare la drop zone.

---

## Scraping Yahoo Finance

```html
<!-- struttura attesa nella pagina -->
<span data-testid="qsp-price">14.86</span>
<span data-testid="qsp-price-change">+0.16</span>
<span data-testid="qsp-price-change-percent">(+1.06%)</span>
```

Regex chiave per il change%: `/data-testid="qsp-price-change-percent"[^>]*>\s*\(?([+-]?[\d.,]+)%/`  
Le classi CSS sono instabili — usare solo `data-testid`.

CORS proxy (in ordine di tentativo):
1. `/api/proxy?url={encoded_url}` — Vercel serverless (deployed), prima scelta
2. `https://corsproxy.io/?{encoded_url}`
3. `https://api.allorigins.win/raw?url={encoded_url}`
4. `https://api.codetabs.com/v1/proxy?quest={encoded_url}`

Il proxy Vercel (`api/proxy.js`) accetta URL Yahoo Finance e `investimenti.bnpparibas.it`.

### Sicurezza del proxy (non allentare senza motivo)
Il proxy è chiamato dal browser, quindi non può contenere segreti. Le protezioni sono:
- **Solo GET**, solo `https`, host esatti (`ALLOWED_HOSTS`), nessuna userinfo/porta custom (parsing con `new URL`, non `startsWith`).
- **Origin fissa**: accetta solo richieste dirette a `directa-dashboard.vercel.app` con `Sec-Fetch-Site: same-origin` e, se presenti, `Origin`/`Referer` coincidenti. Senza segnali del browser → 403. Un GET same-origin spesso non invia `Origin`: non basarsi solo su quello.
- Override per sviluppo locale/preview: variabile d'ambiente `ALLOWED_ORIGIN` (lista separata da virgole). Senza, i deploy preview vengono rifiutati.
- **Nessun** header `Access-Control-Allow-Origin`: non riaggiungere `*`.
- Redirect seguiti a mano (max 3) e solo verso host consentiti; risposta max 2 MB; errori generici.
- Limite noto: un client non-browser può falsificare gli header. L'argine è la regola di **rate limit** nel Firewall Vercel (`/api/proxy`, 100 richieste/min per IP), da creare dal pannello (l'API MCP dava 404). Se serve autenticazione reale: chiave in `localStorage` inviata come `x-api-key`, confrontata con una env var Vercel (non implementata).
- Il file `vendor/chart.umd.min.js` è Chart.js 4.4.1 locale: non reintrodurre script da CDN (leggerebbero `localStorage`).

### Prezzi certificati BNP Paribas
URL: `https://investimenti.bnpparibas.it/product-details/{ISIN}/`
Funzione: `scrapeBNPPrice(isin)` — estrae bid e ask, calcola mid.
Chiave nel price map: ISIN (es. `NLBNPIT2EPS1`) invece del simbolo Yahoo.
In `renderTable()`: `const q = pos.yahoo ? pm[pos.yahoo] : (pos.isin ? pm[pos.isin] : null)`
In `fetchPrices()`: i certificati `liveBNP = positions.filter(p => !p.yahoo && p.isin?.startsWith('NLBNPIT'))`

Struttura HTML reale della pagina BNP:
```html
<span class=" push-field" data-field="bid"  data-item="X0000010800{ISIN}">100,16</span>
<span class=" push-field" data-field="ask"  data-item="X0000010800{ISIN}">100,16</span>
```
Formato numeri: italiano (virgola decimale, punto migliaia) → `parseIT = s => parseFloat(s.replace(/\./g,'').replace(',','.'))`
Il campo `percentChange` potrebbe non essere presente — il fallback è `null`.

---

## Fiscalità italiana (risparmio amministrato)
- Minusvalenze compensabili entro **4 anni** (FIFO per anno)
- **Cedole certificati** = redditi diversi → compensano le minusvalenze
- Formula tabella PL: `compensato = plusv + cedole; net = compensato - minusv`
- Anni scaduti o con net ≥ 0 mostrano badge "Compensato" / "Scaduto"

---

## Sezioni del dashboard (ordine nel DOM)
1. Header con KPI (valore portafoglio, P&L totale, ultimo aggiornamento)
2. Filtro anno + pulsanti import/cache
3. Tabella strumenti live (`#liveTable`)
4. Grafici dinamici (movimenti mensili, redditi annuali, composizione)
5. Calendario dividendi (`renderDivCalendar`)
6. Tabella Plusvalenze/Minusvalenze unificata con cedole e scadenze
7. Modale dettaglio ticker (`openTickerModal(ticker)`)
8. Modale conferma cancellazione dati (`openClearModal()`)
