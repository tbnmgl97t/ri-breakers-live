/**
 * /api/cdn-records
 *
 * Per-feed CDN usage records entered from JW analytics reports.
 * One record = one JW channel for one event day.
 *
 * Record shape:
 * {
 *   id:                number,
 *   date:              string,   // YYYY-MM-DD
 *   label:             string,   // "KWC 2026 Day 3"
 *   tournament_id:     number | null,
 *   channel_id:        string,   // JW channel ID
 *   channel_name:      string,   // "Main Deck"
 *   stream_hours:      number,   // how long the feed actually ran
 *   minutes_delivered: number,   // total viewer-minutes from JW analytics
 * }
 *
 * Cost formula (using pricing config):
 *   gb_delivered  = minutes_delivered / 50 * gb_per_50_min
 *   cost_cdn      = gb_delivered * cdn_rate_per_gb
 *   cost_feed     = stream_hours * feed_rate_per_hr
 *   cost_total    = cost_feed + cost_cdn
 *
 * GET    — public; returns all records with computed costs attached
 * POST   — TD auth; create  body: { date, label, tournament_id?, channel_id, channel_name, stream_hours, minutes_delivered }
 * PUT    — TD auth; update  body: { id, ...fields }
 * DELETE — TD auth; delete  body: { id }
 */

import { verifyTdToken } from './td-auth.js'
import { readPricing }   from './pricing.js'

const EC_ID        = process.env.EDGE_CONFIG_ID
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN

const REQUIRED_FIELDS = ['date', 'label', 'channel_id', 'channel_name', 'stream_hours', 'minutes_delivered']

async function readRecords() {
  if (!EC_ID || !VERCEL_TOKEN) return []
  try {
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/cdn_records`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (res.ok) {
      const item = await res.json()
      if (item?.value && Array.isArray(item.value)) return item.value
    }
  } catch (err) {
    console.error('[cdn-records] read error:', err.message)
  }
  return []
}

async function writeRecords(records) {
  const res = await fetch(
    `https://api.vercel.com/v1/edge-config/${EC_ID}/items`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ operation: 'upsert', key: 'cdn_records', value: records }] }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Write failed: ${res.status} — ${text}`)
  }
}

export function calcCost(record, pricing) {
  const overrides       = pricing.channel_overrides?.[record.channel_id] || {}
  const feed_rate       = overrides.feed_rate_per_hr  ?? pricing.feed_rate_per_hr
  const cdn_rate        = overrides.cdn_rate_per_gb   ?? pricing.cdn_rate_per_gb
  const gb_per_50_min   = pricing.gb_per_50_min

  const gb_delivered    = (record.minutes_delivered / 50) * gb_per_50_min
  const cost_feed       = record.stream_hours * feed_rate
  const cost_cdn        = gb_delivered * cdn_rate

  return {
    gb_delivered,
    cost_feed,
    cost_cdn,
    cost_total: cost_feed + cost_cdn,
    rates_used: { feed_rate, cdn_rate, gb_per_50_min },
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const [records, pricing] = await Promise.all([readRecords(), readPricing()])
      const enriched = records
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(r => ({ ...r, ...calcCost(r, pricing) }))
      return res.status(200).json(enriched)
    }

    if (!verifyTdToken(req.headers.authorization)) {
      return res.status(401).json({ error: 'Unauthorized — TD admin token required' })
    }

    const records = await readRecords()

    if (req.method === 'POST') {
      const missing = REQUIRED_FIELDS.filter(f => req.body[f] === undefined || req.body[f] === '')
      if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` })

      const newId = Math.max(0, ...records.map(r => r.id)) + 1
      const created = {
        id:                newId,
        date:              req.body.date,
        label:             req.body.label,
        tournament_id:     req.body.tournament_id ?? null,
        channel_id:        req.body.channel_id,
        channel_name:      req.body.channel_name,
        stream_hours:      Number(req.body.stream_hours),
        minutes_delivered: Number(req.body.minutes_delivered),
      }
      await writeRecords([...records, created].sort((a, b) => a.date.localeCompare(b.date)))
      return res.status(201).json(created)
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })
      const idx = records.findIndex(r => r.id === Number(id))
      if (idx === -1) return res.status(404).json({ error: 'Record not found' })

      const numFields = ['stream_hours', 'minutes_delivered']
      const updated   = [...records]
      updated[idx] = {
        ...updated[idx],
        ...Object.fromEntries(
          Object.entries(fields)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, numFields.includes(k) ? Number(v) : v])
        ),
      }
      await writeRecords(updated.sort((a, b) => a.date.localeCompare(b.date)))
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
    console.error('[cdn-records]', err)
    return res.status(500).json({ error: err.message })
  }
}
