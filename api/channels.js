import { verifyToken } from './_utils/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const r = await fetch(
      `https://api.jwplayer.com/v2/sites/${process.env.JW_SITE_ID}/live_channels/?page_length=50`,
      {
        headers: {
          Authorization: `Bearer ${process.env.JW_API_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!r.ok) {
      const text = await r.text()
      return res.status(r.status).json({ error: `JW API error ${r.status}`, detail: text })
    }

    const data = await r.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
