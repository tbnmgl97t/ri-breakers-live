/**
 * /api/tournament-days
 *
 * All operations require auth.
 *
 * POST   — add a session to an event
 *   body: { tournament_id, label, date, start_time, end_time, tz?,
 *           streams?: [{ id, url, name }]  (up to 10) }
 *
 * PUT    — update a session (including stream assignment)
 *   body: { tournament_id, id, label?, date?, start_time?, end_time?, tz?,
 *           streams?: [{ id, url, name }] }
 *
 * DELETE — remove a session
 *   body: { tournament_id, id }
 *
 * Backward compat: old camera1_url / camera2_url fields are still accepted
 * on write and auto-migrated to streams[].
 */

import { verifyToken }                      from './_utils/auth.js'
import { readTournaments, writeTournaments } from './_utils/tournaments.js'

/** Normalise legacy camera1/camera2 fields into a streams array */
function normaliseStreams(body, existing = []) {
  // If caller sends explicit streams array, use it (filter empty slots)
  if (Array.isArray(body.streams)) {
    return body.streams
      .filter(s => s && s.url)
      .slice(0, 10)
      .map((s, i) => ({ id: s.id ?? i + 1, url: s.url, name: s.name || `Stream ${i + 1}` }))
  }

  // Legacy: camera1 / camera2 fields
  const base = Array.isArray(existing) ? [...existing] : []
  const patch = []
  if (body.camera1_url !== undefined) {
    patch.push({ id: 1, url: body.camera1_url, name: body.camera1_name || 'Stream 1' })
  }
  if (body.camera2_url !== undefined) {
    patch.push({ id: 2, url: body.camera2_url, name: body.camera2_name || 'Stream 2' })
  }
  if (patch.length === 0) return base // nothing to patch

  // Merge patches into base array by id
  const map = {}
  base.forEach(s => { map[s.id] = s })
  patch.forEach(s => { if (s.url) map[s.id] = s; else delete map[s.id] })
  return Object.values(map).filter(s => s.url).slice(0, 10)
}

export default async function handler(req, res) {
  if (!verifyToken(req.headers.authorization)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const tournaments = await readTournaments()
    const { tournament_id } = req.body

    if (!tournament_id) return res.status(400).json({ error: 'tournament_id is required' })

    const tIdx = tournaments.findIndex(t => t.id === Number(tournament_id))
    if (tIdx === -1) return res.status(404).json({ error: 'Event not found' })

    const tournament = { ...tournaments[tIdx], days: [...(tournaments[tIdx].days || [])] }

    // ── Add session ───────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { label, date, start_time, end_time, tz = 'EDT' } = req.body

      if (!label || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'label, date, start_time, end_time are required' })
      }

      const newId   = Math.max(0, ...tournament.days.map(d => d.id)) + 1
      const streams = normaliseStreams(req.body, [])
      const created = { id: newId, label, date, start_time, end_time, tz, streams }

      tournament.days = [...tournament.days, created]
        .sort((a, b) => a.date.localeCompare(b.date))

      const updated = [...tournaments]
      updated[tIdx] = tournament
      await writeTournaments(updated)
      return res.status(201).json(created)
    }

    // ── Update session ────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const { id, label, date, start_time, end_time, tz } = req.body

      if (!id) return res.status(400).json({ error: 'id is required' })

      const dIdx = tournament.days.findIndex(d => d.id === Number(id))
      if (dIdx === -1) return res.status(404).json({ error: 'Session not found' })

      const existing = tournament.days[dIdx]

      // Resolve streams: if body contains streams or camera fields, merge; else keep existing
      const hasStreamUpdate = Array.isArray(req.body.streams)
        || req.body.camera1_url !== undefined
        || req.body.camera2_url !== undefined
      const streams = hasStreamUpdate
        ? normaliseStreams(req.body, existing.streams || [])
        : (existing.streams || normaliseStreams({
            camera1_url: existing.camera1_url, camera1_name: existing.camera1_name,
            camera2_url: existing.camera2_url, camera2_name: existing.camera2_name,
          }, []))

      tournament.days[dIdx] = {
        ...existing,
        ...(label      !== undefined && { label }),
        ...(date       !== undefined && { date }),
        ...(start_time !== undefined && { start_time }),
        ...(end_time   !== undefined && { end_time }),
        ...(tz         !== undefined && { tz }),
        streams,
        // Drop legacy fields if present
        camera1_url: undefined, camera1_name: undefined,
        camera2_url: undefined, camera2_name: undefined,
      }

      // Clean up undefined keys
      Object.keys(tournament.days[dIdx]).forEach(k => {
        if (tournament.days[dIdx][k] === undefined) delete tournament.days[dIdx][k]
      })

      const updated = [...tournaments]
      updated[tIdx] = tournament
      await writeTournaments(updated)
      return res.status(200).json(tournament.days[dIdx])
    }

    // ── Delete session ────────────────────────────────────────────────────────
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
