// recalc.js — one-shot script to fix historical trip distances via OSRM
// Run: node recalc.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dkpjicqepexhgbrzzreo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7CXIRyhWhmsQfRfj9dDhWw_Z2efV6fx';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// Helpers (mirror the Python backend)
// ============================================================
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = x => x * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 100) / 100;
}

// Known place aliases (Nominatim has trouble with these)
const PLACE_ALIASES = {
  'proton city': 'Proton City, Tanjung Malim, Perak, Malaysia',
  'tanjong malim': 'Tanjung Malim, Perak, Malaysia',
  'kelana business centre': 'Kelana Jaya, Petaling Jaya, Selangor, Malaysia',
  'ss 16': 'SS16, Subang Jaya, Selangor, Malaysia',
  'ss16': 'SS16, Subang Jaya, Selangor, Malaysia',
  'ss 7': 'SS7, Petaling Jaya, Selangor, Malaysia',
  'ss7': 'SS7, Petaling Jaya, Selangor, Malaysia',
  'subang bestari': 'Subang Bestari, Shah Alam, Selangor, Malaysia',
  'bukit sentosa': 'Bukit Sentosa, Rawang, Selangor, Malaysia',
  'bukit beruntung': 'Bukit Beruntung, Rawang, Selangor, Malaysia',
  'batang kali': 'Batang Kali, Selangor, Malaysia',
};

function normalizeAlias(address) {
  const lower = (address || '').toLowerCase();
  for (const [key, value] of Object.entries(PLACE_ALIASES)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

async function tryGeocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MileageTracker-Recalc/1.0 (contact: yukee1992@gmail.com)' }
    });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), source: 'nominatim' };
  } catch (e) {
    console.error('   geocode error:', e.message);
    return null;
  }
}

async function geocode(address) {
  if (!address || address === 'N/A' || address.length < 3) return null;

  // Handle "GPS: 3.1234, 101.5678" style
  const gpsMatch = address.match(/GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i);
  if (gpsMatch) {
    return { lat: parseFloat(gpsMatch[1]), lon: parseFloat(gpsMatch[2]), source: 'gps-text' };
  }

  // Try 1: alias lookup for known problem places
  const alias = normalizeAlias(address);
  if (alias) {
    const r = await tryGeocode(alias);
    if (r) return { ...r, source: 'alias' };
    await sleep(1100);
  }

  // Try 2: full address + Malaysia
  let r = await tryGeocode(address + ', Malaysia');
  if (r) return r;
  await sleep(1100);

  // Try 3: first part only + Malaysia
  const firstPart = address.split(',')[0].trim();
  if (firstPart && firstPart !== address) {
    r = await tryGeocode(firstPart + ', Malaysia');
    if (r) return { ...r, source: 'partial' };
    await sleep(1100);
  }

  // Try 4: first part + Selangor (most of your data is Selangor)
  if (firstPart) {
    r = await tryGeocode(firstPart + ', Selangor, Malaysia');
    if (r) return { ...r, source: 'selangor' };
    await sleep(1100);
  }

  return null;
}

async function osrmDrivingDistance(lat1, lon1, lat2, lon2) {
  if (Math.abs(lat1 - lat2) < 0.0001 && Math.abs(lon1 - lon2) < 0.0001) return 0;

  const url = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false&alternatives=true&steps=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('   OSRM returned no route, using straight-line');
      return haversine(lat1, lon1, lat2, lon2);
    }
    const max = Math.max(...data.routes.map(r => r.distance)) / 1000;
    return Math.round(max * 100) / 100;
  } catch (e) {
    console.error('   OSRM error:', e.message);
    return haversine(lat1, lon1, lat2, lon2);
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('📥 Fetching trips...');
  const { data: trips, error } = await supabase
    .from('trip_logs')
    .select('id, trip_date, from_address, to_address, distance_km, start_lat, start_lon, end_lat, end_lon')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Fetch failed:', error);
    process.exit(1);
  }

  console.log(`✅ Found ${trips.length} trips\n`);

  const results = [];

  for (let i = 0; i < trips.length; i++) {
    const t = trips[i];
    const idx = `[${i + 1}/${trips.length}]`;

    console.log(`${idx} ${t.trip_date} | ${t.from_address} → ${t.to_address} | current: ${t.distance_km} km`);

    // Reuse stored coords if present
    let from = (t.start_lat && t.start_lon) ? { lat: Number(t.start_lat), lon: Number(t.start_lon), source: 'db' } : null;
    let to   = (t.end_lat   && t.end_lon)   ? { lat: Number(t.end_lat),   lon: Number(t.end_lon),   source: 'db' } : null;

    // Geocode if missing
    if (!from) {
      from = await geocode(t.from_address);
      if (from) console.log(`   from → ${from.lat}, ${from.lon} (${from.source})`);
      await sleep(1100);
    } else {
      console.log(`   from → reused from db`);
    }

    if (!to) {
      to = await geocode(t.to_address);
      if (to) console.log(`   to   → ${to.lat}, ${to.lon} (${to.source})`);
      await sleep(1100);
    } else {
      console.log(`   to   → reused from db`);
    }

    if (!from || !to) {
      console.log(`   ⏭️  Skipping (could not geocode)\n`);
      results.push({ ...t, newKm: null, status: 'skipped' });
      continue;
    }

    // Same point → 0
    if (Math.abs(from.lat - to.lat) < 0.0001 && Math.abs(from.lon - to.lon) < 0.0001) {
      console.log(`   📍 Same location → 0 km`);
      const { error: upErr } = await supabase
        .from('trip_logs')
        .update({ distance_km: 0, start_lat: from.lat, start_lon: from.lon, end_lat: to.lat, end_lon: to.lon })
        .eq('id', t.id);
      if (upErr) console.error('   ⚠️ Update failed:', upErr.message);
      results.push({ ...t, newKm: 0, status: 'ok' });
      console.log();
      continue;
    }

    const newKm = await osrmDrivingDistance(from.lat, from.lon, to.lat, to.lon);
    console.log(`   📏 ${t.distance_km} km → ${newKm} km`);

    const { error: upErr } = await supabase
      .from('trip_logs')
      .update({
        distance_km: newKm,
        start_lat: from.lat,
        start_lon: from.lon,
        end_lat: to.lat,
        end_lon: to.lon,
      })
      .eq('id', t.id);

    if (upErr) {
      console.error('   ⚠️ Update failed:', upErr.message);
      results.push({ ...t, newKm: null, status: 'update-failed' });
    } else {
      results.push({ ...t, newKm, status: 'ok' });
    }
    console.log();
  }

  // Summary
  console.log('════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  const updated = results.filter(r => r.status === 'ok');
  const skipped = results.filter(r => r.status === 'skipped');
  const failed  = results.filter(r => r.status === 'update-failed');

  console.log(`✅ Updated: ${updated.length}`);
  console.log(`⏭️  Skipped: ${skipped.length}`);
  console.log(`❌ Failed : ${failed.length}\n`);

  console.log('Before → After:');
  for (const r of updated) {
    const arrow = r.newKm !== null && r.newKm !== r.distance_km ? ' ← changed' : '';
    console.log(`  ${r.trip_date}  ${r.distance_km} → ${r.newKm} km${arrow}`);
  }

  if (skipped.length > 0) {
    console.log('\nSkipped trips (need manual review):');
    for (const r of skipped) {
      console.log(`  ${r.trip_date}  ${r.from_address} → ${r.to_address}`);
    }
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
