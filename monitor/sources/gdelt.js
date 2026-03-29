/**
 * GDELT DOC 2.0 API — Global Database of Events, Language, and Tone
 * Real-time global news monitoring updated every 15 minutes.
 *
 * We query for nuclear/military threat keywords and analyze:
 * - Article volume (spike = increased tension)
 * - Average tone (negative = concerning)
 * - Source diversity (many sources = real story, not noise)
 *
 * No API key required. Free.
 * Docs: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
 */

const GDELT_DOC_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

// Query sets — each represents a threat dimension
const QUERIES = [
  {
    id: 'nuclear_threat',
    label: 'Nuclear Threat',
    query: '("nuclear war" OR "nuclear strike" OR "nuclear attack" OR "ICBM launch" OR "nuclear escalation")',
    timespan: '7d',
  },
  {
    id: 'military_escalation',
    label: 'Military Escalation',
    query: '("military mobilization" OR "DEFCON" OR "strategic command" OR "nuclear readiness" OR "nuclear submarine")',
    timespan: '7d',
  },
  {
    id: 'civil_unrest_us',
    label: 'US Civil Unrest',
    query: '("civil unrest" OR "martial law" OR "national guard deployed" OR "state of emergency")',
    timespan: '7d',
  },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function fetchGDELT() {
  try {
    // Run queries SEQUENTIALLY with 6-second delays — GDELT rate-limits to 1 req per 5 seconds
    const queryResults = {};
    const errors = [];

    for (let i = 0; i < QUERIES.length; i++) {
      const q = QUERIES[i];
      if (i > 0) await sleep(12000); // Wait 12s between requests (GDELT rate limit is strict)
      try {
        queryResults[q.id] = await fetchGDELTQuery(q);
      } catch (err) {
        errors.push(`${q.id}: ${err.message}`);
        queryResults[q.id] = { articleCount: 0, articles: [], tone: 0 };
      }
    }

    // Compile summary
    const nuclearArticleCount = queryResults.nuclear_threat?.articleCount || 0;
    const militaryArticleCount = queryResults.military_escalation?.articleCount || 0;
    const unrestArticleCount = queryResults.civil_unrest_us?.articleCount || 0;

    // Average tone across nuclear/military (negative = bad)
    const tones = [queryResults.nuclear_threat?.tone, queryResults.military_escalation?.tone]
      .filter(t => t !== undefined && t !== 0);
    const avgTone = tones.length > 0 ? tones.reduce((a, b) => a + b, 0) / tones.length : 0;

    // Combine top articles from each query for LLM context
    const topArticles = [];
    for (const q of QUERIES) {
      const articles = queryResults[q.id]?.articles || [];
      articles.slice(0, 5).forEach(a => {
        topArticles.push({ ...a, queryCategory: q.label });
      });
    }

    return {
      nuclear: {
        articleCount: nuclearArticleCount,
        articles: queryResults.nuclear_threat?.articles?.slice(0, 5) || [],
        tone: queryResults.nuclear_threat?.tone || 0,
      },
      military: {
        articleCount: militaryArticleCount,
        articles: queryResults.military_escalation?.articles?.slice(0, 5) || [],
        tone: queryResults.military_escalation?.tone || 0,
      },
      unrest: {
        articleCount: unrestArticleCount,
        articles: queryResults.civil_unrest_us?.articles?.slice(0, 5) || [],
        tone: queryResults.civil_unrest_us?.tone || 0,
      },
      totalArticleCount: nuclearArticleCount + militaryArticleCount + unrestArticleCount,
      avgNuclearMilitaryTone: Math.round(avgTone * 100) / 100,
      topArticles: topArticles.slice(0, 15),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      error: error.message,
    };
  }
}

async function fetchGDELTQuery(queryDef) {
  // GDELT DOC 2.0 API — returns article list with tone data
  const params = new URLSearchParams({
    query: queryDef.query,
    mode: 'ArtList',
    maxrecords: '20',
    timespan: queryDef.timespan,
    format: 'json',
    sort: 'DateDesc',
  });

  const url = `${GDELT_DOC_URL}?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });

  if (!res.ok) {
    throw new Error(`GDELT returned ${res.status}`);
  }

  // GDELT returns plain text errors (rate limits, bad queries) instead of JSON
  const text = await res.text();
  if (text.startsWith('Please limit') || text.startsWith('Queries containing')) {
    throw new Error(`GDELT rate limit or query error: ${text.slice(0, 100)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`GDELT returned non-JSON: ${text.slice(0, 100)}`);
  }
  const articles = (data.articles || []).map(a => ({
    title: a.title?.slice(0, 150),
    url: a.url,
    source: a.domain || a.sourcecountry,
    seendate: a.seendate,
    tone: a.tone ? parseFloat(a.tone) : 0,
    language: a.language,
  }));

  // Average tone (GDELT tone: negative = negative sentiment)
  const tones = articles.map(a => a.tone).filter(t => !isNaN(t));
  const avgTone = tones.length > 0 ? tones.reduce((a, b) => a + b, 0) / tones.length : 0;

  return {
    articleCount: articles.length,
    articles,
    tone: Math.round(avgTone * 100) / 100,
  };
}
