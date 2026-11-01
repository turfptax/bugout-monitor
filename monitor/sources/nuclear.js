/**
 * Nuclear threat assessment data from RSS feeds.
 * Fetches headlines from arms control and nuclear policy organizations,
 * then provides them to the LLM for threat analysis.
 *
 * Doomsday Clock value is hardcoded (updated once per year in January).
 */

import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'BugoutThreatMonitor/1.0',
  },
});

// RSS feed sources for nuclear/geopolitical threat news
const FEEDS = [
  {
    name: 'Arms Control Association',
    url: 'https://www.armscontrol.org/taxonomy/term/12/feed',
  },
  {
    name: 'IAEA News',
    // The old /feeds/topnews.xml path returns 404; the live feed has no extension.
    url: 'https://www.iaea.org/feeds/topnews',
  },
];

// Updated annually — check https://thebulletin.org/doomsday-clock/
// Last update: January 27, 2026
const DOOMSDAY_CLOCK = {
  value: '85 seconds to midnight',
  lastUpdated: '2026-01-27',
};

const HOURS_48 = 48 * 60 * 60 * 1000;

/**
 * Parse an RSS item date into a Date, or null when it cannot be read.
 * rss-parser fills isoDate whenever it understands pubDate. The IAEA feed
 * uses a bare "YY-MM-DD  HH:mm" (Vienna time) that Date() rejects, so that
 * shape is rebuilt as ISO 8601 first. Treating it as UTC+1 year round is at
 * most an hour off, which does not matter for a 48 hour window.
 */
function parseFeedDate(item) {
  if (item.isoDate) return new Date(item.isoDate);
  const raw = String(item.pubDate || '').trim();
  if (!raw) return null;
  const compact = raw.match(/^([0-9]{2})-([0-9]{2})-([0-9]{2}) +([0-9]{2}):([0-9]{2})$/);
  if (compact) {
    const [, yy, mm, dd, hh, min] = compact;
    return new Date(`20${yy}-${mm}-${dd}T${hh}:${min}:00+01:00`);
  }
  const parsed = new Date(raw);
  return isNaN(parsed) ? null : parsed;
}

export async function fetchNuclear() {
  try {
    const cutoff = new Date(Date.now() - HOURS_48);
    const allHeadlines = [];
    const errors = [];

    // Fetch all feeds in parallel
    const results = await Promise.allSettled(
      FEEDS.map(async (feed) => {
        try {
          const parsed = await parser.parseURL(feed.url);
          return {
            source: feed.name,
            items: (parsed.items || []).map(item => ({
              title: item.title?.trim(),
              link: item.link,
              source: feed.name,
              date: item.pubDate || item.isoDate,
              parsedDate: parseFeedDate(item),
            })),
          };
        } catch (err) {
          errors.push(`${feed.name}: ${err.message}`);
          return { source: feed.name, items: [] };
        }
      })
    );

    // Collect all items from settled results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allHeadlines.push(...result.value.items);
      }
    }

    // Filter to last 48 hours and sort by date (newest first)
    const recentHeadlines = allHeadlines
      .filter(h => h.parsedDate && h.parsedDate >= cutoff && !isNaN(h.parsedDate))
      .sort((a, b) => b.parsedDate - a.parsedDate)
      .slice(0, 20) // Cap at 20 headlines to keep LLM prompt manageable
      .map(h => ({
        title: h.title,
        link: h.link,
        source: h.source,
        date: h.parsedDate.toISOString(),
      }));

    // If no recent headlines, also grab the 5 most recent regardless of age
    // so the LLM has some context
    let fallbackHeadlines = [];
    if (recentHeadlines.length === 0) {
      fallbackHeadlines = allHeadlines
        .filter(h => h.parsedDate && !isNaN(h.parsedDate))
        .sort((a, b) => b.parsedDate - a.parsedDate)
        .slice(0, 5)
        .map(h => ({
          title: h.title,
          link: h.link,
          source: h.source,
          date: h.parsedDate.toISOString(),
          note: 'older than 48h — included for context',
        }));
    }

    return {
      headlines: recentHeadlines.length > 0 ? recentHeadlines : fallbackHeadlines,
      headlineCount: recentHeadlines.length,
      totalFetched: allHeadlines.length,
      doomsdayClock: DOOMSDAY_CLOCK,
      feedErrors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      status: 'UNAVAILABLE',
      error: error.message,
    };
  }
}
