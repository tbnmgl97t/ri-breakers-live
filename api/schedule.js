import { sql } from '@vercel/postgres'
import { verifyToken } from './_utils/auth.js'

const DEFAULT_EVENTS = [
  { label: 'Pro/Am', date: '2026-04-16', start_time: '8:00 AM', end_time: '3:00 PM', tz: 'EDT', camera1_url: null, camera2_url: null },
  { label: 'Day 1',  date: '2026-04-17', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera2_url: null },
  { label: 'Day 2',  date: '2026-04-18', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera2_url: null },
  { label: 'Day 3',  date: '2026-04-19', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT', camera1_url: null, camera2_url: null },
]

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schedule_events (
      id        SERIAL PRIMARY KEY,
      label     TEXT    NOT NULL,
      date      TEXT    NOT NULL,
      start_time TEXT   NOT NULL,
      end_time  TEXT    NOT NULL,
      tz        TEXT    NOT NULL DEFAULT 'EDT',
      camera1_url TEXT,
      camera2_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `
}

async function seedIfEmpty() {
  const { rows } = await sql`SELECT COUNT(*)::int AS count FROM schedule_events`
  if (rows[0].count === 0) {
    for (const ev of DEFAULT_EVENTS) {
      await sql`
        INSERT INTO schedule_events (label, date, start_time, end_time, tz, camera1_url, camera2_url)
        VALUES (${ev.label}, ${ev.date}, ${ev.start_time}, ${ev.end_time}, ${ev.tz}, ${ev.camera1_url}, ${ev.camera2_url})
      `
    }
  }
}

export default async function handler(req, res) {
  // GET is public — the main app reads it without auth
  if (req.method !== 'GET' && !verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await ensureTable()

    if (req.method === 'GET') {
      await seedIfEmpty()
      const { rows } = await sql`SELECT * FROM schedule_events ORDER BY date, start_time`
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      const { label, date, start_time, end_time, tz = 'EDT', camera1_url = null, camera2_url = null } = req.body
      if (!label || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'label, date, start_time, end_time are required' })
      }
      const { rows } = await sql`
        INSERT INTO schedule_events (label, date, start_time, end_time, tz, camera1_url, camera2_url)
        VALUES (${label}, ${date}, ${start_time}, ${end_time}, ${tz}, ${camera1_url}, ${camera2_url})
        RETURNING *
      `
      return res.status(201).json(rows[0])
    }

    if (req.method === 'PUT') {
      const { id, label, date, start_time, end_time, tz, camera1_url, camera2_url } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })
      const { rows } = await sql`
        UPDATE schedule_events
        SET label       = COALESCE(${label}, label),
            date        = COALESCE(${date}, date),
            start_time  = COALESCE(${start_time}, start_time),
            end_time    = COALESCE(${end_time}, end_time),
            tz          = COALESCE(${tz}, tz),
            camera1_url = ${camera1_url ?? null},
            camera2_url = ${camera2_url ?? null},
            updated_at  = now()
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) return res.status(404).json({ error: 'Event not found' })
      return res.status(200).json(rows[0])
    }

    if (req.method === 'DELETE') {
      const { id } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })
      await sql`DELETE FROM schedule_events WHERE id = ${id}`
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error('[schedule]', err)
    return res.status(500).json({ error: err.message })
  }
}
