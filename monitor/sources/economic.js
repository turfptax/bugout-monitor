/**
 * Economic / Supply Chain indicators from FRED (Federal Reserve Economic Data).
 * Maps to Diamond Factor 4: Loss of Trading Partners (supply chain/economic stress)
 * and Factor 5: Society's Response (consumer sentiment, institutional trust)
 *
 * Uses FRED CSV graph downloads — no API key required.
 */

const FRED_CSV_BASE = 'https://fred.stlouisfed.org/graph/fredgraph.csv';

// Series we want to fetch
const SERIES = {
  foodCPI:            { id: 'CPIUFDSL',       name: 'CPI Food (Seasonally Adj)',   unit: 'Index' },
  consumerSentiment:  { id: 'UMCSENT',        name: 'Consumer Sentiment (UMich)',  unit: 'Index' },
  unemployment:       { id: 'UNRATE',         name: 'Unemployment Rate',           unit: '%' },
  foodPriceIndex:     { id: 'PFOODINDEXM',    name: 'IMF Food Price Index',        unit: 'Index' },
  wheatPrice:         { id: 'PWHEAMTUSDM',    name: 'Wheat Price',                 unit: 'USD/MT' },
  cornPrice:          { id: 'PMAIZMTUSDM',    name: 'Corn Price',                  unit: 'USD/MT' },
  inflationExpect:    { id: 'T5YIE',          name: '5-Year Breakeven Inflation',  unit: '%' },
};

export async function fetchEconomic() {
  try {
    // Fetch last 12 months to calculate trends
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const cosd = startDate.toISOString().split('T')[0];

    const results = {};
    const errors = [];

    // Fetch all series in parallel
    const entries = Object.entries(SERIES);
    const fetches = entries.map(async ([key, series]) => {
      try {
        const url = `${FRED_CSV_BASE}?id=${series.id}&cosd=${cosd}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const text = await resp.text();
        const rows = parseCSV(text);

        if (rows.length === 0) {
          results[key] = { name: series.name, unit: series.unit, value: null, available: false };
          return;
        }

        const latest = rows[rows.length - 1];
        const latestValue = parseFloat(latest.value);

        // Calculate YoY change if we have enough data
        let yoyChange = null;
        let yoyPct = null;
        if (rows.length >= 2) {
          // Find value from ~12 months ago
          const yearAgoDate = new Date();
          yearAgoDate.setFullYear(yearAgoDate.getFullYear() - 1);
          const yearAgoRow = rows.find(r => new Date(r.date) >= yearAgoDate) || rows[0];
          const yearAgoValue = parseFloat(yearAgoRow.value);
          if (yearAgoValue > 0) {
            yoyChange = latestValue - yearAgoValue;
            yoyPct = ((latestValue - yearAgoValue) / yearAgoValue * 100);
          }
        }

        // 3-month trend
        let trend = 'stable';
        if (rows.length >= 4) {
          const recent3 = rows.slice(-3);
          const first = parseFloat(recent3[0].value);
          const last = parseFloat(recent3[recent3.length - 1].value);
          const pctChange = ((last - first) / first) * 100;
          if (pctChange > 2) trend = 'rising';
          else if (pctChange < -2) trend = 'falling';
        }

        results[key] = {
          name: series.name,
          unit: series.unit,
          value: Math.round(latestValue * 100) / 100,
          date: latest.date,
          yoyChange: yoyChange !== null ? Math.round(yoyChange * 100) / 100 : null,
          yoyPct: yoyPct !== null ? Math.round(yoyPct * 10) / 10 : null,
          trend,
          available: true,
        };
      } catch (err) {
        errors.push(`${series.name}: ${err.message}`);
        results[key] = { name: series.name, unit: series.unit, value: null, available: false };
      }
    });

    await Promise.all(fetches);

    // Compute composite supply chain stress score (0-100)
    let stressScore = 0;
    let stressFactors = 0;

    // Food price inflation contributes to stress
    if (results.foodCPI?.available && results.foodCPI.yoyPct !== null) {
      const foodInflation = results.foodCPI.yoyPct;
      if (foodInflation > 10) stressScore += 40;
      else if (foodInflation > 5) stressScore += 25;
      else if (foodInflation > 3) stressScore += 10;
      stressFactors++;
    }

    // Low consumer sentiment = stress
    if (results.consumerSentiment?.available) {
      const sentiment = results.consumerSentiment.value;
      if (sentiment < 50) stressScore += 35;
      else if (sentiment < 60) stressScore += 20;
      else if (sentiment < 70) stressScore += 10;
      stressFactors++;
    }

    // High unemployment = stress
    if (results.unemployment?.available) {
      const unemp = results.unemployment.value;
      if (unemp > 8) stressScore += 35;
      else if (unemp > 6) stressScore += 20;
      else if (unemp > 5) stressScore += 10;
      stressFactors++;
    }

    // High inflation expectations = stress
    if (results.inflationExpect?.available) {
      const ie = results.inflationExpect.value;
      if (ie > 4) stressScore += 30;
      else if (ie > 3) stressScore += 15;
      stressFactors++;
    }

    const normalizedStress = stressFactors > 0 ? Math.round(stressScore / stressFactors * 2.5) : 0;

    return {
      indicators: results,
      stressScore: Math.min(100, normalizedStress),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return { status: 'UNAVAILABLE', error: error.message };
  }
}

/**
 * Parse FRED CSV format: DATE,SERIES_ID\n2025-01-01,335.4\n...
 */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1)
    .map(line => {
      const [date, value] = line.split(',');
      if (!date || !value || value === '.') return null;
      return { date: date.trim(), value: value.trim() };
    })
    .filter(Boolean);
}
