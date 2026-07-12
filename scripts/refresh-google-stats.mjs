#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// refresh-google-stats.mjs — updates the headline Google rating + review count
// on Reviews.dc.html (and the two home files) from the live Google listing.
//
// STATUS: stub, not yet wired to a schedule. Fill in PLACE_ID + GOOGLE_API_KEY,
// then run `node scripts/refresh-google-stats.mjs`. When you're happy, drop the
// GitHub Actions workflow in (see the companion note) to run it daily.
//
// WHY ONLY THE NUMBERS: Google's Places API returns the live rating + total
// review count reliably, but only ~5 review texts (not star-filterable). The
// review WALL is therefore a hand-curated set of real 5-star reviews in
// Reviews.dc.html:allReviews(); this script never touches that list.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// 1) Get these once:
//    - GOOGLE_API_KEY: Google Cloud console → enable "Places API (New)" → create
//      an API key (restrict it to Places API). Free tier covers one place/day.
//    - PLACE_ID: https://developers.google.com/maps/documentation/places/web-service/place-id
//      Search "Translate Sports, Arctic Mall, Bariatu, Ranchi".
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const PLACE_ID = process.env.PLACE_ID || '';

async function fetchStats() {
  if (!GOOGLE_API_KEY || !PLACE_ID) {
    throw new Error('Set GOOGLE_API_KEY and PLACE_ID env vars first (see header).');
  }
  // Places API (New) — Place Details, requesting only the two cheap fields.
  const url = `https://places.googleapis.com/v1/places/${PLACE_ID}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'rating,userRatingCount',
    },
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    rating: String(data.rating ?? '').slice(0, 3),      // e.g. "4.8"
    reviewCount: String(data.userRatingCount ?? ''),    // e.g. "427"
  };
}

// Rewrites the single GOOGLE_STATS line in Reviews.dc.html, plus the mirrored
// number strings in the two home files.
function applyStats({ rating, reviewCount }) {
  const reviews = join(ROOT, 'Reviews.dc.html');
  let r = readFileSync(reviews, 'utf8');
  r = r.replace(
    /const GOOGLE_STATS = \{ rating: '[^']*', reviewCount: '[^']*' \};/,
    `const GOOGLE_STATS = { rating: '${rating}', reviewCount: '${reviewCount}' };`
  );
  writeFileSync(reviews, r);

  for (const f of ['index.html', 'Translate Sports.dc.html']) {
    const p = join(ROOT, f);
    let s = readFileSync(p, 'utf8');
    s = s.replace(/\{ value: '[\d.]+★', label: 'Google rating'/, `{ value: '${rating}★', label: 'Google rating'`);
    s = s.replace(/\{ value: '\d+', label: 'Reviews & counting'/, `{ value: '${reviewCount}', label: 'Reviews & counting'`);
    s = s.replace(/All \d+ Google reviews/g, `All ${reviewCount} Google reviews`);
    writeFileSync(p, s);
  }
  console.log(`Updated to ${rating}★ · ${reviewCount} reviews.`);
}

fetchStats().then(applyStats).catch((e) => { console.error(e.message); process.exit(1); });
