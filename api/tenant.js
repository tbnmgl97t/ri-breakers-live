/**
 * /api/tenant
 *
 * GET  — public;  returns current tenant config (falls back to defaults)
 * PUT  — auth;    full or partial update of tenant config
 */

import { verifyToken }                    from './_utils/auth.js'
import { readTenant, writeTenant, DEFAULT_TENANT } from './_utils/tenant.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const tenant = await readTenant()
    return res.status(200).json(tenant)
  }

  if (req.method === 'PUT') {
    if (!verifyToken(req.headers.authorization)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      const current = await readTenant()
      const body    = req.body || {}
      const updated = {
        ...current,
        ...body,
        colors:     { ...current.colors,     ...(body.colors     || {}) },
        components: { ...current.components, ...(body.components || {}) },
      }
      await writeTenant(updated)
      return res.status(200).json(updated)
    } catch (err) {
      console.error('[tenant] write error:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).end()
}
