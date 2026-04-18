import React, { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  Alert, IconButton, Chip, Divider, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableHead, TableRow,
  AppBar, Toolbar, Stack, ToggleButton, ToggleButtonGroup, MenuItem,
} from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import VideocamIcon from '@mui/icons-material/Videocam'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import theme from '../theme/theme'

const SESSION_KEY = 'ri_admin_token'

// ─── helpers ─────────────────────────────────────────────────────────────────

function authHeader(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      sessionStorage.setItem(SESSION_KEY, data.token)
      onLogin(data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper
        elevation={0}
        sx={{ width: 360, p: 4, border: '1px solid rgba(255,255,255,0.09)', borderRadius: 2 }}
        component="form"
        onSubmit={handleSubmit}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, gap: 1 }}>
          <Box
            component="img"
            src="https://ribreakersac.com/cdn/shop/files/RI-Breakers-Logo-WHITE.png?v=1774997726&width=200"
            alt="RI Breakers"
            sx={{ width: 64, height: 64, objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(230,93,44,0.4))' }}
          />
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.08em', fontSize: '1.1rem', mt: 0.5 }}>
            ADMIN DASHBOARD
          </Typography>
          <Typography variant="caption" sx={{ color: '#a8bcd4' }}>Rhode Island Breakers</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>{error}</Alert>}

        <TextField
          fullWidth
          type="password"
          label="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          size="small"
          autoFocus
          sx={{ mb: 2 }}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading || !password}
          sx={{ bgcolor: '#e65d2c', '&:hover': { bgcolor: '#c94e24' }, fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Sign In'}
        </Button>
      </Paper>
    </Box>
  )
}

// ─── Event dialog (create / edit) ─────────────────────────────────────────────

