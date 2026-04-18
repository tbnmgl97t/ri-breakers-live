/**
 * /api/cost-records
 *
 * Stores manually-entered historical cost records for days where the
 * JW channels have already been destroyed.
 *
 * Each record: { id, date, label, channel_count, start_time, end_time }
 * Hours and costs are computed from start_time/end_time × channel_count.
 *
 * GET    — public; returns all records
 * POST   — auth; create  body: { date, label, channel_count, start_time, end_time }
 * PUT    — auth; update  body: { id, ...fields }
 * DELETE — auth; delete  body: { id }
 */

import { verifyToken } from './_utils/auth.js'

const EC_ID        = process.env.EDGE_CONFIG_ID
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN

// Pre-seeded defaults for Apr 16 & 17 (2 feeds each, times from the schedule)
const DEFAULT_RECORDS = [
  { id: 1, date: '2026-04-16', label: 'Pro/Am', channel_count: 2, start_time: '8:00 AM', end_time: '3:00 PM' },
  { id: 2, date: '2026-04-17', label: 'Day 1',  channel_count: 2, start_time: '8:00 AM', end_time: '5:00 PM' },
]

function parseHours(start_time, end_time) {
  function toH(t) {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
    if (!m) return 0
    let h = parseInt(m[1])
    const ap = m[3]?.toUpperCase()
    if (ap === 'PM' && h !== 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    return h + parseInt(m[2]) / 60
  }
  return Math.max(0, toH(end_time) - toH(start_time))
}

async function readRecords() {
  if (!EC_ID || !VERCEL_TOKEN) return JSON.parse(JSON.stringify(DEFAULT_RECORDS))
  try {
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/cost_records`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (res.ok) {
      const item = await res.json()
      if (item.value && Array.isArray(item.value)) return item.value
    }
    // First run — persist the defaults so they show up in the admin
    await writeRecords(DEFAULT_RECORDS)
    return JSON.parse(JSON.stringify(DEFAULT_RECORDS))
  } catch (err) {
    console.error('[cost-records] read error:', err.message)
    return JSON.parse(JSON.stringify(DEFAULT_RECORDS))
  }
}

async function writeRecords(records) {
  const res = await fetch(
    `https://api.vercel.com/v1/edge-config/${EC_ID}/items`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ operation: 'upsert', key: 'cost_records', value: records }] }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Write failed: ${res.status} — ${text}`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && !verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (req.method === 'GET') {
      const records = await readRecords()
      // Attach computed hours to each record
      return res.status(200).json(records.map(r => ({
        ...r,
        hours_per_channel: parseHours(r.start_time, r.end_time),
        total_hours: parseHours(r.start_time, r.end_time) * r.channel_count,
      })))
    }

    const records = await readRecords()

    if (req.method === 'POST') {
      const { date, label, channel_count, start_time, end_time } = req.body
      if (!date || !label || !channel_count || !start_time || !end_time)
        return res.status(400).json({ error: 'date, label, channel_count, start_time, end_time are required' })
      const newId = Math.max(0, ...records.map(r => r.id)) + 1
      const created = { id: newId, date, label, channel_count: Number(channel_count), start_time, end_time }
      const updated = [...records, created].sort((a, b) => a.date.localeCompare(b.date))
      await writeRecords(updated)
      return res.status(201).json(created)
    }

    if (req.method === 'PUT') {
      const { id, date, label, channel_count, start_time, end_time } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })
      const idx = records.findIndex(r => r.id === Number(id))
      if (idx === -1) return res.status(404).json({ error: 'Record not found' })
      const updated = [...records]
      updated[idx] = {
        ...updated[idx],
        ...(date          !== undefined && { date }),
        ...(label         !== undefined && { label }),
        ...(channel_count !== undefined && { channel_count: Number(channel_count) }),
        ...(start_time    !== undefined && { start_time }),
        ...(end_time      !== undefined && { end_time }),
      }
      await writeRecords(updated)
      return res.status(200).json(updated[idx])
    }

    if (req.method === 'DELETE') {
      const { id } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })
      await writeRecords(records.filter(r => r.id !== Number(id)))
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error('[cost-records]', err)
    return res.status(500).json({ error: err.message })
  }
}
