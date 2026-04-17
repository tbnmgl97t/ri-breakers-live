import { verifyToken } from './_utils/auth.js'

const SITE_ID = process.env.JW_SITE_ID
const API_SECRET = process.env.JW_API_SECRET

// JW Platform v2 has a few possible paths for live content depending on account type
const ENDPOINTS = [
  `https://api.jwplayer.com/v2/sites/${SITE_ID}/live_channels`,
  `https://api.jwplayer.com/v2/sites/${SITE_ID}/channels`,
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Try each endpoint until one works
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
        // Normalise — JW returns channels under different keys depending on endpoint
        const channels = data.channels || data.channel_list || data.items || data.live_channels || []
        return res.status(200).json({ channels, _endpoint: url })
      }
    } catch (err) {
      lastBody = err.message
    }
  }

  // None worked — return the last error with full body for debugging
  return res.status(lastStatus || 500).json({
    error: `JW API error ${lastStatus}`,
    detail: lastBody,
    siteId: SITE_ID,
    triedEndpoints: ENDPOINTS,
  })
}
