/**
 * /api/tournaments
 *
 * GET    — public; returns all tournaments (with nested days)
 * POST   — auth; create a new tournament   body: { name, location }
 * PUT    — auth; update a tournament       body: { id, name?, location? }
 * DELETE — auth; delete a tournament       body: { id }
 */

import { verifyToken }                   from './_utils/auth.js'
import { readTournaments, writeTournaments } from './_utils/tournaments.js'

export default async function handler(req, res) {
  // GET is public — the main app reads tournaments without auth
  if (req.method !== 'GET' && !verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (req.method === 'GET') {
      const tournaments = await readTournaments()
      return res.status(200).json(tournaments)
    }

    const tournaments = await readTournaments()

    // ── Create tournament ──────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { name, location = '' } = req.body
      if (!name) return res.status(400).json({ error: 'name is required' })

      const newId = Math.max(0, ...tournaments.map(t => t.id)) + 1
      const created = { id: newId, name, location, days: [] }
      await writeTournaments([...tournaments, created])
      return res.status(201).json(created)
    }

    // ── Update tournament ──────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const { id, name, location } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })

      const idx = tournaments.findIndex(t => t.id === Number(id))
      if (idx === -1) return res.status(404).json({ error: 'Tournament not found' })

      const updated = [...tournaments]
      updated[idx] = {
        ...updated[idx],
        ...(name     !== undefined && { name }),
        ...(location !== undefined && { location }),
      }
      await writeTournaments(updated)
      return res.status(200).json(updated[idx])
    }

    // ── Delete tournament ──────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })

      const updated = tournaments.filter(t => t.id !== Number(id))
      await writeTournaments(updated)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error('[tournaments]', err)
    return res.status(500).json({ error: err.message })
  }
}
