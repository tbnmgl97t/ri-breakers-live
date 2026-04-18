import { verifyToken } from './_utils/auth.js'

const SITE_ID = process.env.JW_SITE_ID
const API_SECRET = process.env.JW_API_SECRET || ''

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    title,
    region = 'us-east-1',
    channel_type = 'live_event', // 'live_event' | 'always_on'
    ingest_format = 'rtmp',
    start_time_utc,
    end_time_utc,
    ingest_point_id,
  } = req.body || {}

  if (!title) return res.status(400).json({ error: 'title is required' })

  try {
    // JW uses stream_type field with values "live_event" or "24/7"
    const streamType = channel_type === 'always_on' ? '24/7' : 'live_event'

    const payload = {
      metadata: {
        title,
        // For live events, schedule goes inside metadata
        ...(streamType === 'live_event' && start_time_utc && { stream_start: start_time_utc }),
        ...(streamType === 'live_event' && end_time_utc   && { stream_end:   end_time_utc   }),
      },
      stream_type:   streamType,
      ingest_format: ingest_format,
      region,
    }

    // Ingest point goes in relationships
    if (ingest_point_id) {
      payload.relationships = {
        ingest_point: { id: ingest_point_id, type: 'ingest_point' },
      }
    }

    const r = await fetch(
      `https://api.jwplayer.com/v2/sites/${SITE_ID}/live/broadcast/streams/`,
      {
        method: 'POST',
        headers: {
          Authorization: API_SECRET,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const body = await r.text()

    if (!r.ok) {
      return res.status(r.status).json({
        error: `JW API error ${r.status}`,
        detail: body,
      })
    }

    const data = JSON.parse(body)
    return res.status(201).json({
      id:         data.id,
      name:       data.metadata?.title || title,
      status:     data.metadata?.status || data.status,
      stream_type: data.stream_type,
      stream_url: data.metadata?.playout?.hls || null,
      raw:        data,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
