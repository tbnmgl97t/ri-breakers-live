import { verifyToken } from './_utils/auth.js'

const SITE_ID = process.env.JW_SITE_ID
const API_SECRET = process.env.JW_API_SECRET || ''

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.body || {}
  if (!id) return res.status(400).json({ error: 'id is required' })

  try {
    const r = await fetch(
      `https://api.jwplayer.com/v2/sites/${SITE_ID}/live/broadcast/streams/${id}/destroy/`,
      {
        method: 'PUT',
        headers: {
          Authorization: API_SECRET,
          Accept: 'application/json',
        },
      }
    )

    if (!r.ok) {
      const body = await r.text()
      return res.status(r.status).json({ error: `JW API error ${r.status}`, detail: body })
    }

    return res.status(200).json({ ok: true, id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
