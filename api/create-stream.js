import { verifyToken } from './_utils/auth.js'

const SITE_ID    = process.env.JW_SITE_ID
const API_SECRET = process.env.JW_API_SECRET || ''

// Warm-up: schedule the stream to start 15 min before the user's desired go-live time
const WARMUP_MS = 15 * 60 * 1000

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const {
    title,
    region       = 'us-east-1',
    channel_type = 'live_event', // 'live_event' | 'always_on'
    ingest_format = 'rtmp',
    start_time_utc,
    end_time_utc,
    ingest_point_id,
    downloadable = false,        // true → save VOD asset (10-day availability)
  } = req.body || {}

  if (!title) return res.status(400).json({ error: 'title is required' })

  try {
    const streamType = channel_type === 'always_on' ? '24/7' : 'event'

    // Apply 15-min warm-up offset so stream is ready at the user's intended go-live time
    let warmUpStartIso = null
    if (streamType === 'event' && start_time_utc) {
      warmUpStartIso = new Date(new Date(start_time_utc).getTime() - WARMUP_MS).toISOString()
    }

    const payload = {
      metadata: { title },
      ingest_format,
      region,
      options: {
        stream_type:        streamType,
        enable_live_to_vod: downloadable ? true : false,
        ...(downloadable && { live_to_vod_method: 'hosted_capture' }),
        ...(streamType === 'event' && warmUpStartIso && { stream_start: warmUpStartIso }),
        ...(streamType === 'event' && end_time_utc   && { stream_end:   end_time_utc  }),
      },
    }

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
          Authorization:   API_SECRET,
          'Content-Type':  'application/json',
          Accept:          'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const bodyText = await r.text()

    if (!r.ok) {
      return res.status(r.status).json({
        error:  `JW API error ${r.status}`,
        detail: bodyText,
      })
    }

    const data = JSON.parse(bodyText)

    // VOD expiry: 10 days from now (stored for dashboard tracking)
    const vodExpiresAt = downloadable
      ? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      : null

    return res.status(201).json({
      id:               data.id,
      name:             data.metadata?.title,
      status:           data.metadata?.status,
      stream_type:      data.stream_type || streamType,
      ingest_format:    data.ingest_format || ingest_format,
      stream_url:       data.metadata?.playout?.hls || null,
      ingest_address:   data.ingest_address  || null,
      ingest_stream_key: data.connection_code || null,
      site_id:          SITE_ID,
      warm_up_start:    warmUpStartIso,
      downloadable,
      vod_expires_at:   vodExpiresAt,
      raw:              data,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
