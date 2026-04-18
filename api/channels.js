import { verifyToken } from './_utils/auth.js'

const SITE_ID = process.env.JW_SITE_ID
const API_SECRET = process.env.JW_API_SECRET || ''

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const url = `https://api.jwplayer.com/v2/sites/${SITE_ID}/live/broadcast/streams/?page_length=50`
    const r = await fetch(url, {
      headers: {
        Authorization: API_SECRET,
        Accept: 'application/json',
      },
    })

    const body = await r.text()

    if (!r.ok) {
      return res.status(r.status).json({
        error: `JW API error ${r.status}`,
        detail: body,
        siteId: SITE_ID,
      })
    }

    const data = JSON.parse(body)
    const raw = data.streams || data.broadcast_streams || data.items || data.results || []
    // Normalise each stream to a consistent shape
    const channels = raw.map(ch => ({
      id: ch.id,
      name: ch.title || ch.name || ch.id,
      status: ch.status || 'idle',
      stream_url: ch.stream_url || ch.hls_stream_url || ch.playback_url || null,
    }))
    return res.status(200).json({ channels })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
