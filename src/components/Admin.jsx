import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  Alert, IconButton, Chip, Divider, Tooltip, Snackbar, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableHead, TableRow,
  AppBar, Toolbar, Stack, ToggleButton, ToggleButtonGroup, MenuItem,
  Tabs, Tab, Switch,
} from '@mui/material'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import LogoutIcon from '@mui/icons-material/Logout'
import RefreshIcon from '@mui/icons-material/Refresh'
import VideocamIcon from '@mui/icons-material/Videocam'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SettingsIcon from '@mui/icons-material/Settings'
import PaletteIcon from '@mui/icons-material/Palette'
import CloseIcon from '@mui/icons-material/Close'

const SESSION_KEY = 'ri_admin_token'

// ─── Admin SaaS palette ───────────────────────────────────────────────────────

const AP = {
  accent:    '#6366f1',
  accentHov: '#4f46e5',
  accentDim: 'rgba(99,102,241,0.08)',
  accentMid: 'rgba(99,102,241,0.15)',
  accentBdr: 'rgba(99,102,241,0.3)',
  accentBdr2:'rgba(99,102,241,0.5)',
  live:      '#10b981',
  liveDim:   'rgba(16,185,129,0.15)',
  liveBdr:   'rgba(16,185,129,0.4)',
  warn:      '#f59e0b',
  warnDim:   'rgba(245,158,11,0.12)',
  slate:     '#64748b',
  slateDim:  'rgba(100,116,139,0.15)',
  bg:        '#0f1117',
  paper:     '#161b2e',
  muted:     '#94a3b8',
  text:      '#e2e8f0',
}

const adminTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: AP.accent, contrastText: '#fff' },
    background: { default: AP.bg, paper: AP.paper },
    text:       { primary: AP.text, secondary: AP.muted },
    divider:    'rgba(255,255,255,0.08)',
  },
  typography: { fontFamily: "'Poppins', sans-serif" },
  shape: { borderRadius: 8 },
  components: {
    MuiButton:  { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiPaper:   { styleOverrides: { root: { backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.07)' } } },
    MuiTab:     { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
  },
})

// ─── JW Player lib ────────────────────────────────────────────────────────────

const JW_PLAYER_LIB = 'https://cdn.jwplayer.com/libraries/xJKVL03e.js'
const PREVIEW_DIV_ID = 'jw-admin-preview'

function loadJWScript() {
  return new Promise((resolve, reject) => {
    if (window.jwplayer) { resolve(window.jwplayer); return }
    const existing = document.querySelector(`script[src="${JW_PLAYER_LIB}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.jwplayer))
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.src = JW_PLAYER_LIB; s.async = true
    s.onload = () => resolve(window.jwplayer)
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function authHeader(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
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

function getTournamentDateRange(tournament) {
  if (!tournament.days?.length) return null
  const dates = tournament.days.map(d => d.date).sort()
  const fmt = ds => new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const start = fmt(dates[0])
  const end   = fmt(dates[dates.length - 1])
  const year  = new Date(dates[0] + 'T12:00:00').getFullYear()
  return start === end ? `${start}, ${year}` : `${start} – ${end}, ${year}`
}

// ─── Spin-up status (admin preview window = ±30 min) ─────────────────────────

const SPINUP_MINS = 30

function getSpinupStatus(ch) {
  if (!ch.stream_start) return null
  const now   = Date.now()
  const start = new Date(ch.stream_start).getTime()
  const end   = ch.stream_end ? new Date(ch.stream_end).getTime() : null
  const minsToStart   = (start - now) / 60_000
  const minsAfterEnd  = end ? (now - end) / 60_000 : null
  if (minsToStart > 0 && minsToStart <= SPINUP_MINS)                       return 'starting_soon'
  if (minsAfterEnd !== null && minsAfterEnd >= 0 && minsAfterEnd <= SPINUP_MINS) return 'winding_down'
  return null
}

// ─── Cost helpers ─────────────────────────────────────────────────────────────

const RATES = { storage: 5, ingestion: 8, playout: 6 }   // $/hr
const FIXED_RATE = RATES.storage + RATES.ingestion + RATES.playout  // $19/hr

function calcChannelCost(ch) {
  if (!ch.stream_start) return null
  const start = new Date(ch.stream_start)
  const end = ch.stream_end ? new Date(ch.stream_end) : new Date()
  const hours = Math.max(0, (end - start) / 3_600_000)
  return {
    hours,
    storage:   hours * RATES.storage,
    ingestion: hours * RATES.ingestion,
    playout:   hours * RATES.playout,
    total:     hours * FIXED_RATE,
  }
}

function fmtUSD(n) {
  return '$' + n.toFixed(2)
}

// Group a list of channels into { dateLabel → { hours, storage, ingestion, playout, total, count } }
function calcDailyCosts(channels) {
  const map = {}
  channels.forEach(ch => {
    const cost = calcChannelCost(ch)
    if (!cost || !ch.stream_start) return
    const dateLabel = new Date(ch.stream_start).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York',
    })
    if (!map[dateLabel]) map[dateLabel] = { hours: 0, storage: 0, ingestion: 0, playout: 0, total: 0, count: 0 }
    const d = map[dateLabel]
    d.hours     += cost.hours
    d.storage   += cost.storage
    d.ingestion += cost.ingestion
    d.playout   += cost.playout
    d.total     += cost.total
    d.count++
  })
  return Object.entries(map)
}

// ─── Cost Record dialog ───────────────────────────────────────────────────────

const EMPTY_COST_RECORD = { date: '', label: '', channel_count: 2, start_time: '8:00 AM', end_time: '5:00 PM' }

function CostRecordDialog({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_COST_RECORD)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial
      ? { date: initial.date, label: initial.label, channel_count: initial.channel_count, start_time: initial.start_time, end_time: initial.end_time }
      : EMPTY_COST_RECORD)
  }, [initial, open])

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSave() {
    setSaving(true)
    try { await onSave(form); onClose() } finally { setSaving(false) }
  }

  function parseH(t) {
    const m = t?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
    if (!m) return 0
    let h = parseInt(m[1]); const ap = m[3]?.toUpperCase()
    if (ap === 'PM' && h !== 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    return h + parseInt(m[2]) / 60
  }
  const hrs = Math.max(0, parseH(form.end_time) - parseH(form.start_time)) * Number(form.channel_count || 0)
  const preview = hrs > 0 ? fmtUSD(hrs * FIXED_RATE) : null

  const isValid = form.date && form.label && form.channel_count > 0 && form.start_time && form.end_time

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 1 }}>
        {initial?.id ? 'Edit Historical Entry' : 'Add Historical Entry'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField label="Date" type="date" size="small" fullWidth value={form.date} onChange={set('date')} InputLabelProps={{ shrink: true }} />
        <TextField label="Label" size="small" fullWidth value={form.label} onChange={set('label')} placeholder="e.g. Pro/Am" />
        <TextField label="# of Channels" type="number" size="small" fullWidth value={form.channel_count} onChange={set('channel_count')}
          inputProps={{ min: 1, max: 10 }} />
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField label="Start" size="small" fullWidth value={form.start_time} onChange={set('start_time')} placeholder="8:00 AM" />
          <TextField label="End"   size="small" fullWidth value={form.end_time}   onChange={set('end_time')}   placeholder="5:00 PM" />
        </Box>
        {preview && (
          <Box sx={{ bgcolor: AP.accentDim, border: `1px solid ${AP.accentBdr}`, borderRadius: 1.5, px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: AP.muted }}>{hrs.toFixed(1)} channel-hrs × ${FIXED_RATE}/hr</Typography>
            <Typography sx={{ color: AP.accent, fontWeight: 700, fontSize: '0.9rem' }}>{preview}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#a8bcd4' }}>Cancel</Button>
        <Button onClick={handleSave} disabled={!isValid || saving} variant="contained"
          sx={{ bgcolor: AP.accent, '&:hover': { bgcolor: AP.accentHov } }}>
          {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
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
            sx={{ width: 64, height: 64, objectFit: 'contain', filter: `drop-shadow(0 0 10px ${AP.accentBdr})` }}
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
          sx={{ bgcolor: AP.accent, '&:hover': { bgcolor: AP.accentHov }, fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Sign In'}
        </Button>
      </Paper>
    </Box>
  )
}

// ─── Tournament dialog (create / edit) ────────────────────────────────────────

const EMPTY_TOURNAMENT = { name: '', location: '' }

function TournamentDialog({ open, initial, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_TOURNAMENT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial ? { name: initial.name || '', location: initial.location || '' } : EMPTY_TOURNAMENT)
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmojiEventsIcon sx={{ color: AP.accent, fontSize: 20 }} />
        {initial?.id ? 'Edit Tournament' : 'New Tournament'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField label="Tournament Name" value={form.name} onChange={set('name')} size="small" fullWidth autoFocus
          placeholder="e.g. Key West Classic" />
        <TextField label="Location" value={form.location} onChange={set('location')} size="small" fullWidth
          placeholder="e.g. Key West, FL" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#a8bcd4' }}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={!form.name || saving}
          variant="contained"
          sx={{ bgcolor: AP.accent, '&:hover': { bgcolor: AP.accentHov } }}
        >
          {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Day dialog (create / edit within a tournament) ───────────────────────────

const EMPTY_DAY = { label: '', date: '', start_time: '8:00 AM', end_time: '5:00 PM', tz: 'EDT' }

function DayDialog({ open, initial, tournamentName, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_DAY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial
      ? { label: initial.label, date: initial.date, start_time: initial.start_time, end_time: initial.end_time, tz: initial.tz || 'EDT' }
      : EMPTY_DAY)
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
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 0.5 }}>
        {initial?.id ? 'Edit Day' : 'Add Day'}
        {tournamentName && (
          <Typography component="span" sx={{ color: '#a8bcd4', fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif', fontWeight: 400, ml: 1 }}>
            — {tournamentName}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField label="Label" value={form.label} onChange={set('label')} size="small" fullWidth autoFocus placeholder="e.g. Day 1" />
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
          sx={{ bgcolor: AP.accent, '&:hover': { bgcolor: AP.accentHov } }}
        >
          {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Channel picker dialog ────────────────────────────────────────────────────

function ChannelPickerDialog({ open, slot, day, channels, onClose, onPick }) {
  const currentUrl = slot === 1 ? day?.camera1_url : day?.camera2_url

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 0 }}>
        Assign Channel → {day?.label} · Camera {slot}
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        {currentUrl && (
          <Box sx={{ mb: 1.5, px: 1.5, py: 1, bgcolor: AP.accentDim, border: `1px solid ${AP.accentBdr}`, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 14, color: AP.accent, flexShrink: 0 }} />
            <Box>
              <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.62rem', display: 'block' }}>CURRENTLY ASSIGNED</Typography>
              <Typography variant="caption" sx={{ color: AP.accent, fontWeight: 700, fontSize: '0.75rem' }}>
                {(slot === 1 ? day?.camera1_name : day?.camera2_name) || currentUrl}
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
            {[...channels].sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(ch => {
              const isLive   = ch.status === 'active'
              const isActive = ch.stream_url === currentUrl && !!currentUrl
              const STATUS_LABELS = { requested: 'Scheduled', scheduled: 'Scheduled', creating: 'Creating', active: 'Live', idle: 'Idle', stopping: 'Stopping', destroying: 'Destroying' }
              const statusLabel = STATUS_LABELS[ch.status?.toLowerCase()] || ch.status || 'Idle'
              return (
                <Paper
                  key={ch.id}
                  onClick={() => ch.stream_url && onPick({ url: ch.stream_url, name: ch.name })}
                  elevation={0}
                  sx={{
                    p: 1.5, borderRadius: 1.5,
                    border: `1px solid ${isActive ? AP.accentBdr2 : 'rgba(255,255,255,0.07)'}`,
                    bgcolor: isActive ? AP.accentDim : 'transparent',
                    cursor: ch.stream_url ? 'pointer' : 'default',
                    opacity: ch.stream_url ? 1 : 0.5,
                    '&:hover': ch.stream_url ? { borderColor: AP.accent, bgcolor: AP.accentDim } : {},
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      {isActive && <CheckCircleIcon sx={{ fontSize: 14, color: AP.accent, flexShrink: 0 }} />}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: isActive ? AP.accent : '#fff' }}>{ch.name}</Typography>
                        {ch.stream_url
                          ? <Typography variant="caption" sx={{ color: '#a8bcd4', fontFamily: 'monospace', fontSize: '0.62rem', wordBreak: 'break-all' }}>{ch.stream_url}</Typography>
                          : <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.65rem' }}>No stream URL available</Typography>
                        }
                      </Box>
                    </Box>
                    <Chip
                      label={statusLabel}
                      size="small"
                      sx={{
                        height: 18, fontSize: '0.6rem', fontWeight: 700,
                        bgcolor: isLive ? AP.liveDim : 'rgba(255,255,255,0.06)',
                        color:  isLive ? AP.live   : AP.muted,
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

function isEDT(dateStr) {
  const month = parseInt(dateStr.split('-')[1], 10)
  return month >= 3 && month <= 11
}

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
    loadIngestPoints('rtmp')
  }, [open, token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    loadIngestPoints()
  }, [ingestFormat, startDate, startTime, endDate, endTime]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadIngestPoints() {
    const fmt      = ['rtmp', 'srt'].includes(ingestFormat) ? ingestFormat : 'rtmp'
    const startUtc = toUtcIso(startDate, startTime)
    const endUtc   = toUtcIso(endDate, endTime)
    setLoadingPoints(true)
    setIngestPointId('')
    let url = `/api/ingest-points?ingest_format=${fmt}`
    if (startUtc) url += `&start_date=${encodeURIComponent(startUtc)}`
    if (endUtc)   url += `&end_date=${encodeURIComponent(endUtc)}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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
  const startUtcIso = channelType === 'live_event' ? toUtcIso(startDate, startTime) : null
  const minutesUntilStart = startUtcIso ? (new Date(startUtcIso) - Date.now()) / 60_000 : null
  const tooSoon = minutesUntilStart !== null && minutesUntilStart < 15
  const isValid = title && (channelType === 'always_on' || (startDate && !tooSoon))
  const sectionLabel = { color: '#a8bcd4', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', mb: 0.75 }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LiveTvIcon sx={{ color: AP.accent, fontSize: 20 }} />
        Create Live Stream
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
        {error && <Alert severity="error" sx={{ fontSize: '0.8rem' }}>{error}</Alert>}

        {!result ? (
          <>
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
                  '& .Mui-selected': { bgcolor: `${AP.accentMid} !important`, color: `${AP.accent} !important`, borderColor: `${AP.accentBdr} !important` },
                }}
              >
                <ToggleButton value="live_event">Live Event</ToggleButton>
                <ToggleButton value="always_on">24/7 Channel</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              fullWidth size="small" label="Stream Name" autoFocus
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. RI Breakers — Day 1 Camera 1"
            />

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

            {channelType === 'live_event' && (
              <>
                <Box>
                  <Typography sx={sectionLabel}>START ({tzLabel})</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <TextField type="date" size="small" fullWidth label="Date"
                      value={startDate} onChange={e => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField size="small" fullWidth label="Time"
                      value={startTime} onChange={e => setStartTime(e.target.value)}
                      placeholder="8:00 AM" error={tooSoon}
                      helperText={
                        tooSoon ? null
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
                    <TextField type="date" size="small" fullWidth label="Date"
                      value={endDate} onChange={e => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField size="small" fullWidth label="Time"
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
                  helperText={startDate ? 'Availability checked against your selected time window' : 'Set start/end time to check time-based availability'}
                >
                  <MenuItem value="">— Auto-assign —</MenuItem>
                  {ingestPoints.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}{p.available ? ' — available' : ' — in use'}
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
                <Chip
                  label={{ requested: 'Scheduled', scheduled: 'Scheduled', creating: 'Creating', active: 'Live', idle: 'Idle' }[result.status] || result.status || 'Creating'}
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.06)', color: '#a8bcd4' }}
                />
              </Box>
              {result.stream_url && (
                <Box>
                  <Typography variant="caption" sx={{ color: '#a8bcd4', fontWeight: 700, letterSpacing: '0.08em', display: 'block', mb: 0.5 }}>STREAM URL</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1, px: 1.5, py: 0.75 }}>
                    <Typography variant="caption" sx={{ color: AP.accent, fontFamily: 'monospace', fontSize: '0.65rem', flex: 1, wordBreak: 'break-all' }}>
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
            sx={{ bgcolor: AP.accent, '&:hover': { bgcolor: AP.accentHov } }}
          >
            {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── Tournament card (with collapsible days table) ────────────────────────────

function TournamentCard({ tournament, channels, token, onRefresh, onAddDay, onEditDay, onDeleteDay, onOpenPicker, onEditTournament, onDeleteTournament }) {
  const [expanded, setExpanded] = useState(true)

  const dateRange = getTournamentDateRange(tournament)

  return (
    <Paper
      elevation={0}
      sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', mb: 2 }}
    >
      {/* Tournament header row */}
      <Box
        sx={{
          px: 2, py: 1.5,
          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
          background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 70%)`,
          borderBottom: expanded ? '1px solid rgba(255,255,255,0.07)' : 'none',
          cursor: 'pointer',
          '&:hover': { background: `linear-gradient(90deg, ${AP.accentMid} 0%, transparent 70%)` },
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <IconButton size="small" sx={{ color: AP.accent, p: 0, mr: 0.5 }} onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 20 }} /> : <ExpandMoreIcon sx={{ fontSize: 20 }} />}
        </IconButton>

        <EmojiEventsIcon sx={{ color: AP.accent, fontSize: 18, flexShrink: 0 }} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2 }}>
            {tournament.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
            {tournament.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <LocationOnIcon sx={{ fontSize: 12, color: '#a8bcd4' }} />
                <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.7rem' }}>{tournament.location}</Typography>
              </Box>
            )}
            {dateRange && (
              <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.6)', fontSize: '0.7rem' }}>
                {tournament.location ? '·' : ''} {dateRange}
              </Typography>
            )}
            <Chip
              label={`${tournament.days?.length || 0} day${(tournament.days?.length || 0) !== 1 ? 's' : ''}`}
              size="small"
              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.07)', color: '#a8bcd4' }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }} onClick={e => e.stopPropagation()}>
          <Tooltip title="Add day">
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: '14px !important' }} />}
              variant="outlined"
              onClick={() => onAddDay(tournament)}
              sx={{ fontSize: '0.7rem', py: 0.3, px: 1, borderColor: AP.accentBdr, color: AP.accent, '&:hover': { borderColor: AP.accent } }}
            >
              Add Day
            </Button>
          </Tooltip>
          <Tooltip title="Edit tournament">
            <IconButton size="small" onClick={() => onEditTournament(tournament)} sx={{ color: '#a8bcd4', '&:hover': { color: '#fff' } }}>
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete tournament">
            <IconButton size="small" onClick={() => onDeleteTournament(tournament)} sx={{ color: '#a8bcd4', '&:hover': { color: '#f44336' } }}>
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Days table (collapsible) */}
      <Collapse in={expanded}>
        {!tournament.days?.length ? (
          <Box sx={{ px: 3, py: 2.5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(168,188,212,0.5)', fontStyle: 'italic', fontSize: '0.82rem' }}>
              No days scheduled. Click "Add Day" to get started.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { color: '#a8bcd4', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.05)' } }}>
                <TableCell>DAY</TableCell>
                <TableCell>DATE</TableCell>
                <TableCell>TIME</TableCell>
                <TableCell>CAMERA 1</TableCell>
                <TableCell>CAMERA 2</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {tournament.days.map(day => (
                <TableRow key={day.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 1.25 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{day.label}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: '#a8bcd4' }}>{formatDate(day.date)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: '#a8bcd4' }}>{day.start_time} – {day.end_time} {day.tz}</Typography>
                  </TableCell>

                  {[1, 2].map(slot => {
                    const url  = slot === 1 ? day.camera1_url  : day.camera2_url
                    const name = slot === 1 ? day.camera1_name : day.camera2_name
                    return (
                      <TableCell key={slot}>
                        <Box
                          onClick={() => onOpenPicker(day, tournament.id, slot)}
                          sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.75,
                            cursor: 'pointer', px: 1, py: 0.5, borderRadius: 1,
                            border: '1px solid',
                            borderColor: url ? 'rgba(76,175,80,0.5)' : 'rgba(255,255,255,0.1)',
                            bgcolor: url ? 'rgba(76,175,80,0.07)' : 'transparent',
                            '&:hover': { borderColor: url ? '#4caf50' : AP.accent, bgcolor: url ? 'rgba(76,175,80,0.12)' : AP.accentDim },
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
                      <Tooltip title="Edit day">
                        <IconButton size="small" onClick={() => onEditDay(day, tournament)} sx={{ color: '#a8bcd4', '&:hover': { color: '#fff' } }}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete day">
                        <IconButton size="small" onClick={() => onDeleteDay(day, tournament)} sx={{ color: '#a8bcd4', '&:hover': { color: '#f44336' } }}>
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
      </Collapse>
    </Paper>
  )
}

// ─── Tournament cost card ─────────────────────────────────────────────────────

function TournamentCostCard({ tournament }) {
  const [expanded, setExpanded] = useState(true)
  const dateRange = getTournamentDateRange(tournament)
  const hasCost   = tournament.tournamentTotal > 0

  function fmtUSD(n) { return '$' + Number(n || 0).toFixed(2) }
  function fmtGB(n)  { return Number(n || 0).toFixed(2) + ' GB' }

  const statusChip = (source) => {
    const cfg = {
      logged:    { label: 'LOGGED',    bg: AP.accentDim,                     color: AP.accent, border: AP.accentBdr },
      live:      { label: 'LIVE',      bg: 'rgba(16,185,129,0.15)',           color: '#10b981', border: 'rgba(16,185,129,0.4)' },
      pending:   { label: 'PENDING',   bg: 'rgba(245,158,11,0.12)',           color: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
      scheduled: { label: 'SCHEDULED', bg: 'rgba(99,102,241,0.1)',            color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
      none:      { label: 'NO DATA',   bg: 'rgba(168,188,212,0.06)',          color: 'rgba(168,188,212,0.35)', border: 'rgba(168,188,212,0.15)' },
    }[source] || {}
    return (
      <Chip label={cfg.label} size="small" sx={{
        fontSize: '0.57rem', height: 16, fontWeight: 700, letterSpacing: '0.05em',
        bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      }} />
    )
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
      {/* Card header */}
      <Box
        sx={{
          px: 2, py: 1.5,
          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
          background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 70%)`,
          borderBottom: expanded ? '1px solid rgba(255,255,255,0.07)' : 'none',
          cursor: 'pointer',
          '&:hover': { background: `linear-gradient(90deg, ${AP.accentMid} 0%, transparent 70%)` },
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <IconButton size="small" sx={{ color: AP.accent, p: 0, mr: 0.5 }} onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 20 }} /> : <ExpandMoreIcon sx={{ fontSize: 20 }} />}
        </IconButton>
        <EmojiEventsIcon sx={{ color: AP.accent, fontSize: 18, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', lineHeight: 1.2 }}>{tournament.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
            {tournament.location && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <LocationOnIcon sx={{ fontSize: 12, color: '#a8bcd4' }} />
                <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.7rem' }}>{tournament.location}</Typography>
              </Box>
            )}
            {dateRange && (
              <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.6)', fontSize: '0.7rem' }}>
                {tournament.location ? '·' : ''} {dateRange}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{
            color: hasCost ? AP.accent : 'rgba(168,188,212,0.35)',
            fontWeight: 700, fontSize: '1.05rem',
            fontFamily: "'Bayon', sans-serif", letterSpacing: '0.04em', lineHeight: 1,
          }}>
            {hasCost ? fmtUSD(tournament.tournamentTotal) : '—'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.45)', fontSize: '0.62rem' }}>
            feed fees + CDN
          </Typography>
        </Box>
      </Box>

      <Collapse in={expanded}>
        {!tournament.days?.length ? (
          <Box sx={{ px: 3, py: 2.5, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(168,188,212,0.5)', fontStyle: 'italic', fontSize: '0.82rem' }}>
              No days scheduled.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: '#a8bcd4', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.05)', whiteSpace: 'nowrap' } }}>
                  <TableCell>DAY</TableCell>
                  <TableCell>DATE</TableCell>
                  <TableCell>FEEDS</TableCell>
                  <TableCell>STREAM HRS</TableCell>
                  <TableCell>GB DEL</TableCell>
                  <TableCell>FEED FEE</TableCell>
                  <TableCell>CDN COST</TableCell>
                  <TableCell>TOTAL</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tournament.days.map(day => {
                  const logged    = day.source === 'logged'
                  const pending   = day.source === 'pending'
                  const live      = day.source === 'live'
                  const scheduled = day.source === 'scheduled'
                  const none      = day.source === 'none'
                  return (
                    <TableRow key={day.id || day.date} sx={{
                      '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 1.25 },
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                      opacity: (none || scheduled) ? 0.5 : 1,
                    }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff', fontSize: '0.82rem' }}>{day.label}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#a8bcd4', whiteSpace: 'nowrap' }}>{formatDate(day.date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#a8bcd4' }}>
                          {day.feedCount > 0 ? day.feedCount : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#a8bcd4' }}>
                          {day.stream_hours > 0
                            ? `${Number(day.stream_hours).toFixed(2)}h${(live || pending) ? ' (est.)' : ''}`
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#a8bcd4' }}>
                          {logged ? fmtGB(day.gb_delivered) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: '#a8bcd4' }}>
                          {logged  ? fmtUSD(day.cost_feed)
                            : (live || pending) && day.est_feed > 0 ? fmtUSD(day.est_feed)
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {logged ? (
                          <Typography variant="caption" sx={{ color: '#a8bcd4' }}>{fmtUSD(day.cost_cdn)}</Typography>
                        ) : (
                          <Typography variant="caption" sx={{
                            fontStyle: 'italic', whiteSpace: 'nowrap',
                            color: live ? '#10b981' : pending ? '#f59e0b' : 'rgba(168,188,212,0.3)',
                            fontSize: '0.68rem',
                          }}>
                            {live ? 'In progress…' : pending ? 'Pending' : scheduled ? 'Upcoming' : '—'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{
                          color: logged ? AP.accent : 'rgba(168,188,212,0.35)',
                          fontWeight: logged ? 700 : 400,
                          fontSize:   logged ? '0.78rem' : '0.72rem',
                        }}>
                          {logged ? fmtUSD(day.cost_total) : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {/* Subtotal */}
                {hasCost && (
                  <TableRow sx={{ '& td': { borderColor: 'rgba(255,255,255,0.07)', borderTop: '1px solid rgba(255,255,255,0.1)', py: 1 } }}>
                    <TableCell colSpan={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#a8bcd4', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.08em' }}>
                        TOURNAMENT TOTAL
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={2}>
                      <Typography sx={{ color: AP.accent, fontWeight: 700, fontSize: '0.88rem', fontFamily: "'Bayon', sans-serif" }}>
                        {fmtUSD(tournament.tournamentTotal)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Collapse>
    </Paper>
  )
}

// ─── Costs page ───────────────────────────────────────────────────────────────

function CostsPage({ tournaments, channels, cdnRecords = [], cdnPricing }) {

  function fmtUSD(n) { return '$' + Number(n || 0).toFixed(2) }

  // ── date → JW channels map ─────────────────────────────────────────────────
  const channelsByDate = {}
  channels.forEach(ch => {
    if (!ch.stream_start) return
    const date = new Date(ch.stream_start).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    if (!channelsByDate[date]) channelsByDate[date] = []
    channelsByDate[date].push(ch)
  })

  function streamHours(ch) {
    const s = new Date(ch.stream_start)
    const e = ch.stream_end ? new Date(ch.stream_end) : new Date()
    return Math.max(0, (e - s) / 3_600_000)
  }
  function estFeedFee(ch) {
    const overrides = cdnPricing?.channel_overrides?.[ch.id] || {}
    const rate = overrides.feed_rate_per_hr ?? cdnPricing?.feed_rate_per_hr ?? 15
    return streamHours(ch) * rate
  }

  // ── Build enriched tournament rollup from cdn records ────────────────────
  const tournamentRollup = tournaments.map(t => {
    let tournamentTotal = 0
    const enrichedDays = (t.days || []).map(day => {
      const recs       = cdnRecords.filter(r => r.date === day.date && Number(r.tournament_id) === t.id)
      const jwChannels = channelsByDate[day.date] || []

      if (recs.length > 0) {
        // LOGGED — sum all cdn records for this day
        const totals = recs.reduce((s, r) => ({
          stream_hours: s.stream_hours + (r.stream_hours  || 0),
          gb_delivered: s.gb_delivered + (r.gb_delivered  || 0),
          cost_feed:    s.cost_feed    + (r.cost_feed     || 0),
          cost_cdn:     s.cost_cdn     + (r.cost_cdn      || 0),
          cost_total:   s.cost_total   + (r.cost_total    || 0),
        }), { stream_hours: 0, gb_delivered: 0, cost_feed: 0, cost_cdn: 0, cost_total: 0 })
        tournamentTotal += totals.cost_total
        return { ...day, ...totals, feedCount: recs.length, source: 'logged' }
      } else if (jwChannels.length > 0) {
        // Determine day status from JW channel status field
        const isActive    = jwChannels.some(ch => ch.status?.toLowerCase() === 'active')
        const hasEnded    = jwChannels.some(ch => ch.stream_end && new Date(ch.stream_end) <= new Date())
        const isScheduled = !isActive && !hasEnded
        const source      = isActive ? 'live' : hasEnded ? 'pending' : 'scheduled'
        const estHours    = jwChannels.reduce((s, ch) => s + streamHours(ch), 0)
        const est_feed    = isActive ? jwChannels.reduce((s, ch) => s + estFeedFee(ch), 0) : 0
        return { ...day, stream_hours: isScheduled ? 0 : estHours, est_feed, feedCount: jwChannels.length, source }
      }
      return { ...day, feedCount: 0, stream_hours: 0, source: 'none' }
    })
    return { ...t, days: enrichedDays, tournamentTotal }
  })

  const grandTotal = tournamentRollup.reduce((s, t) => s + t.tournamentTotal, 0)

  // Unattributed cdn records (no tournament_id)
  const unattributed = cdnRecords.filter(r => !r.tournament_id)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Tournament Cost Rollup ─────────────────────────────── */}
      <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{
          px: 2, py: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoneyIcon sx={{ color: AP.accent, fontSize: 18 }} />
            <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>
              TOURNAMENT COSTS
            </Typography>
          </Box>
          {grandTotal > 0 && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ color: AP.accent, fontWeight: 700, fontSize: '1.1rem', fontFamily: "'Bayon', sans-serif", letterSpacing: '0.04em', lineHeight: 1 }}>
                {fmtUSD(grandTotal)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.62rem' }}>
                all tournaments · feed fees + CDN
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 2 }}>
          {tournamentRollup.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(168,188,212,0.5)', textAlign: 'center', py: 2 }}>
              No tournaments found.
            </Typography>
          ) : (
            tournamentRollup.map(t => (
              <TournamentCostCard key={t.id} tournament={t} />
            ))
          )}
        </Box>
      </Paper>

      {/* ── Unattributed records (no tournament_id) ───────────── */}
      {unattributed.length > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{
            px: 2, py: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LiveTvIcon sx={{ color: AP.muted, fontSize: 18 }} />
              <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', color: AP.muted }}>
                UNATTRIBUTED FEEDS
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.4)', fontSize: '0.65rem' }}>
                — not linked to a tournament
              </Typography>
            </Box>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: '#a8bcd4', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.05)', whiteSpace: 'nowrap' } }}>
                  <TableCell>DATE</TableCell>
                  <TableCell>LABEL</TableCell>
                  <TableCell>FEED</TableCell>
                  <TableCell>STREAM HRS</TableCell>
                  <TableCell>GB DEL</TableCell>
                  <TableCell>FEED FEE</TableCell>
                  <TableCell>CDN COST</TableCell>
                  <TableCell>TOTAL</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unattributed.map(r => (
                  <TableRow key={r.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 1 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.75rem', color: AP.muted, whiteSpace: 'nowrap' }}>{r.date}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: AP.text }}>{r.label}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: AP.text }}>{r.channel_name}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: AP.muted }}>{Number(r.stream_hours).toFixed(2)}h</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: AP.muted }}>{Number(r.gb_delivered || 0).toFixed(2)} GB</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: AP.muted }}>{fmtUSD(r.cost_feed)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: AP.muted }}>{fmtUSD(r.cost_cdn)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: AP.accent }}>{fmtUSD(r.cost_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* ── Pricing footnote ──────────────────────────────────── */}
      {cdnPricing && (
        <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.35)', fontSize: '0.65rem', textAlign: 'right' }}>
          Rates: ${cdnPricing.feed_rate_per_hr}/hr per feed · ${cdnPricing.cdn_rate_per_gb}/GB CDN · {cdnPricing.gb_per_50_min} GB per 50 min
          {Object.keys(cdnPricing.channel_overrides || {}).length > 0 && ' · Per-channel overrides active'}
        </Typography>
      )}
    </Box>
  )
}

// ─── Preview player dialog ────────────────────────────────────────────────────

function PreviewPlayerDialog({ open, onClose, channelName, streamUrl }) {
  const playerRef = useRef(null)
  const divRef    = useRef(null)

  useEffect(() => {
    if (!open || !streamUrl) return
    let cancelled = false
    loadJWScript()
      .then(() => {
        if (cancelled || !divRef.current || !window.jwplayer) return
        if (playerRef.current) { try { playerRef.current.remove() } catch (_) {} }
        playerRef.current = window.jwplayer(PREVIEW_DIV_ID).setup({
          file: streamUrl,
          width: '100%',
          aspectratio: '16:9',
          autostart: true,
          mute: true,
        })
      })
      .catch(err => console.error('JW preview failed:', err))
    return () => {
      cancelled = true
      if (playerRef.current) {
        try { playerRef.current.remove() } catch (_) {}
        playerRef.current = null
      }
    }
  }, [open, streamUrl])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{ sx: { bgcolor: '#000', border: `1px solid ${AP.accentBdr}`, borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, px: 2, bgcolor: AP.paper, borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LiveTvIcon sx={{ color: AP.accent, fontSize: 16 }} />
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: AP.text }}>
            {channelName || 'Preview'}
          </Typography>
          <Chip label="ADMIN PREVIEW" size="small" sx={{ height: 16, fontSize: '0.57rem', fontWeight: 700, bgcolor: AP.accentMid, color: AP.accent }} />
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: AP.muted, '&:hover': { color: AP.text } }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {streamUrl
          ? <div id={PREVIEW_DIV_ID} ref={divRef} style={{ width: '100%' }} />
          : <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, bgcolor: '#000' }}>
              <Typography variant="body2" sx={{ color: AP.muted }}>No stream URL available</Typography>
            </Box>
        }
      </DialogContent>
    </Dialog>
  )
}

// ─── Tenant settings panel ────────────────────────────────────────────────────

function ColorField({ label, value, onChange }) {
  const safe = /^#[0-9a-fA-F]{3,6}$/.test(value) ? value : '#000000'
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <TextField
        size="small" fullWidth label={label}
        value={value} onChange={e => onChange(e.target.value)}
        inputProps={{ spellCheck: false }}
        sx={{ '& input': { fontFamily: 'monospace', fontSize: '0.82rem' } }}
      />
      <Box
        component="input" type="color" value={safe}
        onChange={e => onChange(e.target.value)}
        sx={{ width: 38, height: 38, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 1, p: '3px', bgcolor: 'transparent', flexShrink: 0 }}
      />
    </Box>
  )
}

const COMPONENT_LABELS = {
  video_player:    'Video Player',
  camera_selector: 'Camera Selector',
  event_schedule:  'Event Schedule',
  command_center:  'Command Center',
  pre_show_screen: 'Pre-Show Screen',
}

function TenantSettingsPanel({ token }) {
  const [form, setForm]       = useState(null)
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveErr, setSaveErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tenant')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setForm({
          title:    data.title    || '',
          subtitle: data.subtitle || '',
          logo_url: data.logo_url || '',
          colors: {
            primary:    data.colors?.primary    || '#e65d2c',
            secondary:  data.colors?.secondary  || '#0a205a',
            background: data.colors?.background || '#060e24',
            paper:      data.colors?.paper      || '#0d1e42',
          },
          components: {
            video_player:    data.components?.video_player    !== false,
            camera_selector: data.components?.camera_selector !== false,
            event_schedule:  data.components?.event_schedule  !== false,
            command_center:  data.components?.command_center  !== false,
            pre_show_screen: data.components?.pre_show_screen !== false,
          },
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function setField(path, value) {
    setForm(f => {
      const [top, sub] = path.split('.')
      if (!sub) return { ...f, [top]: value }
      return { ...f, [top]: { ...f[top], [sub]: value } }
    })
  }

  async function handleSave() {
    setSaving(true); setSaveMsg(''); setSaveErr('')
    try {
      const res = await fetch('/api/tenant', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaveMsg('Settings saved — changes will take effect on next page load.')
      setTimeout(() => setSaveMsg(''), 6000)
    } catch (err) {
      setSaveErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress size={28} sx={{ color: AP.accent }} />
    </Box>
  )
  if (!form) return <Alert severity="error">Failed to load tenant settings</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {saveMsg && <Alert severity="success">{saveMsg}</Alert>}
      {saveErr && <Alert severity="error">{saveErr}</Alert>}

      {/* Branding */}
      <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)', background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>BRANDING</Typography>
        </Box>
        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField size="small" fullWidth label="Team / Organization Name" value={form.title} onChange={e => setField('title', e.target.value)} />
          <TextField size="small" fullWidth label="Subtitle" value={form.subtitle} onChange={e => setField('subtitle', e.target.value)} placeholder="e.g. Sport Fishing Championship" />
          <TextField size="small" fullWidth label="Logo URL" value={form.logo_url} onChange={e => setField('logo_url', e.target.value)} placeholder="https://..." />
          {form.logo_url && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box component="img" src={form.logo_url} alt="Logo preview"
                sx={{ width: 56, height: 56, objectFit: 'contain', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1, bgcolor: 'rgba(0,0,0,0.4)', p: 0.5, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: AP.muted }}>Logo preview</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Colors */}
      <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)', background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon sx={{ color: AP.accent, fontSize: 18 }} />
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>COLOR PALETTE</Typography>
        </Box>
        <Box sx={{ p: 2.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <ColorField label="Primary"    value={form.colors.primary}    onChange={v => setField('colors.primary', v)} />
          <ColorField label="Secondary"  value={form.colors.secondary}  onChange={v => setField('colors.secondary', v)} />
          <ColorField label="Background" value={form.colors.background} onChange={v => setField('colors.background', v)} />
          <ColorField label="Paper"      value={form.colors.paper}      onChange={v => setField('colors.paper', v)} />
        </Box>
        <Box sx={{ px: 2.5, pb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {Object.entries(form.colors).map(([key, val]) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: val, border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.62rem' }}>{key}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Feature flags */}
      <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)', background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)` }}>
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>FEATURE FLAGS</Typography>
        </Box>
        <Box sx={{ px: 2.5, py: 1 }}>
          {Object.entries(COMPONENT_LABELS).map(([key, label], i, arr) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <Box>
                <Typography variant="body2" sx={{ color: AP.text, fontWeight: 600 }}>{label}</Typography>
                <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.62rem', fontFamily: 'monospace' }}>{key}</Typography>
              </Box>
              <Switch
                checked={form.components[key]}
                onChange={e => setField(`components.${key}`, e.target.checked)}
                size="small"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked':                     { color: AP.accent },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':  { bgcolor: AP.accent },
                }}
              />
            </Box>
          ))}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: AP.accent, '&:hover': { bgcolor: AP.accentHov }, fontWeight: 700, px: 3 }}
        >
          {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  )
}

// ─── CDN read-only panel (tenant admin view) ──────────────────────────────────

function CdnReadOnlyPanel({ records = [], channels = [], pricing, tournaments = [] }) {
  const [monthFilter, setMonthFilter] = useState('all')

  function fmtUSD(n) { return '$' + Number(n || 0).toFixed(2) }
  function fmtGB(n)  { return Number(n || 0).toFixed(3) + ' GB' }
  function fmtDate(ds) {
    if (!ds) return '—'
    return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  function monthLabel(yyyymm) {
    if (!yyyymm) return ''
    const [y, m] = yyyymm.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  function chDate(ch) {
    return new Date(ch.stream_start).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  }
  function streamHours(ch) {
    const s = new Date(ch.stream_start)
    const e = ch.stream_end ? new Date(ch.stream_end) : new Date()
    return Math.max(0, (e - s) / 3_600_000)
  }

  // Build unified feed rows from JW channels + logged cdn records
  // Each JW channel that has run = one row, with status: live | pending | logged
  const channelRows = channels
    .filter(ch => ch.stream_start)
    .map(ch => {
      const date   = chDate(ch)
      const record = records.find(r => r.channel_id === ch.id && r.date === date)
      // Use JW status field: 'active' = streaming, ended stream_end = pending, future = scheduled
      const jwStatus  = ch.status?.toLowerCase()
      const isActive  = jwStatus === 'active'
      const hasEnded  = ch.stream_end && new Date(ch.stream_end) <= new Date()
      const chStatus  = record ? 'logged' : isActive ? 'live' : hasEnded ? 'pending' : 'scheduled'
      return {
        key:         `ch-${ch.id}`,
        date,
        channel_id:  ch.id,
        channel_name: ch.name || ch.id,
        label:       ch.name || ch.id,
        stream_hours: streamHours(ch),
        status:      chStatus,
        record,      // cdn_record if logged
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  // Also include cdn records whose channel is no longer in JW (historical)
  const channelIds = new Set(channelRows.map(r => r.channel_id + '_' + r.date))
  const orphanRecords = records.filter(r => !channelIds.has(r.channel_id + '_' + r.date))

  // Build combined list for the selected month
  const allRows = [
    ...channelRows.map(r => ({ type: 'channel', ...r })),
    ...orphanRecords.map(r => ({ type: 'record', ...r, status: 'logged', key: `rec-${r.id}` })),
  ].filter(r => monthFilter === 'all' || r.date?.startsWith(monthFilter))

  const months = [...new Set(
    [...channelRows.map(r => r.date?.slice(0, 7)), ...records.map(r => r.date?.slice(0, 7))].filter(Boolean)
  )].sort().reverse()

  const loggedRows = allRows.filter(r => r.status === 'logged')
  const totalCost  = loggedRows.reduce((s, r) => s + (r.record?.cost_total || r.cost_total || 0), 0)
  const totalFeed  = loggedRows.reduce((s, r) => s + (r.record?.cost_feed  || r.cost_feed  || 0), 0)
  const totalCdn   = loggedRows.reduce((s, r) => s + (r.record?.cost_cdn   || r.cost_cdn   || 0), 0)
  const pendingCount = allRows.filter(r => r.status === 'pending').length

  const statusChip = (status) => {
    const cfg = {
      live:      { label: 'LIVE',      bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.4)' },
      pending:   { label: 'PENDING',   bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
      logged:    { label: 'LOGGED',    bg: AP.accentDim,             color: AP.accent, border: AP.accentBdr },
      scheduled: { label: 'SCHEDULED', bg: 'rgba(99,102,241,0.1)',   color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
    }[status] || {}
    return (
      <Chip label={cfg.label} size="small" sx={{
        fontSize: '0.58rem', height: 16, fontWeight: 700, letterSpacing: '0.05em',
        bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      }} />
    )
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LiveTvIcon sx={{ color: AP.accent, fontSize: 18 }} />
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>
            FEEDS & CDN COSTS
          </Typography>
          {pendingCount > 0 && (
            <Chip label={`${pendingCount} PENDING`} size="small"
              sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }} />
          )}
        </Box>
        <TextField
          select size="small" value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          sx={{ minWidth: 160, '& .MuiInputBase-root': { fontSize: '0.75rem', height: 28 } }}
        >
          <MenuItem value="all">All time</MenuItem>
          {months.map(mk => <MenuItem key={mk} value={mk}>{monthLabel(mk)}</MenuItem>)}
        </TextField>
      </Box>

      {/* Summary row */}
      {loggedRows.length > 0 && (
        <Box sx={{
          px: 2, py: 1, display: 'flex', gap: 3, flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          bgcolor: 'rgba(99,102,241,0.04)',
        }}>
          {[
            { label: 'Total Cost',  value: fmtUSD(totalCost), accent: true },
            { label: 'Feed Fees',   value: fmtUSD(totalFeed) },
            { label: 'CDN Cost',    value: fmtUSD(totalCdn) },
            { label: 'Feeds',       value: `${loggedRows.length} logged${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}` },
          ].map(({ label, value, accent }) => (
            <Box key={label}>
              <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: accent ? AP.accent : AP.text, lineHeight: 1.2 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Feed table */}
      {allRows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <LiveTvIcon sx={{ color: 'rgba(168,188,212,0.2)', fontSize: 36, mb: 1 }} />
          <Typography variant="body2" sx={{ color: 'rgba(168,188,212,0.5)' }}>
            No feeds {monthFilter !== 'all' ? `for ${monthLabel(monthFilter)}` : 'yet'}.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Status', 'Date', 'Feed', 'Stream Hrs', 'GB Delivered', 'Feed Fee', 'CDN Cost', 'Total'].map(h => (
                  <TableCell key={h} sx={{ color: AP.muted, fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {allRows.map(row => {
                const rec = row.record || (row.type === 'record' ? row : null)
                return (
                  <TableRow key={row.key} hover sx={{ opacity: row.status === 'pending' ? 0.7 : 1 }}>
                    <TableCell>{statusChip(row.status)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(row.date)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{row.channel_name || row.label}</Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: AP.muted, fontFamily: 'monospace' }}>{row.channel_id}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>
                      {row.stream_hours != null ? `${Number(row.stream_hours).toFixed(2)}h` : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{rec ? fmtGB(rec.gb_delivered) : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{rec ? fmtUSD(rec.cost_feed) : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{rec ? fmtUSD(rec.cost_cdn) : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: rec ? 700 : 400, color: rec ? AP.accent : AP.muted }}>
                      {rec                           ? fmtUSD(rec.cost_total)
                        : row.status === 'live'      ? 'In progress…'
                        : row.status === 'pending'   ? 'Awaiting CDN data'
                        : row.status === 'scheduled' ? 'Upcoming'
                        : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
              {loggedRows.length > 0 && (
                <TableRow sx={{ bgcolor: AP.accentDim }}>
                  <TableCell colSpan={7} sx={{ fontSize: '0.75rem', fontWeight: 700, color: AP.muted }}>
                    {monthFilter === 'all' ? 'Grand Total' : `${monthLabel(monthFilter)} Total`} ({loggedRows.length} logged)
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', fontWeight: 800, color: AP.accent }}>{fmtUSD(totalCost)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {pricing && (
        <Box sx={{ px: 2, py: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.4)', fontSize: '0.65rem' }}>
            Rates: ${pricing.feed_rate_per_hr}/hr per feed · ${pricing.cdn_rate_per_gb}/GB CDN · {pricing.gb_per_50_min} GB per 50 min
            {Object.keys(pricing.channel_overrides || {}).length > 0 && ' · Per-channel overrides active'}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ token, onLogout }) {
  const [tournaments, setTournaments] = useState([])
  const [channels, setChannels] = useState([])
  const [loadingTournaments, setLoadingTournaments] = useState(true)
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [error, setError] = useState('')
  const [channelError, setChannelError] = useState('')

  const [costRecords, setCostRecords] = useState([])
  const [costRecordDialog, setCostRecordDialog] = useState({ open: false, initial: null })
  const [cdnRecords, setCdnRecords] = useState([])
  const [cdnPricing, setCdnPricing] = useState(null)

  const [tournamentDialog, setTournamentDialog] = useState({ open: false, initial: null })
  const [dayDialog, setDayDialog] = useState({ open: false, initial: null, tournament: null })
  const [pickerDialog, setPickerDialog] = useState({ open: false, slot: null, day: null, tournamentId: null })
  const [createStreamOpen, setCreateStreamOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [previewDialog, setPreviewDialog] = useState({ open: false, channelName: '', streamUrl: '' })
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const showSnack = (message, severity = 'success') =>
    setSnack({ open: true, message, severity })

  const fetchTournaments = useCallback(async () => {
    setLoadingTournaments(true)
    try {
      const res = await fetch('/api/tournaments')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load tournaments')
      setTournaments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingTournaments(false)
    }
  }, [])

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true)
    setChannelError('')
    try {
      const res = await fetch('/api/channels', { headers: authHeader(token) })
      if (res.status === 401) { onLogout(); return }
      const data = await res.json()
      if (!res.ok) throw new Error(`${data.error}${data.detail ? ` — ${data.detail}` : ''}`)
      setChannels(data.channels || [])
    } catch (err) {
      setChannelError(err.message)
    } finally {
      setLoadingChannels(false)
    }
  }, [token, onLogout])

  const fetchCostRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/cost-records')
      if (res.ok) setCostRecords(await res.json())
    } catch {}
  }, [])

  const fetchCdnData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/cdn-records'),
        fetch('/api/pricing'),
      ])
      if (cRes.ok) setCdnRecords(await cRes.json())
      if (pRes.ok) setCdnPricing(await pRes.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchTournaments()
    fetchChannels()
    fetchCostRecords()
    fetchCdnData()
  }, [fetchTournaments, fetchChannels, fetchCostRecords, fetchCdnData])

  // ── Cost record CRUD ──────────────────────────────────────────────────────────

  async function saveCostRecord(form) {
    const isEdit = !!costRecordDialog.initial?.id
    const res = await fetch('/api/cost-records', {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeader(token),
      body: JSON.stringify(isEdit ? { id: costRecordDialog.initial.id, ...form } : form),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    await fetchCostRecords()
  }

  async function deleteCostRecord(id, label) {
    if (!confirm(`Remove historical record for "${label}"?`)) return
    try {
      const res = await fetch('/api/cost-records', {
        method: 'DELETE',
        headers: authHeader(token),
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await fetchCostRecords()
      showSnack(`Record for "${label}" removed`)
    } catch (err) {
      showSnack(`Failed: ${err.message}`, 'error')
    }
  }

  // ── Tournament CRUD ──────────────────────────────────────────────────────────

  async function saveTournament(form) {
    const isEdit = !!tournamentDialog.initial?.id
    const res = await fetch('/api/tournaments', {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeader(token),
      body: JSON.stringify(isEdit ? { id: tournamentDialog.initial.id, ...form } : form),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    await fetchTournaments()
    showSnack(isEdit ? `Tournament "${data.name}" updated` : `Tournament "${data.name}" created`)
  }

  async function deleteTournament(tournament) {
    if (!confirm(`Delete tournament "${tournament.name}" and all its days?\n\nThis cannot be undone.`)) return
    try {
      const res = await fetch('/api/tournaments', {
        method: 'DELETE',
        headers: authHeader(token),
        body: JSON.stringify({ id: tournament.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchTournaments()
      showSnack(`Tournament "${tournament.name}" deleted`)
    } catch (err) {
      showSnack(`Failed to delete: ${err.message}`, 'error')
    }
  }

  // ── Day CRUD ─────────────────────────────────────────────────────────────────

  async function saveDay(form) {
    const { tournament } = dayDialog
    const isEdit = !!dayDialog.initial?.id
    const res = await fetch('/api/tournament-days', {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        tournament_id: tournament.id,
        ...(isEdit ? { id: dayDialog.initial.id } : {}),
        ...form,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    await fetchTournaments()
    showSnack(isEdit ? `"${data.label}" updated` : `"${data.label}" added to ${tournament.name}`)
  }

  async function deleteDay(day, tournament) {
    if (!confirm(`Delete "${day.label}" from ${tournament.name}?`)) return
    try {
      const res = await fetch('/api/tournament-days', {
        method: 'DELETE',
        headers: authHeader(token),
        body: JSON.stringify({ tournament_id: tournament.id, id: day.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await fetchTournaments()
      showSnack(`"${day.label}" deleted`)
    } catch (err) {
      showSnack(`Failed to delete: ${err.message}`, 'error')
    }
  }

  // ── Camera assignment ─────────────────────────────────────────────────────────

  async function assignCamera(slot, tournamentId, picked) {
    const { day } = pickerDialog
    if (!day) return
    const url  = picked?.url  ?? null
    const name = picked?.name ?? null
    setPickerDialog({ open: false, slot: null, day: null, tournamentId: null })
    try {
      const res = await fetch('/api/tournament-days', {
        method: 'PUT',
        headers: authHeader(token),
        body: JSON.stringify({
          tournament_id: tournamentId,
          id: day.id,
          camera1_url:  slot === 1 ? url  : day.camera1_url,
          camera1_name: slot === 1 ? name : day.camera1_name,
          camera2_url:  slot === 2 ? url  : day.camera2_url,
          camera2_name: slot === 2 ? name : day.camera2_name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      await fetchTournaments()
      showSnack(picked ? `Camera ${slot} assigned to ${day.label}` : `Camera ${slot} cleared`, 'success')
    } catch (err) {
      showSnack(`Failed to save: ${err.message}`, 'error')
    }
  }

  function openPicker(day, tournamentId, slot) {
    setPickerDialog({ open: true, slot, day, tournamentId })
  }

  // ── JW channel management ─────────────────────────────────────────────────────

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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <AppBar position="sticky" elevation={0}
        sx={{ background: `linear-gradient(90deg, ${AP.bg} 0%, ${AP.paper} 60%, ${AP.bg} 100%)`, borderBottom: `2px solid ${AP.accent}` }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: { xs: 56, sm: 64 } }}>
          <SettingsIcon sx={{ color: AP.accent, fontSize: 22 }} />
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

      {/* Tab navigation */}
      <Box sx={{ bgcolor: AP.bg, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            minHeight: 42,
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, md: 3 },
            '& .MuiTab-root': {
              minHeight: 42,
              color: AP.muted,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'none',
              py: 0,
              px: 2,
              gap: 0.75,
            },
            '& .Mui-selected':      { color: '#fff !important' },
            '& .MuiTabs-indicator': { bgcolor: AP.accent, height: 2 },
          }}
        >
          <Tab label="Dashboard" value="dashboard" />
          <Tab label="Costs"    value="costs"    icon={<AttachMoneyIcon sx={{ fontSize: 15 }} />} iconPosition="start" />
          <Tab label="CDN"      value="cdn"      icon={<LiveTvIcon      sx={{ fontSize: 15 }} />} iconPosition="start" />
          <Tab label="Settings" value="settings" icon={<SettingsIcon    sx={{ fontSize: 15 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

        {error && <Alert severity="error">{error}</Alert>}

        {activeTab === 'settings' ? (
          <TenantSettingsPanel token={token} />
        ) : activeTab === 'cdn' ? (
          <CdnReadOnlyPanel records={cdnRecords} channels={channels} pricing={cdnPricing} tournaments={tournaments} />
        ) : activeTab === 'dashboard' ? (
          <>
            {/* ── Tournaments ──────────────────────── */}
            <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{
                px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEventsIcon sx={{ color: AP.accent, fontSize: 18 }} />
                  <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>
                    TOURNAMENTS
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={fetchTournaments} sx={{ color: '#a8bcd4' }}>
                      <RefreshIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    variant="outlined"
                    onClick={() => setTournamentDialog({ open: true, initial: null })}
                    sx={{ fontSize: '0.72rem', borderColor: AP.accentBdr, color: AP.accent, '&:hover': { borderColor: AP.accent } }}
                  >
                    Add Tournament
                  </Button>
                </Box>
              </Box>

              <Box sx={{ p: loadingTournaments ? 0 : 2 }}>
                {loadingTournaments ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} sx={{ color: AP.accent }} />
                  </Box>
                ) : tournaments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <EmojiEventsIcon sx={{ color: 'rgba(168,188,212,0.2)', fontSize: 40, mb: 1 }} />
                    <Typography variant="body2" sx={{ color: 'rgba(168,188,212,0.5)' }}>
                      No tournaments yet. Click "Add Tournament" to create one.
                    </Typography>
                  </Box>
                ) : (
                  tournaments.map(t => (
                    <TournamentCard
                      key={t.id}
                      tournament={t}
                      channels={channels}
                      token={token}
                      onRefresh={fetchTournaments}
                      onAddDay={tournament => setDayDialog({ open: true, initial: null, tournament })}
                      onEditDay={(day, tournament) => setDayDialog({ open: true, initial: day, tournament })}
                      onDeleteDay={deleteDay}
                      onOpenPicker={openPicker}
                      onEditTournament={tournament => setTournamentDialog({ open: true, initial: tournament })}
                      onDeleteTournament={deleteTournament}
                    />
                  ))
                )}
              </Box>
            </Paper>

            {/* ── JW Live Channels ─────────────────────── */}
            <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{
                px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`,
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
                    sx={{ fontSize: '0.72rem', borderColor: AP.accentBdr, color: AP.accent, '&:hover': { borderColor: AP.accent } }}
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
                  <CircularProgress size={28} sx={{ color: AP.accent }} />
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
                    {[...channels].sort((a, b) => {
                      if (!a.stream_start && !b.stream_start) return (a.name || '').localeCompare(b.name || '')
                      if (!a.stream_start) return 1
                      if (!b.stream_start) return -1
                      const timeDiff = new Date(b.stream_start) - new Date(a.stream_start)
                      if (timeDiff !== 0) return timeDiff
                      return (a.name || '').localeCompare(b.name || '')
                    }).map(ch => {
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
                      const statusLabel  = STATUS_LABELS[ch.status?.toLowerCase()] || ch.status || 'Idle'
                      const spinupStatus = getSpinupStatus(ch)
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
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                              <Chip
                                label={statusLabel}
                                size="small"
                                sx={{
                                  height: 18, fontSize: '0.6rem', fontWeight: 700,
                                  bgcolor: isLive ? AP.liveDim : ch.status === 'requested' ? 'rgba(33,150,243,0.15)' : 'rgba(255,255,255,0.06)',
                                  color:  isLive ? AP.live    : ch.status === 'requested' ? '#64b5f6'                : AP.muted,
                                }}
                              />
                              {spinupStatus === 'starting_soon' && (
                                <Chip label="Starting Soon" size="small" sx={{ height: 16, fontSize: '0.57rem', fontWeight: 700, bgcolor: AP.warnDim, color: AP.warn }} />
                              )}
                              {spinupStatus === 'winding_down' && (
                                <Chip label="Winding Down" size="small" sx={{ height: 16, fontSize: '0.57rem', fontWeight: 700, bgcolor: AP.slateDim, color: AP.slate }} />
                              )}
                            </Box>
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
                                  <Typography variant="caption" sx={{ color: AP.accent, fontFamily: 'monospace', fontSize: '0.6rem' }}>{ch.ingest_key}</Typography>
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
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              {ch.stream_url && (
                                <Tooltip title="Preview stream (admin only)">
                                  <IconButton
                                    size="small"
                                    onClick={() => setPreviewDialog({ open: true, channelName: ch.name, streamUrl: ch.stream_url })}
                                    sx={{ color: AP.accent, '&:hover': { color: AP.accentHov } }}
                                  >
                                    <PlayArrowIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Delete stream">
                                <IconButton
                                  size="small"
                                  onClick={() => deleteChannel(ch.id, ch.name)}
                                  sx={{ color: AP.muted, '&:hover': { color: '#f44336' } }}
                                >
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </>
        ) : (
          /* costs tab */
          <CostsPage
            tournaments={tournaments}
            channels={channels}
            cdnRecords={cdnRecords}
            cdnPricing={cdnPricing}
          />
        )}

      </Box>

      {/* ── Dialogs ─────────────────────────────────── */}
      <PreviewPlayerDialog
        open={previewDialog.open}
        channelName={previewDialog.channelName}
        streamUrl={previewDialog.streamUrl}
        onClose={() => setPreviewDialog({ open: false, channelName: '', streamUrl: '' })}
      />
      <CostRecordDialog
        open={costRecordDialog.open}
        initial={costRecordDialog.initial}
        onClose={() => setCostRecordDialog({ open: false, initial: null })}
        onSave={saveCostRecord}
      />
      <TournamentDialog
        open={tournamentDialog.open}
        initial={tournamentDialog.initial}
        onClose={() => setTournamentDialog({ open: false, initial: null })}
        onSave={saveTournament}
      />
      <DayDialog
        open={dayDialog.open}
        initial={dayDialog.initial}
        tournament={dayDialog.tournament}
        tournamentName={dayDialog.tournament?.name}
        onClose={() => setDayDialog({ open: false, initial: null, tournament: null })}
        onSave={saveDay}
      />
      <ChannelPickerDialog
        open={pickerDialog.open}
        slot={pickerDialog.slot}
        day={pickerDialog.day}
        channels={channels}
        onClose={() => setPickerDialog({ open: false, slot: null, day: null, tournamentId: null })}
        onPick={picked => assignCamera(pickerDialog.slot, pickerDialog.tournamentId, picked)}
      />
      <CreateStreamDialog
        open={createStreamOpen}
        token={token}
        onClose={() => setCreateStreamOpen(false)}
        onCreated={() => fetchChannels()}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
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
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      {token
        ? <Dashboard token={token} onLogout={handleLogout} />
        : <LoginScreen onLogin={handleLogin} />
      }
    </ThemeProvider>
  )
}
