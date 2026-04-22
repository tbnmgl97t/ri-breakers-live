/**
 * /api/pricing
 *
 * GET  — public; returns current pricing config
 * PUT  — TD auth; update pricing config
 *        body: { ingestion_per_gb?, storage_per_gb?, playout_per_gb?, channel_overrides? }
 *
 * Pricing shape stored in Edge Config under key `pricing`:
 * {
 *   ingestion_per_gb:  number,   // $/GB ingested
 *   storage_per_gb:    number,   // $/GB stored
 *   playout_per_gb:    number,   // $/GB delivered (playout)
 *   channel_overrides: {         // per-JW-channel-ID rate overrides
 *     [channelId]: {
 *       name?:             string,
 *       ingestion_per_gb?: number,
 *       storage_per_gb?:   number,
 *       playout_per_gb?:   number,
 *     }
 *   }
 * }
 */

import { verifyTdToken } from './td-auth.js'

const EC_ID        = process.env.EDGE_CONFIG_ID
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN

export const DEFAULT_PRICING = {
  ingestion_per_gb:  0.05,
  storage_per_gb:    0.02,
  playout_per_gb:    0.12,
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
      const { ingestion_per_gb, storage_per_gb, playout_per_gb, channel_overrides } = req.body
      const updated = {
        ...current,
        ...(ingestion_per_gb  !== undefined && { ingestion_per_gb:  Number(ingestion_per_gb) }),
        ...(storage_per_gb    !== undefined && { storage_per_gb:    Number(storage_per_gb) }),
        ...(playout_per_gb    !== undefined && { playout_per_gb:    Number(playout_per_gb) }),
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
