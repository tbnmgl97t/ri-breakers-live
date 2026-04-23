/**
 * /api/pricing
 *
 * GET  — public; returns current pricing config
 * PUT  — TD auth; update pricing config
 *
 * Pricing shape stored in Edge Config under key `pricing`:
 * {
 *   feed_rate_per_hr:  number,   // $/hr per feed (flat channel fee)
 *   cdn_rate_per_gb:   number,   // $/GB CDN delivery
 *   gb_per_50_min:     number,   // GB of data per 50 minutes (data rate constant)
 *   channel_overrides: {         // per-JW-channel-ID rate overrides
 *     [channelId]: {
 *       name?:            string,
 *       feed_rate_per_hr?: number,
 *       cdn_rate_per_gb?:  number,
 *     }
 *   }
 * }
 *
 * Cost formula per feed:
 *   gb_delivered = minutes_delivered / 50 * gb_per_50_min
 *   cost_feed    = stream_hours * feed_rate_per_hr
 *   cost_cdn     = gb_delivered * cdn_rate_per_gb
 *   cost_total   = cost_feed + cost_cdn
 */

import { verifyTdToken } from './td-auth.js'

const EC_ID        = process.env.EDGE_CONFIG_ID
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN

export const DEFAULT_PRICING = {
  feed_rate_per_hr:  15.00,   // $15/hr per feed
  cdn_rate_per_gb:    0.05,   // $0.05/GB
  gb_per_50_min:      4,      // 4 GB per 50 minutes
  channel_overrides: {},
}

export async function readPricing() {
  if (!EC_ID || !VERCEL_TOKEN) return { ...DEFAULT_PRICING }
  try {
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/pricing`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (res.ok) {
      const item = await res.json()
      if (item?.value) return { ...DEFAULT_PRICING, ...item.value }
    }
  } catch (err) {
    console.error('[pricing] read error:', err.message)
  }
  return { ...DEFAULT_PRICING }
}

async function writePricing(pricing) {
  const res = await fetch(
    `https://api.vercel.com/v1/edge-config/${EC_ID}/items`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ operation: 'upsert', key: 'pricing', value: pricing }] }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Write failed: ${res.status} — ${text}`)
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json(await readPricing())
    }

    if (req.method === 'PUT') {
      if (!verifyTdToken(req.headers.authorization)) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const current = await readPricing()
      const { feed_rate_per_hr, cdn_rate_per_gb, gb_per_50_min, channel_overrides } = req.body
      const updated = {
        ...current,
        ...(feed_rate_per_hr  !== undefined && { feed_rate_per_hr:  Number(feed_rate_per_hr) }),
        ...(cdn_rate_per_gb   !== undefined && { cdn_rate_per_gb:   Number(cdn_rate_per_gb) }),
        ...(gb_per_50_min     !== undefined && { gb_per_50_min:     Number(gb_per_50_min) }),
        ...(channel_overrides !== undefined && { channel_overrides }),
      }
      await writePricing(updated)
      return res.status(200).json(updated)
    }

    return res.status(405).end()
  } catch (err) {
    console.error('[pricing]', err)
    return res.status(500).json({ error: err.message })
  }
}
