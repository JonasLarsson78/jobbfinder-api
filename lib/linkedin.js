import fetch from "node-fetch";
import { load } from "cheerio";

// Lightweight LinkedIn search fetcher using cheerio.
// This performs a GET to the public LinkedIn jobs search URL and parses server-rendered markup.
// Best-effort: may return empty if LinkedIn blocks or requires JS.
export async function searchLinkedInByQuery({ query, location, limit = 10, timeout = 10000 }) {
  if (!query) return [];

  const keywords = encodeURIComponent(query);
  const loc = location ? `&location=${encodeURIComponent(location)}` : "";
  // Use parameters similar to working example: recent week filter (r604800), distance=0, pageNum=0
  const url = `https://www.linkedin.com/jobs/search?keywords=${keywords}${loc}&geoId=&distance=0&f_TPR=r604800&f_PP=&position=1&pageNum=0`;
  // fetching LinkedIn URL

  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": process.env.USER_AGENT ||
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
      },
      signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return [];
    }
    return [];
    return [];
  }
  clearTimeout(timeoutId);

  if (!res.ok) return [];
  const text = await res.text();
  const $ = load(text);

  // Diagnostics: count possible node types and look for common block indicators
  const listNodes = $('ul.jobs-search__results-list > li').toArray();
  const baseCards = $('.base-search-card').toArray();
  const titleFirst = $('h3.base-search-card__title').first().text().trim().slice(0, 120) || null;
  const bodyHasLogin = /sign in|log in|access your account|please sign in/i.test(text);
  // diagnostics collected: status, bodyLength, node counts, titleFirst, blockedByLogin

  const nodes = listNodes.length ? listNodes : baseCards.length ? baseCards : [];
  const items = [];

  for (const node of nodes) {
    if (items.length >= limit) break;
    const el = $(node);
    const a = el.find('a.base-card__full-link').first();
    const href = a.attr('href') || null;

    let title = el.find('h3.base-search-card__title').first().text().trim() || null;
    if (!title && a.length) {
      const sr = a.find('span.sr-only').first().text().trim();
      if (sr) title = sr;
    }

    const company = el.find('h4.base-search-card__subtitle').first().text().trim() || null;
    const locationText = el.find('span.job-search-card__location').first().text().trim() || null;
    const timeEl = el.find('time').first();
    const datetime = timeEl.attr('datetime') || null;

    // Extract numeric job ID from LinkedIn URL if possible
    let id = null;
    if (href) {
      const match = href.match(/-(\d+)(?:\?|$)/);
      if (match) {
        id = match[1];
      } else {
        id = href;
      }
    } else {
      id = `${title || ''}||${company || ''}||${locationText || ''}||${datetime || ''}`;
    }
    items.push({ id: id || null, title, company, location: locationText, datetime, url: href });
  }

  return items.slice(0, limit);
}
