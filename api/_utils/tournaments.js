/**
 * Shared helpers for reading / writing the `tournaments` Edge Config key.
 *
 * Data shape stored in Edge Config:
 *   Array<{
 *     id: number,
 *     name: string,
 *     location: string,
 *     days: Array<{
 *       id: number, label: string, date: string,
 *       start_time: string, end_time: string, tz: string,
 *       camera1_url: string|null, camera1_name: string|null,
 *       camera2_url: string|null, camera2_name: string|null
 *     }>
 *   }>
 *
 * On first read, if `tournaments` key is missing but the legacy `schedule`
 * key exists, the data is automatically migrated and saved.
 */

const EC_ID       = process.env.EDGE_CONFIG_ID
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN

export const DEFAULT_TOURNAMENTS = [
  {
    id: 1,
    name: 'Key West Classic',
    location: 'Key West, FL',
    days: [
      { id: 1, label: 'Pro/Am', date: '2026-04-16', start_time: '8:00 AM', end_time: '3:00 PM', tz: 'EDT', camera1_url: null, camera1_name: null, camera2_url: null, camera2_name: null },
      { id: 2, label: 'Day 1',  date: '2026-04-17', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera1_name: null, camera2_url: null, camera2_name: null },
      { id: 3, label: 'Day 2',  date: '2026-04-18', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera1_name: null, camera2_url: null, camera2_name: null },
      { id: 4, label: 'Day 3',  date: '2026-04-19', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera1_name: null, camera2_url: null, camera2_name: null },
    ],
  },
]

export async function readTournaments() {
  if (!EC_ID || !VERCEL_TOKEN) return JSON.parse(JSON.stringify(DEFAULT_TOURNAMENTS))

  let existing = null

  // 1. Try the tournaments key
  try {
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/tournaments`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (res.ok) {
      const item = await res.json()
      if (item.value && Array.isArray(item.value) && item.value.length > 0) {
        existing = item.value
      }
    }
  } catch (err) {
    console.error('[tournaments] read tournaments key error:', err.message)
  }

  // 2. Always check the legacy schedule key for camera assignments that
  //    may not have made it into the tournaments key yet.
  let legacyDays = null
  try {
    const legacyRes = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/schedule`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (legacyRes.ok) {
      const legacyItem = await legacyRes.json()
      if (legacyItem.value && Array.isArray(legacyItem.value) && legacyItem.value.length > 0) {
        legacyDays = legacyItem.value
      }
    }
  } catch (err) {
    console.error('[tournaments] read schedule key error:', err.message)
  }

  // 3a. tournaments key exists — check if we can enrich it from legacy data
  if (existing) {
    // If the existing tournaments key has no camera assignments but the legacy
    // schedule key does, merge in the camera assignments by matching on day id.
    const legacyCams = legacyDays?.filter(d => d.camera1_url || d.camera2_url) ?? []
    if (legacyCams.length > 0) {
      const camMap = Object.fromEntries(legacyDays.map(d => [d.id, d]))
      let enriched = false
      const merged = existing.map(t => ({
        ...t,
        days: (t.days || []).map(day => {
          const src = camMap[day.id]
          if (src && (src.camera1_url || src.camera2_url) && !day.camera1_url && !day.camera2_url) {
            enriched = true
            return { ...day, camera1_url: src.camera1_url, camera1_name: src.camera1_name, camera2_url: src.camera2_url, camera2_name: src.camera2_name }
          }
          return day
        }),
      }))
      if (enriched) {
        console.log('[tournaments] enriched from legacy schedule camera assignments')
        writeTournaments(merged).catch(err => console.error('[tournaments] enrich write failed:', err.message))
        return merged
      }
    }
    return existing
  }

  // 3b. No tournaments key — migrate from legacy schedule if available
  if (legacyDays) {
    const migrated = [{ id: 1, name: 'Key West Classic', location: 'Key West, FL', days: legacyDays }]
    console.log('[tournaments] migrating from legacy schedule key')
    // Fire-and-forget write — always return the migrated data regardless
    writeTournaments(migrated).catch(err => console.error('[tournaments] migration write failed:', err.message))
    return migrated
  }

  // 3c. Nothing in Edge Config — return hardcoded defaults
  return JSON.parse(JSON.stringify(DEFAULT_TOURNAMENTS))
}

export async function writeTournaments(tournaments) {
  const res = await fetch(
    `https://api.vercel.com/v1/edge-config/${EC_ID}/items`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ operation: 'upsert', key: 'tournaments', value: tournaments }],
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Write failed: ${res.status} — ${text}`)
  }
}
