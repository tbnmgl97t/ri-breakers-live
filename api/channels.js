import { verifyToken } from './_utils/auth.js'

const SITE_ID = process.env.JW_SITE_ID
const API_SECRET = process.env.JW_API_SECRET || ''

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const url = `https://api.jwplayer.com/v2/sites/${SITE_ID}/channels/?page_length=50`
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_SECRET}`,
        'Content-Type': 'application/json',
      },
    })

    const body = await r.text()

    if (!r.ok) {
      return res.status(r.status).json({
        error: `JW API error ${r.status}`,
        detail: body,
        siteId: SITE_ID,
        secretPrefix: API_SECRET.slice(0, 8) + '…',
      })
    }

    const data = JSON.parse(body)
    const channels = data.channels || data.items || []
    return res.status(200).json({ channels })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
