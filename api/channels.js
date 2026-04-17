import { verifyToken } from './_utils/auth.js'

const SITE_ID = process.env.JW_SITE_ID
const RAW_SECRET = process.env.JW_API_SECRET || ''

// JW V2 API credentials are stored as "{keyId}-{secret}".
// The Bearer token should be just the secret portion (after the first hyphen).
const API_SECRET = RAW_SECRET.includes('-') ? RAW_SECRET.split('-').slice(1).join('-') : RAW_SECRET

// JW Platform v2 — try all live content paths in priority order
const ENDPOINTS = [
  `https://api.jwplayer.com/v2/sites/${SITE_ID}/live_events`,
  `https://api.jwplayer.com/v2/sites/${SITE_ID}/broadcasts`,
  `https://api.jwplayer.com/v2/sites/${SITE_ID}/live_channels`,
  `https://api.jwplayer.com/v2/sites/${SITE_ID}/channels`,
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let lastStatus = null
  let lastBody = null

  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(`${url}?page_length=50`, {
        headers: {
          Authorization: `Bearer ${API_SECRET}`,
          'Content-Type': 'application/json',
        },
      })

      lastStatus = r.status
      lastBody = await r.text()

      if (r.ok) {
        const data = JSON.parse(lastBody)
        const channels = data.broadcasts || data.channels || data.live_channels || data.live_events || data.items || []
        return res.status(200).json({ channels, _endpoint: url })
      }

      // 404 = wrong path, keep trying. Anything else = right path, wrong auth/perms — stop here.
      if (r.status !== 404) break
    } catch (err) {
      lastBody = err.message
    }
  }

  return res.status(lastStatus || 500).json({
    error: `JW API error ${lastStatus}`,
    detail: lastBody,
    siteId: SITE_ID,
    secretPrefix: API_SECRET.slice(0, 6) + '…',
  })
}
