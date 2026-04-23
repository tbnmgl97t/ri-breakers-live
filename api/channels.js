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
    const channels = raw.map(ch => {
      const rtmp = ch.metadata?.ingest?.rtmp?.ingest_point
      return {
        id:               ch.id,
        name:             ch.metadata?.title || ch.id,
        status:           ch.metadata?.status || 'idle',
        stream_type:      ch.stream_type || null,
        stream_url:       ch.metadata?.playout?.hls || null,
        stream_start:     ch.metadata?.stream_start || null,
        stream_end:       ch.metadata?.stream_end   || null,
        ingest_url:       rtmp?.url  || null,
        ingest_key:       rtmp?.key  || null,
        ingest_format:    ch.ingest_format || null,
        ingest_point_id:  ch.relationships?.ingest_point?.id || null,
        ingest_point_name: ch.relationships?.ingest_point?.metadata?.display_name || null,
        // VOD / downloadable recording
        enable_live_to_vod: ch.enable_live_to_vod || ch.options?.enable_live_to_vod || ch.metadata?.enable_live_to_vod || false,
        vod_media_id:     ch.vod_media_id || ch.metadata?.vod_media_id || null,
      }
    })
    // Sort: latest stream_start first; tie-break by name A→Z; no-start go last
    channels.sort((a, b) => {
      if (!a.stream_start && !b.stream_start) return (a.name || '').localeCompare(b.name || '')
      if (!a.stream_start) return 1
      if (!b.stream_start) return -1
      const timeDiff = new Date(b.stream_start) - new Date(a.stream_start)
      if (timeDiff !== 0) return timeDiff
      return (a.name || '').localeCompare(b.name || '')
    })

    return res.status(200).json({ channels })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
