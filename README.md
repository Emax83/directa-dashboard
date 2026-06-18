# 📊 Portafoglio analisi DIRECTA

Dashboard interattiva per l'analisi del portafoglio Directa — completamente client-side, zero backend, zero upload.

## Demo

Apri `dashboard.html` nel browser, trascina il CSV esportato da Directa e il dashboard si costruisce istantaneamente.

## Funzionalità

**Prezzi live** — Quotazioni in tempo reale via Yahoo Finance (CORS proxy). Aggiornamento manuale con il pulsante ↻.

**Capital Gain** — Tabella posizioni con costo medio ponderato, valore di mercato, P&L assoluto e percentuale per ogni strumento.

**Reddito passivo** — Grafico a barre con dividendi + proventi ETF + cedole certificati, assoluti per mese o per anno.

**KPI dinamici** — Versamenti totali, reddito lordo/netto, ritenute fiscali, costo portafoglio, valore di mercato, plus/minusvalenza, Dividend Yield annualizzato — tutti aggiornati al cambio di anno.

**Selezione anno** — Filtra tutti i grafici e le KPI per anno specifico (mensile) o "Tutto il periodo" (annuale).

**Composizione portafoglio** — 3 grafici donut: Asset Class (Azioni / ETF / Certificati), Settori, Geografia.

**Storico reddito** — Grafico mensile netto, grafico annuo per fonte (Dividendi / ETF / Cedole), torta composizione reddito lordo.

**Top payers** — Ranking azioni per dividendi, ETF per proventi, certificati per cedole.

**Costi e oneri** — Commissioni, ritenute fiscali, bollo, Tobin Tax.

**Tabella strumenti** — Con ricerca live e header fissi, scrollabile.

## Privacy

> 🔒 Nessun dato memorizzato — tutto elaborato al volo nel browser. Nessun server, nessun upload, nessuna telemetria.

## Come usare

1. Accedi a Directa → **Reportistica → Movimenti conto → Esporta CSV**
2. Apri `dashboard.html` nel browser (file locale o su GitHub Pages / Vercel)
3. Trascina il CSV nella zona di upload oppure clicca "Seleziona CSV"
4. Il dashboard si aggiorna automaticamente — ogni mese esporta un nuovo CSV e ricarica

## Deployment

Il file è self-contained (dipendenza esterna: Chart.js 4.4.1 da cdnjs). Funziona:

- In locale (apri direttamente il file nel browser)
- Su **GitHub Pages** — pubblica il repository e abilita Pages su `main / root`
- Su **Vercel** — deploy statico, zero configurazione

Le chiamate a Yahoo Finance richiedono un CORS proxy (`corsproxy.io` con fallback `allorigins.win`), che funziona correttamente da GitHub Pages e Vercel. In locale Chrome potrebbe bloccare le richieste cross-origin — usa Firefox o pubblica su web.

## Formato CSV supportato

| Campo | Valore atteso |
|---|---|
| Codifica | UTF-8 con BOM |
| Separatore | `;` (punto e virgola) |
| Decimali | `,` (virgola italiana) |
| Date | `dd-mm-yyyy` |
| Header | Riga 10 (prime 9 righe di metadati Directa) |

Tipi di operazione riconosciuti: `Acquisto`, `Vendita`, `Incasso dividendi italia`, `Provento etf`, `Coupon certif.`, `Conferimento con bonifico`, `Commissioni`, `Ritenuta *`, `Tobin tax italia`, `Bollo portafoglio titoli`, `Finanziamento urgente`, e altri.

## Struttura

```
dashboard.html   — unico file, tutto incluso
README.md        — questo file
```

## Tech stack

- HTML/CSS/JS vanilla
- [Chart.js 4.4.1](https://www.chartjs.org/) — grafici
- [Yahoo Finance API](https://finance.yahoo.com/) — prezzi live (via CORS proxy)
- FileReader API — parsing CSV client-side

## Licenza

MIT — uso libero, anche commerciale.
