/**
 * /api/td-auth
 *
 * POST { password } → { token }   — TD Admin login
 *
 * Also exports verifyTdToken() for use in other API handlers.
 */

import { createHmac } from 'crypto'

const SECRET  = () => process.env.TD_ADMIN_PASSWORD || 'td-admin-fallback-dev'
const TTL_MS  = 24 * 60 * 60 * 1000

function currentWindow() {
  return Math.floor(Date.now() / TTL_MS)
}

function sign(w) {
  return createHmac('sha256', SECRET())
    .update(`td-admin-session-v1:${w}`)
    .digest('hex')
}

export function generateTdToken() {
  const w = currentWindow()
  return `${w}.${sign(w)}`
}

export function verifyTdToken(authHeader) {
  const raw = (authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!raw) return false
  const [windowStr, sig] = raw.split('.')
  if (!windowStr || !sig) return false
  const w = parseInt(windowStr, 10)
  if (isNaN(w)) return false
  const now = currentWindow()
  if (w !== now && w !== now - 1) return false
  return sig === sign(w)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body || {}
  const expected = process.env.TD_ADMIN_PASSWORD

  if (!expected) {
    return res.status(500).json({ error: 'TD_ADMIN_PASSWORD is not configured on this deployment' })
  }
  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  return res.status(200).json({ token: generateTdToken() })
}
