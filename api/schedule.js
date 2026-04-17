import { verifyToken } from './_utils/auth.js'

const EC_ID = process.env.EDGE_CONFIG_ID
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN

const DEFAULT_EVENTS = [
  { id: 1, label: 'Pro/Am', date: '2026-04-16', start_time: '8:00 AM', end_time: '3:00 PM', tz: 'EDT', camera1_url: null, camera2_url: null },
  { id: 2, label: 'Day 1',  date: '2026-04-17', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera2_url: null },
  { id: 3, label: 'Day 2',  date: '2026-04-18', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera2_url: null },
  { id: 4, label: 'Day 3',  date: '2026-04-19', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera2_url: null },
]

async function readSchedule() {
  if (!EC_ID || !VERCEL_TOKEN) return [...DEFAULT_EVENTS]
  try {
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/schedule`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (res.status === 404) return [...DEFAULT_EVENTS]
    if (!res.ok) throw new Error(`Read failed: ${res.status}`)
    const item = await res.json()
    return item.value ?? [...DEFAULT_EVENTS]
  } catch (err) {
    console.error('[schedule] read error:', err.message)
    return [...DEFAULT_EVENTS]
  }
}

async function writeSchedule(events) {
  const res = await fetch(
    `https://api.vercel.com/v1/edge-config/${EC_ID}/items`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ operation: 'upsert', key: 'schedule', value: events }],
      }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Write failed: ${res.status} — ${text}`)
  }
}

export default async function handler(req, res) {
  // GET is public — the main app reads schedule without auth
  if (req.method !== 'GET' && !verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (req.method === 'GET') {
      const events = await readSchedule()
      return res.status(200).json(events)
    }

    const events = await readSchedule()

    if (req.method === 'POST') {
      const { label, date, start_time, end_time, tz = 'EDT', camera1_url = null, camera2_url = null } = req.body
      if (!label || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'label, date, start_time, end_time are required' })
      }
      const newId = Math.max(0, ...events.map(e => e.id)) + 1
      const newEvent = { id: newId, label, date, start_time, end_time, tz, camera1_url, camera2_url }
      const updated = [...events, newEvent].sort((a, b) => a.date.localeCompare(b.date))
      await writeSchedule(updated)
      return res.status(201).json(newEvent)
    }

    if (req.method === 'PUT') {
      const { id, label, date, start_time, end_time, tz, camera1_url, camera2_url } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })
      const idx = events.findIndex(e => e.id === Number(id))
      if (idx === -1) return res.status(404).json({ error: 'Event not found' })
      const updated = [...events]
      updated[idx] = {
        ...updated[idx],
        ...(label !== undefined && { label }),
        ...(date !== undefined && { date }),
        ...(start_time !== undefined && { start_time }),
        ...(end_time !== undefined && { end_time }),
        ...(tz !== undefined && { tz }),
        camera1_url: camera1_url ?? null,
        camera2_url: camera2_url ?? null,
      }
      await writeSchedule(updated)
      return res.status(200).json(updated[idx])
    }

    if (req.method === 'DELETE') {
      const { id } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })
      const updated = events.filter(e => e.id !== Number(id))
      await writeSchedule(updated)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error('[schedule]', err)
    return res.status(500).json({ error: err.message })
  }
}
