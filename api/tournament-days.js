/**
 * /api/tournament-days
 *
 * All operations require auth.
 *
 * POST   — add a day to a tournament
 *   body: { tournament_id, label, date, start_time, end_time, tz?,
 *           camera1_url?, camera1_name?, camera2_url?, camera2_name? }
 *
 * PUT    — update a day (including camera assignment)
 *   body: { tournament_id, id, label?, date?, start_time?, end_time?, tz?,
 *           camera1_url?, camera1_name?, camera2_url?, camera2_name? }
 *
 * DELETE — remove a day
 *   body: { tournament_id, id }
 */

import { verifyToken }                   from './_utils/auth.js'
import { readTournaments, writeTournaments } from './_utils/tournaments.js'

export default async function handler(req, res) {
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const tournaments = await readTournaments()
    const { tournament_id } = req.body

    if (!tournament_id) return res.status(400).json({ error: 'tournament_id is required' })

    const tIdx = tournaments.findIndex(t => t.id === Number(tournament_id))
    if (tIdx === -1) return res.status(404).json({ error: 'Tournament not found' })

    const tournament = { ...tournaments[tIdx], days: [...(tournaments[tIdx].days || [])] }

    // ── Add day ───────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { label, date, start_time, end_time, tz = 'EDT',
              camera1_url = null, camera1_name = null,
              camera2_url = null, camera2_name = null } = req.body

      if (!label || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'label, date, start_time, end_time are required' })
      }

      // Generate unique ID across the whole tournament's days
      const newId = Math.max(0, ...tournament.days.map(d => d.id)) + 1
      const created = { id: newId, label, date, start_time, end_time, tz,
                        camera1_url, camera1_name, camera2_url, camera2_name }

      tournament.days = [...tournament.days, created]
        .sort((a, b) => a.date.localeCompare(b.date))

      const updated = [...tournaments]
      updated[tIdx] = tournament
      await writeTournaments(updated)
      return res.status(201).json(created)
    }

    // ── Update day ────────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const { id, label, date, start_time, end_time, tz,
              camera1_url, camera1_name, camera2_url, camera2_name } = req.body

      if (!id) return res.status(400).json({ error: 'id is required' })

      const dIdx = tournament.days.findIndex(d => d.id === Number(id))
      if (dIdx === -1) return res.status(404).json({ error: 'Day not found' })

      tournament.days[dIdx] = {
        ...tournament.days[dIdx],
        ...(label      !== undefined && { label }),
        ...(date       !== undefined && { date }),
        ...(start_time !== undefined && { start_time }),
        ...(end_time   !== undefined && { end_time }),
        ...(tz         !== undefined && { tz }),
        camera1_url:  camera1_url  !== undefined ? (camera1_url  ?? null) : tournament.days[dIdx].camera1_url,
        camera1_name: camera1_name !== undefined ? (camera1_name ?? null) : tournament.days[dIdx].camera1_name,
        camera2_url:  camera2_url  !== undefined ? (camera2_url  ?? null) : tournament.days[dIdx].camera2_url,
        camera2_name: camera2_name !== undefined ? (camera2_name ?? null) : tournament.days[dIdx].camera2_name,
      }

      const updated = [...tournaments]
      updated[tIdx] = tournament
      await writeTournaments(updated)
      return res.status(200).json(tournament.days[dIdx])
    }

    // ── Delete day ────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.body
      if (!id) return res.status(400).json({ error: 'id is required' })

      tournament.days = tournament.days.filter(d => d.id !== Number(id))
      const updated = [...tournaments]
      updated[tIdx] = tournament
      await writeTournaments(updated)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (err) {
    console.error('[tournament-days]', err)
    return res.status(500).json({ error: err.message })
  }
}