const EMPTY_EVENT = { label: '', date: '', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT' }

function EventDialog({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_EVENT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial ? { ...initial } : EMPTY_EVENT)
  }, [initial, open])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const isValid = form.label && form.date && form.start_time && form.end_time

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 1 }}>
        {initial?.id ? 'Edit Event' : 'New Event'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField label="Label" value={form.label} onChange={set('label')} size="small" fullWidth placeholder="Day 1" />
        <TextField label="Date" type="date" value={form.date} onChange={set('date')} size="small" fullWidth InputLabelProps={{ shrink: true }} />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField label="Start" value={form.start_time} onChange={set('start_time')} size="small" fullWidth placeholder="8:00 AM" />
          <TextField label="End"   value={form.end_time}   onChange={set('end_time')}   size="small" fullWidth placeholder="5:00 PM" />
        </Box>
        <TextField label="Timezone" value={form.tz} onChange={set('tz')} size="small" fullWidth placeholder="EDT" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#a8bcd4' }}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={!isValid || saving}
          variant="contained"
          sx={{ bgcolor: '#e65d2c', '&:hover': { bgcolor: '#c94e24' } }}
        >
          {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Channel picker dialog ────────────────────────────────────────────────────

function ChannelPickerDialog({ open, slot, event, channels, onClose, onPick }) {
  // Current assignment for this slot
  const currentUrl = slot === 1 ? event?.camera1_url : event?.camera2_url

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 0 }}>
        Assign Channel → {event?.label} · Camera {slot}
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        {/* Current assignment banner */}
        {currentUrl && (
          <Box sx={{ mb: 1.5, px: 1.5, py: 1, bgcolor: 'rgba(230,93,44,0.08)', border: '1px solid rgba(230,93,44,0.25)', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 14, color: '#e65d2c', flexShrink: 0 }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.62rem', display: 'block' }}>CURRENTLY ASSIGNED</Typography>
              <Typography variant="caption" sx={{ color: '#e65d2c', fontWeight: 700, fontSize: '0.75rem' }}>
                {(slot === 1 ? event?.camera1_name : event?.camera2_name) || currentUrl}
              </Typography>
            </Box>
          </Box>
        )}

        {channels.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#a8bcd4', textAlign: 'center', py: 3 }}>
            No JW live channels found.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {/* clear option */}
            <Paper
              onClick={() => onPick(null)}
              elevation={0}
              sx={{
                p: 1.5, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 1.5,
                cursor: 'pointer', '&:hover': { borderColor: '#f44336', bgcolor: 'rgba(244,67,54,0.05)' },
              }}
            >
              <Typography variant="body2" sx={{ color: 'rgba(168,188,212,0.6)', fontStyle: 'italic' }}>— Clear assignment —</Typography>
            </Paper>
            {channels.map(ch => {
              const isLive   = ch.status === 'active'
              const isActive = ch.stream_url === currentUrl && !!currentUrl
              return (
                <Paper
                  key={ch.id}
                  onClick={() => ch.stream_url && onPick({ url: ch.stream_url, name: ch.name })}
                  elevation={0}
                  sx={{
                    p: 1.5, borderRadius: 1.5,
                    border: `1px solid ${isActive ? 'rgba(230,93,44,0.6)' : 'rgba(255,255,255,0.07)'}`,
                    bgcolor: isActive ? 'rgba(230,93,44,0.1)' : 'transparent',
                    cursor: ch.stream_url ? 'pointer' : 'default',
                    opacity: ch.stream_url ? 1 : 0.5,
                    '&:hover': ch.stream_url ? { borderColor: '#e65d2c', bgcolor: 'rgba(230,93,44,0.07)' } : {},
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      {isActive && <CheckCircleIcon sx={{ fontSize: 14, color: '#e65d2c', flexShrink: 0 }} />}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: isActive ? '#e65d2c' : '#fff' }}>{ch.name}</Typography>
                        {ch.stream_url
                          ? <Typography variant="caption" sx={{ color: '#a8bcd4', fontFamily: 'monospace', fontSize: '0.62rem', wordBreak: 'break-all' }}>{ch.stream_url}</Typography>
                          : <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.65rem' }}>No stream URL available</Typography>
                        }
                      </Box>
                    </Box>
                    <Chip
                      label={isLive ? 'LIVE' : (ch.status || 'idle').toUpperCase()}
                      size="small"
                      sx={{
                        height: 18, fontSize: '0.6rem', fontWeight: 700,
                        bgcolor: isLive ? 'rgba(230,93,44,0.2)' : 'rgba(255,255,255,0.06)',
                        color: isLive ? '#e65d2c' : '#a8bcd4',
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                </Paper>
              )
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#a8bcd4' }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Helpers for Eastern ↔ UTC conversion ────────────────────────────────────

// Returns true if a YYYY-MM-DD date falls in EDT window (Mar–Nov)
function isEDT(dateStr) {
  const month = parseInt(dateStr.split('-')[1], 10)
  return month >= 3 && month <= 11
}

// Convert a local EST/EDT date+time to a UTC ISO string for the JW API
function toUtcIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return null
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ampm = match[3]?.toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const offset = isEDT(dateStr) ? '-04:00' : '-05:00'
  try {
    return new Date(`${dateStr}T${hh}:${mm}:00${offset}`).toISOString()
  } catch {
    return null
  }
}

// ─── Create Live Stream dialog ───────────────────────────────────────────────

const INGEST_FORMATS = [
  { value: 'rtmp',  label: 'RTMP' },
  { value: 'rtmps', label: 'RTMPS' },
  { value: 'srt',   label: 'SRT' },
  { value: 'hls',   label: 'HLS Push' },
]

const REGIONS = [
  { value: 'us-east-1', label: 'US East (us-east-1)' },
  { value: 'eu-west-1', label: 'EU West (eu-west-1)' },
]

function CreateStreamDialog({ open, token, onClose, onCreated }) {
  const [channelType, setChannelType] = useState('live_event')
  const [title, setTitle]             = useState('')
  const [region, setRegion]           = useState('us-east-1')
  const [ingestFormat, setIngestFormat] = useState('rtmp')
  const [startDate, setStartDate]     = useState('')
  const [startTime, setStartTime]     = useState('8:00 AM')
  const [endDate, setEndDate]         = useState('')
  const [endTime, setEndTime]         = useState('5:00 PM')
  const [ingestPointId, setIngestPointId] = useState('')
  const [ingestPoints, setIngestPoints]   = useState([])
  const [loadingPoints, setLoadingPoints] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState(null)
  const [copied, setCopied]   = useState(false)

  // Reset form when dialog opens; also load ingest points
  useEffect(() => {
    if (!open) return
    setChannelType('live_event')
    setTitle('')
    setRegion('us-east-1')
    setIngestFormat('rtmp')
    setStartDate('')
    setStartTime('8:00 AM')
    setEndDate('')
    setEndTime('5:00 PM')
    setIngestPointId('')
    setError('')
    setResult(null)
    setCopied(false)

    // Fetch ingest availability on open (format may not be set yet — use rtmp default)
    loadIngestPoints('rtmp')
  }, [open, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when ingest format changes (only rtmp/srt are supported by the availability API)
  useEffect(() => {
    if (!open) return
    const fmt = ['rtmp', 'srt'].includes(ingestFormat) ? ingestFormat : 'rtmp'
    loadIngestPoints(fmt)
  }, [ingestFormat]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadIngestPoints(fmt) {
    setLoadingPoints(true)
    setIngestPointId('')
    fetch(`/api/ingest-points?ingest_format=${fmt}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setIngestPoints(data.ingest_points || []))
      .catch(() => setIngestPoints([]))
      .finally(() => setLoadingPoints(false))
  }

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const body = {
        title,
        region,
        channel_type: channelType,
        ingest_format: ingestFormat,
        ingest_point_id: ingestPointId || undefined,
      }

      if (channelType === 'live_event') {
        const startUtc = toUtcIso(startDate, startTime)
        const endUtc   = toUtcIso(endDate, endTime)
        if (!startUtc) throw new Error('Invalid start date/time — use format like "8:00 AM"')
        const minsAway = (new Date(startUtc) - Date.now()) / 60_000
        if (minsAway < 15) throw new Error('Start time must be at least 15 minutes from now')
        body.start_time_utc = startUtc
        if (endUtc) body.end_time_utc = endUtc
      }

      const res = await fetch('/api/create-stream', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`${data.error}${data.detail ? ` — ${data.detail}` : ''}`)
      setResult(data)
      onCreated(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyUrl() {
    if (result?.stream_url) {
      navigator.clipboard.writeText(result.stream_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const tzLabel = startDate ? (isEDT(startDate) ? 'EDT' : 'EST') : 'ET'

  // Warn if start time is within 15 minutes of now
  const startUtcIso = channelType === 'live_event' ? toUtcIso(startDate, startTime) : null
  const minutesUntilStart = startUtcIso ? (new Date(startUtcIso) - Date.now()) / 60_000 : null
  const tooSoon = minutesUntilStart !== null && minutesUntilStart < 15

  const isValid = title && (channelType === 'always_on' || (startDate && !tooSoon))

  // ─ label styling for section headers inside dialog
  const sectionLabel = { color: '#a8bcd4', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', mb: 0.75 }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LiveTvIcon sx={{ color: '#e65d2c', fontSize: 20 }} />
        Create Live Stream
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
        {error && <Alert severity="error" sx={{ fontSize: '0.8rem' }}>{error}</Alert>}

        {!result ? (
          <>
            {/* Channel type */}
            <Box>
              <Typography sx={sectionLabel}>CHANNEL TYPE</Typography>
              <ToggleButtonGroup
                exclusive
                value={channelType}
                onChange={(_, v) => v && setChannelType(v)}
                size="small"
                fullWidth
                sx={{
                  '& .MuiToggleButton-root': {
                    flex: 1, fontSize: '0.75rem', fontWeight: 700, borderColor: 'rgba(255,255,255,0.12)',
                    color: '#a8bcd4', textTransform: 'none', py: 0.75,
                  },
                  '& .Mui-selected': { bgcolor: 'rgba(230,93,44,0.15) !important', color: '#e65d2c !important', borderColor: 'rgba(230,93,44,0.4) !important' },
                }}
              >
                <ToggleButton value="live_event">Live Event</ToggleButton>
                <ToggleButton value="always_on">24/7 Channel</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Name */}
            <TextField
              fullWidth size="small" label="Stream Name" autoFocus
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. RI Breakers — Day 1 Camera 1"
            />

            {/* Ingest region + format side by side */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                select fullWidth size="small" label="Ingest Region"
                value={region} onChange={e => setRegion(e.target.value)}
              >
                {REGIONS.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
              <TextField
                select fullWidth size="small" label="Ingest Format"
                value={ingestFormat} onChange={e => setIngestFormat(e.target.value)}
              >
                {INGEST_FORMATS.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
              </TextField>
            </Box>

            {/* Start date/time — only for live events */}
            {channelType === 'live_event' && (
              <>
                <Box>
                  <Typography sx={sectionLabel}>START ({tzLabel})</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <TextField
                      type="date" size="small" fullWidth label="Date"
                      value={startDate} onChange={e => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      size="small" fullWidth label="Time"
                      value={startTime} onChange={e => setStartTime(e.target.value)}
                      placeholder="8:00 AM"
                      error={tooSoon}
                      helperText={
                        tooSoon
                          ? null
                          : (startDate && startTime && toUtcIso(startDate, startTime)
                              ? `UTC: ${new Date(toUtcIso(startDate, startTime)).toUTCString().replace(' GMT', ' UTC')}`
                              : null)
                      }
                    />
                  </Box>
                  {tooSoon && (
                    <Alert severity="warning" sx={{ mt: 1, fontSize: '0.78rem', py: 0.5 }}>
                      Start time must be at least 15 minutes from now.
                      {minutesUntilStart !== null && minutesUntilStart > -Infinity && (
                        <> Currently {minutesUntilStart < 0 ? `${Math.abs(Math.round(minutesUntilStart))} min in the past` : `only ${Math.round(minutesUntilStart)} min away`}.</>
                      )}
                    </Alert>
                  )}
                </Box>

                <Box>
                  <Typography sx={sectionLabel}>END ({tzLabel})</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <TextField
                      type="date" size="small" fullWidth label="Date"
                      value={endDate} onChange={e => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      size="small" fullWidth label="Time"
                      value={endTime} onChange={e => setEndTime(e.target.value)}
                      placeholder="5:00 PM"
                      helperText={endDate && endTime && toUtcIso(endDate, endTime)
                        ? `UTC: ${new Date(toUtcIso(endDate, endTime)).toUTCString().replace(' GMT', ' UTC')}`
                        : null}
                    />
                  </Box>
                </Box>
              </>
            )}

            {/* Ingest point availability */}
            <Box>
              <Typography sx={sectionLabel}>INGEST POINT (optional)</Typography>
              {loadingPoints ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                  <CircularProgress size={14} sx={{ color: '#a8bcd4' }} />
                  <Typography variant="caption" sx={{ color: '#a8bcd4' }}>Loading available ingest points…</Typography>
                </Box>
              ) : ingestPoints.length > 0 ? (
                <TextField
                  select fullWidth size="small" label="Ingest Point"
                  value={ingestPointId} onChange={e => setIngestPointId(e.target.value)}
                  helperText="Filtered by selected ingest format"
                >
                  <MenuItem value="">— Auto-assign —</MenuItem>
                  {ingestPoints.map(p => (
                    <MenuItem key={p.id} value={p.id} disabled={!p.available}>
                      {p.name}
                      {!p.available ? ' — unavailable' : p.attached ? ' — in use' : ' — available'}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  fullWidth size="small" label="Ingest Point ID"
                  value={ingestPointId} onChange={e => setIngestPointId(e.target.value)}
                  placeholder="Leave blank to auto-assign"
                  helperText="No ingest points returned — enter an ID manually or leave blank"
                />
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Alert severity="success" sx={{ fontSize: '0.8rem' }}>
              Live stream <strong>{result.name}</strong> created successfully.
            </Alert>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1.5, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#a8bcd4', fontWeight: 700, letterSpacing: '0.08em' }}>STREAM ID</Typography>
                <Typography variant="caption" sx={{ color: '#fff', fontFamily: 'monospace' }}>{result.id}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#a8bcd4', fontWeight: 700, letterSpacing: '0.08em' }}>TYPE</Typography>
                <Typography variant="caption" sx={{ color: '#fff', fontFamily: 'monospace' }}>{result.stream_type || '—'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: '#a8bcd4', fontWeight: 700, letterSpacing: '0.08em' }}>STATUS</Typography>
                <Chip label={result.status || 'creating'} size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.06)', color: '#a8bcd4' }} />
              </Box>
              {result.stream_url && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#a8bcd4', fontWeight: 700, letterSpacing: '0.08em', display: 'block', mb: 0.5 }}>STREAM URL</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1, px: 1.5, py: 0.75 }}>
                    <Typography variant="caption" sx={{ color: '#e65d2c', fontFamily: 'monospace', fontSize: '0.65rem', flex: 1, wordBreak: 'break-all' }}>
                      {result.stream_url}
                    </Typography>
                    <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
                      <IconButton size="small" onClick={copyUrl} sx={{ color: copied ? '#4caf50' : '#a8bcd4', flexShrink: 0 }}>
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#a8bcd4' }}>{result ? 'Close' : 'Cancel'}</Button>
        {!result && (
          <Button
            onClick={handleCreate}
            disabled={!isValid || loading}
            variant="contained"
            sx={{ bgcolor: '#e65d2c', '&:hover': { bgcolor: '#c94e24' } }}
          >
            {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ token, onLogout }) {
  const [events, setEvents] = useState([])
  const [channels, setChannels] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [error, setError] = useState('')
  const [channelError, setChannelError] = useState('')

  const [eventDialog, setEventDialog] = useState({ open: false, initial: null })
  const [pickerDialog, setPickerDialog] = useState({ open: false, slot: null, event: null })
  const [createStreamOpen, setCreateStreamOpen] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true)
    try {
      const res = await fetch('/api/schedule')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load schedule')
      setEvents(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingEvents(false)
    }
  }, [])

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true)
    setChannelError('')
    try {
      const res = await fetch('/api/channels', { headers: authHeader(token) })
      const data = await res.json()
      if (!res.ok) throw new Error(`${data.error}${data.detail ? ` — ${data.detail}` : ''}`)
      setChannels(data.channels || [])
    } catch (err) {
      setChannelError(err.message)
    } finally {
      setLoadingChannels(false)
    }
  }, [token])

  useEffect(() => {
    fetchEvents()
    fetchChannels()
  }, [fetchEvents, fetchChannels])

  async function saveEvent(form) {
    const isEdit = !!form.id
    const res = await fetch('/api/schedule', {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeader(token),
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    await fetchEvents()
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return
    await fetch('/api/schedule', {
      method: 'DELETE',
      headers: authHeader(token),
      body: JSON.stringify({ id }),
    })
    await fetchEvents()
  }

  async function assignCamera(slot, picked) {
    const ev = pickerDialog.event
    if (!ev) return
    const url = picked?.url ?? null
    const name = picked?.name ?? null
    await fetch('/api/schedule', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify({
        id: ev.id,
        camera1_url:  slot === 1 ? url  : ev.camera1_url,
        camera1_name: slot === 1 ? name : ev.camera1_name,
        camera2_url:  slot === 2 ? url  : ev.camera2_url,
        camera2_name: slot === 2 ? name : ev.camera2_name,
      }),
    })
    setPickerDialog({ open: false, slot: null, event: null })
    await fetchEvents()
  }

  function openPicker(event, slot) {
    setPickerDialog({ open: true, slot, event })
  }

  async function deleteChannel(id, name) {
    if (!confirm(`Destroy stream "${name}"?\n\nThis cannot be undone.`)) return
    try {
      const res = await fetch('/api/delete-stream', {
        method: 'DELETE',
        headers: authHeader(token),
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`${data.error}${data.detail ? ` — ${data.detail}` : ''}`)
      await fetchChannels()
    } catch (err) {
      alert(`Failed to delete stream: ${err.message}`)
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function shortUrl(url) {
    if (!url) return null
    try {
      const u = new URL(url)
      return u.pathname.split('/').pop() || url
    } catch {
      return url.slice(-20)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <AppBar position="sticky" elevation={0}
        sx={{ background: 'linear-gradient(90deg, #060e24 0%, #0a205a 60%, #060e24 100%)', borderBottom: '2px solid #e65d2c' }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: { xs: 56, sm: 64 } }}>
          <Box
            component="img"
            src="https://ribreakersac.com/cdn/shop/files/RI-Breakers-Logo-WHITE.png?v=1774997726&width=200"
            alt="RI Breakers"
            sx={{ width: 40, height: 40, objectFit: 'contain' }}
          />
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.08em', flexGrow: 1, fontSize: '1rem' }}>
            ADMIN DASHBOARD
          </Typography>
          <Tooltip title="Go to live site">
            <Button component="a" href="/" size="small" sx={{ color: '#a8bcd4', fontSize: '0.72rem' }}>
              Live Site
            </Button>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={onLogout} sx={{ color: '#a8bcd4' }}>
              <LogoutIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Schedule ─────────────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
          {/* header */}
          <Box sx={{
            px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(90deg, rgba(230,93,44,0.08) 0%, transparent 60%)',
          }}>
            <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>
              SCHEDULE
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={fetchEvents} sx={{ color: '#a8bcd4' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={() => setEventDialog({ open: true, initial: null })}
                sx={{ fontSize: '0.72rem', borderColor: 'rgba(230,93,44,0.4)', color: '#e65d2c', '&:hover': { borderColor: '#e65d2c' } }}
              >
                Add Event
              </Button>
            </Box>
          </Box>

          {loadingEvents ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: '#e65d2c' }} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: '#a8bcd4', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.05)' } }}>
                  <TableCell>EVENT</TableCell>
                  <TableCell>DATE</TableCell>
                  <TableCell>TIME</TableCell>
                  <TableCell>CAMERA 1</TableCell>
                  <TableCell>CAMERA 2</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map(ev => (
                  <TableRow key={ev.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 1.25 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{ev.label}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#a8bcd4' }}>{formatDate(ev.date)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#a8bcd4' }}>{ev.start_time} – {ev.end_time} {ev.tz}</Typography>
                    </TableCell>
                    {[1, 2].map(slot => {
                      const url  = slot === 1 ? ev.camera1_url  : ev.camera2_url
                      const name = slot === 1 ? ev.camera1_name : ev.camera2_name
                      return (
                        <TableCell key={slot}>
                          <Box
                            onClick={() => openPicker(ev, slot)}
                            sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.75,
                              cursor: 'pointer', px: 1, py: 0.5, borderRadius: 1,
                              border: '1px solid',
                              borderColor: url ? 'rgba(76,175,80,0.5)' : 'rgba(255,255,255,0.1)',
                              bgcolor: url ? 'rgba(76,175,80,0.07)' : 'transparent',
                              '&:hover': { borderColor: url ? '#4caf50' : '#e65d2c', bgcolor: url ? 'rgba(76,175,80,0.12)' : 'rgba(230,93,44,0.06)' },
                            }}
                          >
                            {url ? (
                              <>
                                <CheckCircleIcon sx={{ fontSize: 14, color: '#4caf50', flexShrink: 0 }} />
                                <Box>
                                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.72rem', display: 'block', lineHeight: 1.3 }}>
                                    {name || shortUrl(url)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.55)', fontFamily: 'monospace', fontSize: '0.6rem', display: 'block', lineHeight: 1.2 }}>
                                    {shortUrl(url)}
                                  </Typography>
                                </Box>
                              </>
                            ) : (
                              <>
                                <VideocamIcon sx={{ fontSize: 13, color: 'rgba(168,188,212,0.4)' }} />
                                <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.4)', fontSize: '0.68rem' }}>Unassigned</Typography>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      )
                    })}
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setEventDialog({ open: true, initial: ev })} sx={{ color: '#a8bcd4', '&:hover': { color: '#fff' } }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => deleteEvent(ev.id)} sx={{ color: '#a8bcd4', '&:hover': { color: '#f44336' } }}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── JW Live Channels ─────────────────────── */}
        <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{
            px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(90deg, rgba(230,93,44,0.08) 0%, transparent 60%)',
          }}>
            <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>
              JW LIVE CHANNELS
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh channels">
                <IconButton size="small" onClick={fetchChannels} sx={{ color: '#a8bcd4' }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                startIcon={<LiveTvIcon sx={{ fontSize: '14px !important' }} />}
                variant="outlined"
                onClick={() => setCreateStreamOpen(true)}
                sx={{ fontSize: '0.72rem', borderColor: 'rgba(230,93,44,0.4)', color: '#e65d2c', '&:hover': { borderColor: '#e65d2c' } }}
              >
                New Live Stream
              </Button>
            </Box>
          </Box>

          {channelError && (
            <Alert severity="warning" sx={{ m: 2, fontSize: '0.8rem' }}>{channelError}</Alert>
          )}

          {loadingChannels ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: '#e65d2c' }} />
            </Box>
          ) : channels.length === 0 && !channelError ? (
            <Typography variant="body2" sx={{ color: '#a8bcd4', textAlign: 'center', py: 3 }}>
              No live channels found in your JW account.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: '#a8bcd4', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.05)' } }}>
                  <TableCell>CHANNEL</TableCell>
                  <TableCell>STATUS</TableCell>
                  <TableCell>START</TableCell>
                  <TableCell>END</TableCell>
                  <TableCell>STREAM URL</TableCell>
                  <TableCell>INGEST</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {channels.map(ch => {
                  const isLive = ch.status === 'active'
                  const STATUS_LABELS = {
                    requested:  'Scheduled',
                    scheduled:  'Scheduled',
                    creating:   'Creating',
                    active:     'Live',
                    idle:       'Idle',
                    stopping:   'Stopping',
                    destroying: 'Destroying',
                  }
                  const statusLabel = STATUS_LABELS[ch.status?.toLowerCase()] || ch.status || 'Idle'
                  const fmtTime = iso => {
                    if (!iso) return '—'
                    return new Date(iso).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      timeZone: 'America/New_York', timeZoneName: 'short',
                    })
                  }
                  return (
                    <TableRow key={ch.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 1.25 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>{ch.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontFamily: 'monospace', fontSize: '0.62rem' }}>
                          {ch.id}{ch.stream_type ? ` · ${ch.stream_type}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusLabel}
                          size="small"
                          sx={{
                            height: 18, fontSize: '0.6rem', fontWeight: 700,
                            bgcolor: isLive ? 'rgba(230,93,44,0.2)' : ch.status === 'requested' ? 'rgba(33,150,243,0.15)' : 'rgba(255,255,255,0.06)',
                            color: isLive ? '#e65d2c' : ch.status === 'requested' ? '#64b5f6' : '#a8bcd4',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.68rem' }}>{fmtTime(ch.stream_start)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.68rem' }}>{fmtTime(ch.stream_end)}</Typography>
                      </TableCell>
                      <TableCell>
                        {ch.stream_url
                          ? <Typography variant="caption" sx={{ color: '#a8bcd4', fontFamily: 'monospace', fontSize: '0.65rem', wordBreak: 'break-all' }}>{ch.stream_url}</Typography>
                          : <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.3)', fontSize: '0.65rem' }}>—</Typography>
                        }
                      </TableCell>
                      <TableCell>
                        {ch.ingest_url ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.6rem', width: 28 }}>URL</Typography>
                              <Typography variant="caption" sx={{ color: '#a8bcd4', fontFamily: 'monospace', fontSize: '0.6rem', wordBreak: 'break-all' }}>{ch.ingest_url}</Typography>
                              <Tooltip title="Copy ingest URL">
                                <IconButton size="small" onClick={() => navigator.clipboard.writeText(ch.ingest_url)} sx={{ color: '#a8bcd4', flexShrink: 0, p: 0.25 }}>
                                  <ContentCopyIcon sx={{ fontSize: 11 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.6rem', width: 28 }}>KEY</Typography>
                              <Typography variant="caption" sx={{ color: '#e65d2c', fontFamily: 'monospace', fontSize: '0.6rem' }}>{ch.ingest_key}</Typography>
                              <Tooltip title="Copy stream key">
                                <IconButton size="small" onClick={() => navigator.clipboard.writeText(ch.ingest_key)} sx={{ color: '#a8bcd4', flexShrink: 0, p: 0.25 }}>
                                  <ContentCopyIcon sx={{ fontSize: 11 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.3)', fontSize: '0.65rem' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Delete stream">
                          <IconButton
                            size="small"
                            onClick={() => deleteChannel(ch.id, ch.name)}
                            sx={{ color: '#a8bcd4', '&:hover': { color: '#f44336' } }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Paper>

      </Box>

      {/* Dialogs */}
      <EventDialog
        open={eventDialog.open}
        initial={eventDialog.initial}
        onClose={() => setEventDialog({ open: false, initial: null })}
        onSave={saveEvent}
      />
      <ChannelPickerDialog
        open={pickerDialog.open}
        slot={pickerDialog.slot}
        event={pickerDialog.event}
        channels={channels}
        onClose={() => setPickerDialog({ open: false, slot: null, event: null })}
        onPick={picked => assignCamera(pickerDialog.slot, picked)}
      />
      <CreateStreamDialog
        open={createStreamOpen}
        token={token}
        onClose={() => setCreateStreamOpen(false)}
        onCreated={() => fetchChannels()}
      />
    </Box>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY) || '')

  function handleLogin(t) {
    setToken(t)
  }

  function handleLogout() {
    sessionStorage.removeItem(SESSION_KEY)
    setToken('')
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {token
        ? <Dashboard token={token} onLogout={handleLogout} />
        : <LoginScreen onLogin={handleLogin} />
      }
    </ThemeProvider>
  )
}
