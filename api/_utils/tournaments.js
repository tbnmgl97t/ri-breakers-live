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

  try {
    // 1. Try the tournaments key
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/tournaments`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (res.ok) {
      const item = await res.json()
      if (item.value && Array.isArray(item.value)) return item.value
    }

    // 2. Migration path: wrap legacy schedule rows in a single tournament
    const legacyRes = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/schedule`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (legacyRes.ok) {
      const legacyItem = await legacyRes.json()
      if (legacyItem.value && Array.isArray(legacyItem.value) && legacyItem.value.length > 0) {
        const migrated = [{
          id: 1,
          name: 'Key West Classic',
          location: 'Key West, FL',
          days: legacyItem.value,
        }]
        await writeTournaments(migrated)
        console.log('[tournaments] migrated legacy schedule → tournaments')
        return migrated
      }
    }

    return JSON.parse(JSON.stringify(DEFAULT_TOURNAMENTS))
  } catch (err) {
    console.error('[tournaments] read error:', err.message)
    return JSON.parse(JSON.stringify(DEFAULT_TOURNAMENTS))
  }
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
