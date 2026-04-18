import { verifyToken } from './_utils/auth.js'

const SITE_ID = process.env.JW_SITE_ID
const API_SECRET = process.env.JW_API_SECRET || ''

function normalise(p) {
  return {
    id:        p.id,
    name:      p.metadata?.display_name || p.id,
    available: p.metadata?.availability_status === 'available',
    format:    p.metadata?.ingest_format || null,
    attached:  p.metadata?.attached_stream_id || null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const ingest_format = req.query?.ingest_format || 'rtmp'
  const start_date    = req.query?.start_date || ''
  const end_date      = req.query?.end_date   || ''

  try {
    let url =
      `https://api.jwplayer.com/v2/sites/${SITE_ID}/live/broadcast/ingest/availability/` +
      `?ingest_format=${encodeURIComponent(ingest_format)}&page=1&page_length=50`
    if (start_date) url += `&start_date=${encodeURIComponent(start_date)}`
    if (end_date)   url += `&end_date=${encodeURIComponent(end_date)}`

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
    const raw = data.ingests || []
    const ingest_points = raw.map(normalise).filter(p => p.id)

    return res.status(200).json({ ingest_points })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
