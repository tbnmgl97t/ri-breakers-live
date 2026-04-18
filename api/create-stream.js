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
    channel_type = 'live_event',
    ingest_format = 'rtmp',
    start_time_utc,
    end_time_utc,
    ingest_point_id,
  } = req.body || {}

  if (!title) return res.status(400).json({ error: 'title is required' })

  try {
    // Build JW API payload
    const payload = {
      metadata: { title },
      region,
    }

    // Channel type: "live_event" or "always_on" (JW calls 24/7 "always_on")
    if (channel_type) {
      payload.channel_type = channel_type
    }

    // Schedule (only meaningful for live_event)
    if (channel_type === 'live_event' && start_time_utc) {
      payload.schedule = { start_time: start_time_utc }
      if (end_time_utc) {
        payload.schedule.end_time = end_time_utc
      }
    }

    // Ingest settings
    const ingestSettings = {}
    if (ingest_format) ingestSettings.format = ingest_format
    if (ingest_point_id) ingestSettings.ingest_point_id = ingest_point_id
    if (Object.keys(ingestSettings).length > 0) {
      payload.ingest_settings = ingestSettings
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
      id: data.id,
      name: data.metadata?.title || data.title || title,
      status: data.status,
      stream_url: data.stream_url || data.hls_stream_url || data.playback_url || null,
      raw: data,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
