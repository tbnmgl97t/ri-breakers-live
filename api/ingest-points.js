import { verifyToken } from './_utils/auth.js'

const SITE_ID = process.env.JW_SITE_ID
const API_SECRET = process.env.JW_API_SECRET || ''

function extractItems(data) {
  // Try every known key JW might use
  const candidates = [
    data.ingest_points,
    data.ingest_availability,
    data.availability,
    data.items,
    data.results,
    data.data,
  ]
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c
  }
  // Maybe the response itself is the array
  if (Array.isArray(data)) return data
  return []
}

function normalise(p) {
  return {
    id:         p.id   || p.ingest_point_id || p.point_id,
    name:       p.name || p.label || p.title || p.id || p.ingest_point_id,
    region:     p.region || p.ingest_region || p.geo_region || null,
    ingest_url: p.ingest_url || p.rtmp_url || p.srt_url || p.url || null,
    available:  p.available ?? p.is_available ?? true,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const ingest_format = req.query?.ingest_format || 'rtmp'

  try {
    const url =
      `https://api.jwplayer.com/v2/sites/${SITE_ID}/live/broadcast/ingest/availability/` +
      `?ingest_format=${encodeURIComponent(ingest_format)}&page=1&page_length=50`

    const r = await fetch(url, {
      headers: {
        Authorization: API_SECRET,
        Accept: 'application/json',
      },
    })

    const body = await r.text()
    console.log('[ingest-points] status:', r.status, 'body:', body.slice(0, 500))

    if (!r.ok) {
      return res.status(r.status).json({ error: `JW API error ${r.status}`, detail: body })
    }

    const data = JSON.parse(body)
    const raw = extractItems(data)
    const ingest_points = raw.map(normalise).filter(p => p.id)

    return res.status(200).json({ ingest_points, _raw_keys: Object.keys(data) })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
