import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  Alert, IconButton, Chip, Divider, Tooltip, Snackbar, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Drawer,
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
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SettingsIcon from '@mui/icons-material/Settings'
import PaletteIcon from '@mui/icons-material/Palette'
import CloseIcon from '@mui/icons-material/Close'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import EventIcon from '@mui/icons-material/Event'
import DownloadIcon from '@mui/icons-material/Download'
import LinkIcon from '@mui/icons-material/Link'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useTenant } from '../contexts/TenantContext'

const SESSION_KEY = 'ri_admin_token'

/** Normalise legacy camera1/camera2 fields into a streams array */
function getSessionStreams(session) {
  if (session && Array.isArray(session.streams)) return session.streams
  const streams = []
  if (session?.camera1_url) streams.push({ id: 1, url: session.camera1_url, name: session.camera1_name || 'Stream 1' })
  if (session?.camera2_url) streams.push({ id: 2, url: session.camera2_url, name: session.camera2_name || 'Stream 2' })
  return streams
}

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
    MuiCssBaseline: {
      styleOverrides: {
        // Invert the native date/time picker icons so they're visible on dark backgrounds
        'input[type="date"]::-webkit-calendar-picker-indicator, input[type="time"]::-webkit-calendar-picker-indicator': {
          filter: 'invert(0.7)',
          cursor: 'pointer',
        },
      },
    },
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, gap: 1.5 }}>
          {/* Logo B — broadcast rings + play mark */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <svg width="48" height="48" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="22" cy="22" r="18" stroke="rgba(99,102,241,0.25)" strokeWidth="1.5"/>
              <circle cx="22" cy="22" r="12" stroke="rgba(99,102,241,0.45)" strokeWidth="1.5"/>
              <path d="M18 15.5l11 6.5-11 6.5V15.5z" fill="#6366f1"/>
            </svg>
            <Box sx={{ lineHeight: 1 }}>
              <Box sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.02em', color: '#fff', lineHeight: 1 }}>
                Event<Box component="span" sx={{ color: AP.accent }}>Hub</Box>
                <Box component="span" sx={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  bgcolor: '#ef4444', borderRadius: '4px', px: '5px', py: '1px',
                  fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.1em',
                  verticalAlign: 'middle', ml: '6px', position: 'relative', top: '-2px',
                }}>
                  <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#fff', flexShrink: 0,
                    '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                    animation: 'pulse 1.4s ease-in-out infinite',
                  }}/>
                  LIVE
                </Box>
              </Box>
            </Box>
          </Box>
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.08em', fontSize: '1.05rem', color: '#e2e8f0' }}>
            ADMIN DASHBOARD
          </Typography>
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

// ─── Event drawer (create / edit) ─────────────────────────────────────────────

// ─── Time picker helpers ──────────────────────────────────────────────────────
// "8:00 AM" ↔ "08:00" (HTML time input value)
function toTimeInput(t) {
  if (!t) return ''
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return ''
  let h = parseInt(m[1]); const min = m[2]; const ap = (m[3] || '').toUpperCase()
  if (ap === 'PM' && h !== 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min}`
}
function fromTimeInput(t) {
  if (!t) return ''
  const [hStr, mStr] = t.split(':')
  let h = parseInt(hStr); const min = mStr || '00'
  const ap = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${min} ${ap}`
}

const EMPTY_TOURNAMENT = { name: '', location: '' }
const EMPTY_DRAFT_SESSION = () => ({
  _key: Date.now() + Math.random(),
  label: '', date: '', start_time: '8:00 AM', end_time: '5:00 PM', streams: [],
})

function EventDrawer({ open, initial, onClose, onSave }) {
  const { tenant }    = useTenant()
  const tz            = tenant?.timezone || 'ET'
  const [form,        setForm]        = useState(EMPTY_TOURNAMENT)
  const [sessions,    setSessions]    = useState([])
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    setForm(initial ? { name: initial.name || '', location: initial.location || '' } : EMPTY_TOURNAMENT)
    setSessions(initial?.days?.length
      ? initial.days.map(d => ({
          _key:        d.id || Math.random(),
          _existingId: d.id,
          label:       d.label      || '',
          date:        d.date       || '',
          start_time:  d.start_time || '8:00 AM',
          end_time:    d.end_time   || '5:00 PM',
          streams:     getSessionStreams(d),
        }))
      : [])
    setExpandedIdx(null)
  }, [initial, open])

  const setField = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  function addSession() {
    const s = EMPTY_DRAFT_SESSION()
    setSessions(prev => [...prev, s])
    setExpandedIdx(sessions.length) // expand the new one
  }
  function removeSession(idx) {
    setSessions(s => s.filter((_, i) => i !== idx))
    setExpandedIdx(x => x === idx ? null : x > idx ? x - 1 : x)
  }
  function updateSession(idx, field, val) {
    setSessions(s => s.map((sess, i) => i === idx ? { ...sess, [field]: val } : sess))
  }
  function addStream(sIdx) {
    setSessions(s => s.map((sess, i) => i !== sIdx ? sess : {
      ...sess, streams: [...sess.streams, { id: Date.now(), name: `Stream ${sess.streams.length + 1}`, url: '' }]
    }))
  }
  function removeStream(sIdx, stIdx) {
    setSessions(s => s.map((sess, i) => i !== sIdx ? sess : {
      ...sess, streams: sess.streams.filter((_, si) => si !== stIdx)
    }))
  }
  function updateStream(sIdx, stIdx, field, val) {
    setSessions(s => s.map((sess, i) => i !== sIdx ? sess : {
      ...sess, streams: sess.streams.map((st, si) => si !== stIdx ? st : { ...st, [field]: val })
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ ...form, sessions: sessions.map(s => ({ ...s, tz })) })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const sectionLabel = { fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#cbd5e1', mb: 0.75 }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 560, bgcolor: '#13192b', borderLeft: '2px solid rgba(99,102,241,0.5)', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5, flexShrink: 0 }}>
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', flex: 1 }}>
            {initial?.id ? 'Edit Event' : 'Add Event'}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: AP.muted }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 2.5, flexShrink: 0 }} />

        {/* Scrollable body */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5, pr: 2.5, pb: 3, scrollbarGutter: 'stable' }}>

          {/* Event details */}
          <Box>
            <Typography sx={sectionLabel}>EVENT DETAILS</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField label="Event Name" value={form.name} onChange={setField('name')} size="small" fullWidth autoFocus placeholder="e.g. Key West Classic" />
              <TextField label="Location"   value={form.location} onChange={setField('location')} size="small" fullWidth placeholder="e.g. Key West, FL" />
            </Box>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

          {/* Sessions */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={sectionLabel}>SESSIONS ({sessions.length})</Typography>
              <Button size="small" startIcon={<AddIcon sx={{ fontSize: '13px !important' }} />} onClick={addSession}
                sx={{ fontSize: '0.68rem', color: AP.accent, py: 0.25, minWidth: 0, '&:hover': { bgcolor: AP.accentDim } }}>
                Add Session
              </Button>
            </Box>

            {sessions.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.4)' }}>
                  No sessions yet — click Add Session to build out the schedule
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sessions.map((sess, sIdx) => {
                const isOpen = expandedIdx === sIdx
                return (
                  <Box key={sess._key} sx={{ border: `1px solid ${isOpen ? AP.accentBdr : 'rgba(255,255,255,0.18)'}`, borderRadius: 1.5, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                    {/* Session header row */}
                    <Box
                      onClick={() => setExpandedIdx(isOpen ? null : sIdx)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, cursor: 'pointer', bgcolor: isOpen ? AP.accentDim : 'transparent', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                    >
                      <IconButton size="small" sx={{ color: AP.accent, p: 0, flexShrink: 0 }}>
                        {isOpen ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: sess.label ? '#fff' : AP.muted, fontSize: '0.82rem', minWidth: 60 }}>
                          {sess.label || `Session ${sIdx + 1}`}
                        </Typography>
                        {sess.date && (
                          <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.7rem' }}>
                            {new Date(sess.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Typography>
                        )}
                        {sess.streams.length > 0 && (
                          <Typography variant="caption" sx={{ color: AP.accent, fontSize: '0.65rem' }}>
                            {sess.streams.length} stream{sess.streams.length !== 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                      <IconButton size="small" onClick={e => { e.stopPropagation(); removeSession(sIdx) }} sx={{ color: AP.muted, '&:hover': { color: '#f44336' }, p: 0.25 }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>

                    {/* Session body */}
                    <Collapse in={isOpen}>
                      <Box sx={{ px: 2, pb: 2, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid rgba(255,255,255,0.14)' }}>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                          <TextField size="small" label="Label" value={sess.label} onChange={e => updateSession(sIdx, 'label', e.target.value)} placeholder="e.g. Day 1" sx={{ flex: 1 }} />
                          <TextField size="small" label="Date" type="date" value={sess.date} onChange={e => updateSession(sIdx, 'date', e.target.value)} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                          <TextField size="small" label="Start" type="time" InputLabelProps={{ shrink: true }}
                            value={toTimeInput(sess.start_time)}
                            onChange={e => updateSession(sIdx, 'start_time', fromTimeInput(e.target.value))}
                            sx={{ flex: 1 }} />
                          <TextField size="small" label="End" type="time" InputLabelProps={{ shrink: true }}
                            value={toTimeInput(sess.end_time)}
                            onChange={e => updateSession(sIdx, 'end_time', fromTimeInput(e.target.value))}
                            sx={{ flex: 1 }} />
                          <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.7rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{tz}</Typography>
                        </Box>

                        {/* Streams */}
                        <Box>
                          <Typography sx={{ ...sectionLabel, mb: 0.5 }}>STREAMS</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {sess.streams.map((st, stIdx) => (
                              <Box key={st.id ?? stIdx} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 1, px: 1.5, py: 1 }}>
                                <Typography variant="caption" sx={{ color: AP.muted, fontWeight: 700, minWidth: 18, fontSize: '0.65rem' }}>#{stIdx + 1}</Typography>
                                <TextField size="small" placeholder="Stream name" value={st.name} onChange={e => updateStream(sIdx, stIdx, 'name', e.target.value)}
                                  sx={{ width: 130, '& input': { fontSize: '0.75rem', py: '4px' }, '& .MuiOutlinedInput-root': { height: 28 } }} />
                                <TextField size="small" placeholder="HLS / RTMP URL" value={st.url} onChange={e => updateStream(sIdx, stIdx, 'url', e.target.value)}
                                  sx={{ flex: 1, '& input': { fontSize: '0.7rem', fontFamily: 'monospace', py: '4px' }, '& .MuiOutlinedInput-root': { height: 28 } }} />
                                <IconButton size="small" onClick={() => removeStream(sIdx, stIdx)} sx={{ color: AP.muted, '&:hover': { color: '#f44336' }, p: 0.25, flexShrink: 0 }}>
                                  <CloseIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Box>
                            ))}
                          </Box>
                          <Button size="small" startIcon={<AddIcon sx={{ fontSize: '12px !important' }} />} onClick={() => addStream(sIdx)}
                            disabled={sess.streams.length >= 10}
                            sx={{ mt: 0.75, fontSize: '0.68rem', color: AP.accent, py: 0.25, '&:hover': { bgcolor: AP.accentDim } }}>
                            Add Stream
                          </Button>
                        </Box>
                      </Box>
                    </Collapse>
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2, borderTop: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, mt: 1 }}>
          <Button onClick={onClose} sx={{ color: '#a8bcd4' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name || saving} variant="contained"
            sx={{ bgcolor: AP.accent, '&:hover': { bgcolor: AP.accentHov } }}>
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save Event'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

// ─── Session drawer (create / edit within an event) ──────────────────────────

const EMPTY_DAY = { label: '', date: '', start_time: '8:00 AM', end_time: '5:00 PM' }

function SessionDrawer({ open, initial, tournament, channels, onClose, onSaved, onOpenPicker }) {
  const { tenant } = useTenant()
  const tz         = tenant?.timezone || 'ET'
  const [form, setForm] = useState(EMPTY_DAY)
  const [streams, setStreams] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(initial
      ? { label: initial.label, date: initial.date, start_time: initial.start_time, end_time: initial.end_time }
      : EMPTY_DAY)
    setStreams(initial ? getSessionStreams(initial) : [])
  }, [initial, open])

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function addStream() {
    if (streams.length >= 10) return
    setStreams(s => [...s, { id: Date.now(), url: '', name: `Stream ${s.length + 1}` }])
  }

  function removeStream(idx) {
    setStreams(s => s.filter((_, i) => i !== idx))
  }

  function setStreamName(idx, name) {
    setStreams(s => s.map((st, i) => i === idx ? { ...st, name } : st))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSaved({ ...form, tz, streams })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const isValid = form.label && form.date && form.start_time && form.end_time

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 520, bgcolor: '#13192b', borderLeft: '2px solid rgba(99,102,241,0.5)', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, minHeight: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', flex: 1 }}>
            {initial?.id ? 'Edit Session' : 'Add Session'}
            {tournament?.name && (
              <Typography component="span" sx={{ color: '#a8bcd4', fontSize: '0.75rem', fontFamily: 'Poppins, sans-serif', fontWeight: 400, ml: 1 }}>
                — {tournament.name}
              </Typography>
            )}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: AP.muted }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

        <TextField label="Label" value={form.label} onChange={set('label')} size="small" fullWidth autoFocus placeholder="e.g. Day 1" />
        <TextField label="Date" type="date" value={form.date} onChange={set('date')} size="small" fullWidth InputLabelProps={{ shrink: true }} />
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField label="Start" type="time" size="small" fullWidth InputLabelProps={{ shrink: true }}
            value={toTimeInput(form.start_time)}
            onChange={e => setForm(f => ({ ...f, start_time: fromTimeInput(e.target.value) }))} />
          <TextField label="End" type="time" size="small" fullWidth InputLabelProps={{ shrink: true }}
            value={toTimeInput(form.end_time)}
            onChange={e => setForm(f => ({ ...f, end_time: fromTimeInput(e.target.value) }))} />
          <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{tz}</Typography>
        </Box>

        {/* Streams section */}
        <Box>
          <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', mb: 1, display: 'block' }}>
            STREAMS
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {streams.map((st, idx) => (
              <Box key={st.id ?? idx} sx={{ border: '1px solid rgba(255,255,255,0.18)', borderRadius: 1.5, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: AP.muted, fontWeight: 700, minWidth: 20 }}>#{idx + 1}</Typography>
                  <TextField
                    size="small" label="Name" value={st.name}
                    onChange={e => setStreamName(idx, e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" onClick={() => removeStream(idx)} sx={{ color: AP.muted, '&:hover': { color: '#f44336' } }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{
                    color: st.url ? AP.accent : 'rgba(168,188,212,0.4)',
                    fontFamily: 'monospace', fontSize: '0.65rem', flex: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {st.url ? shortUrl(st.url) : 'No channel assigned'}
                  </Typography>
                  <Button
                    size="small" variant="outlined"
                    onClick={() => onOpenPicker(idx, initial, tournament?.id)}
                    sx={{ fontSize: '0.68rem', py: 0.25, px: 1, borderColor: AP.accentBdr, color: AP.accent, '&:hover': { borderColor: AP.accent }, flexShrink: 0 }}
                  >
                    Assign
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
          <Button
            size="small" startIcon={<AddIcon />}
            onClick={addStream}
            disabled={streams.length >= 10}
            sx={{ mt: 1, fontSize: '0.72rem', color: AP.accent, '&:hover': { bgcolor: AP.accentDim } }}
          >
            + Add Stream
          </Button>
        </Box>

        <Box sx={{ mt: 'auto', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} sx={{ color: '#a8bcd4' }}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || saving}
            variant="contained"
            sx={{ bgcolor: AP.accent, '&:hover': { bgcolor: AP.accentHov } }}
          >
            {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Save Session'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

// ─── Channel picker dialog ────────────────────────────────────────────────────

function ChannelPickerDialog({ open, slot, day, channels, onClose, onPick }) {
  const streamIndex = typeof slot === 'number' ? slot : null
  const sessionStreams = day ? getSessionStreams(day) : []
  const currentStream = streamIndex !== null ? sessionStreams[streamIndex] : null
  const currentUrl = currentStream?.url || null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', pb: 0 }}>
        Assign Channel → {day?.label} · Stream {streamIndex !== null ? streamIndex + 1 : slot}
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        {currentUrl && (
          <Box sx={{ mb: 1.5, px: 1.5, py: 1, bgcolor: AP.accentDim, border: `1px solid ${AP.accentBdr}`, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 14, color: AP.accent, flexShrink: 0 }} />
            <Box>
              <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.62rem', display: 'block' }}>CURRENTLY ASSIGNED</Typography>
              <Typography variant="caption" sx={{ color: AP.accent, fontWeight: 700, fontSize: '0.75rem' }}>
                {currentStream?.name || currentUrl}
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

// ─── Create Live Stream drawer ───────────────────────────────────────────────

const INGEST_FORMATS = [
  { value: 'rtmp',     label: 'RTMP' },
  { value: 'rtmps',    label: 'RTMPS' },
  { value: 'srt',      label: 'SRT (Push)' },
  { value: 'srt_pull', label: 'SRT (Pull)' },
  { value: 'hls',      label: 'HLS Push' },
  { value: 'rtp',      label: 'RTP' },
  { value: 'rtp_fec',  label: 'RTP + FEC' },
]

const REGIONS = [
  { value: 'us-east-1', label: 'US East (us-east-1)' },
  { value: 'eu-west-1', label: 'EU West (eu-west-1)' },
]

// Compute ET date ("YYYY-MM-DD") and time ("HH:MM") for a given Date object
function etDateVal(d) { return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) }
function etTimeVal(d) { return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' }) }
function defaultStreamTimes() {
  const start = new Date(Date.now() + 20 * 60 * 1000)
  const end   = new Date(start.getTime() + 60 * 60 * 1000)
  return { startDate: etDateVal(start), startTime: etTimeVal(start), endDate: etDateVal(end), endTime: etTimeVal(end) }
}

function CreateStreamDrawer({ open, token, onClose, onCreated }) {
  const [channelType, setChannelType] = useState('live_event')
  const [title, setTitle]             = useState('')
  const [region, setRegion]           = useState('us-east-1')
  const [ingestFormat, setIngestFormat] = useState('rtmp')
  const [startDate, setStartDate]     = useState(() => defaultStreamTimes().startDate)
  const [startTime, setStartTime]     = useState(() => defaultStreamTimes().startTime)
  const [endDate, setEndDate]         = useState(() => defaultStreamTimes().endDate)
  const [endTime, setEndTime]         = useState(() => defaultStreamTimes().endTime)
  const [ingestPointId, setIngestPointId] = useState('')
  const [ingestPoints, setIngestPoints]   = useState([])
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [downloadable, setDownloadable]   = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [result, setResult]   = useState(null)
  const [copiedField, setCopiedField] = useState(null)
  const [pricing, setPricing] = useState(null)   // fetched from /api/pricing

  useEffect(() => {
    if (!open) return
    setChannelType('live_event')
    setTitle('')
    setRegion('us-east-1')
    setIngestFormat('rtmp')
    const t = defaultStreamTimes()
    setStartDate(t.startDate)
    setStartTime(t.startTime)
    setEndDate(t.endDate)
    setEndTime(t.endTime)
    setIngestPointId('')
    setDownloadable(false)
    setError('')
    setResult(null)
    setCopiedField(null)
    loadIngestPoints('rtmp')
    // Fetch live pricing rates (public endpoint, no auth needed)
    fetch('/api/pricing')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPricing(data) })
      .catch(() => {})
  }, [open, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const ingestDebounceRef = useRef(null)
  useEffect(() => {
    if (!open) return
    // Debounce: wait until user stops changing time fields before hitting the API
    clearTimeout(ingestDebounceRef.current)
    ingestDebounceRef.current = setTimeout(() => loadIngestPoints(), 600)
    return () => clearTimeout(ingestDebounceRef.current)
  }, [ingestFormat, startDate, startTime, endDate, endTime]) // eslint-disable-line react-hooks/exhaustive-deps

  function loadIngestPoints() {
    const fmt      = ['rtmp', 'srt'].includes(ingestFormat) ? ingestFormat : 'rtmp'
    const startUtc = toUtcIso(startDate, fromTimeInput(startTime))
    const endUtc   = toUtcIso(endDate, fromTimeInput(endTime))
    setLoadingPoints(true)
    // Don't reset ingestPointId or clear the list here — keep the current UI
    // stable while the new fetch is in flight to prevent layout jumps
    let url = `/api/ingest-points?ingest_format=${fmt}`
    if (startUtc) url += `&start_date=${encodeURIComponent(startUtc)}`
    if (endUtc)   url += `&end_date=${encodeURIComponent(endUtc)}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const pts = data.ingest_points || []
        setIngestPoints(pts)
        // Only reset the selection if the previously chosen point is no longer available
        setIngestPointId(prev => pts.find(p => p.id === prev) ? prev : '')
      })
      .catch(() => setIngestPoints([]))
      .finally(() => setLoadingPoints(false))
  }

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const startAMPM = fromTimeInput(startTime)
      const endAMPM   = fromTimeInput(endTime)
      const body = {
        title,
        region,
        channel_type: channelType,
        ingest_format: ingestFormat,
        ingest_point_id: ingestPointId || undefined,
        downloadable,
      }

      if (channelType === 'live_event') {
        const startUtc = toUtcIso(startDate, startAMPM)
        const endUtc   = toUtcIso(endDate,   endAMPM)
        if (!startUtc) throw new Error('Invalid start date/time')
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

  function copyField(field, value) {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const tzLabel = 'ET'
  const startAMPM    = fromTimeInput(startTime)
  const startUtcIso  = channelType === 'live_event' ? toUtcIso(startDate, startAMPM) : null
  const endUtcIso    = channelType === 'live_event' ? toUtcIso(endDate, fromTimeInput(endTime)) : null
  const minutesUntilStart = startUtcIso ? (new Date(startUtcIso) - Date.now()) / 60_000 : null
  const tooSoon          = minutesUntilStart !== null && minutesUntilStart < 15
  const endNotAfterStart = startUtcIso && endUtcIso && new Date(endUtcIso) <= new Date(startUtcIso)
  const isValid = title && (channelType === 'always_on' || (startDate && startTime && endDate && endTime && !tooSoon && !endNotAfterStart))
  const sectionLabel = { color: '#cbd5e1', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.09em', mb: 0.75 }

  // Helper to render a copyable URL / key row in the result card
  function CopyRow({ fieldKey, label, value, icon }) {
    const wasCopied = copiedField === fieldKey
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          {icon && React.cloneElement(icon, { sx: { fontSize: 12, color: AP.muted } })}
          <Typography variant="caption" sx={{ color: AP.muted, fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.6rem' }}>{label}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(0,0,0,0.35)', borderRadius: 1, px: 1.5, py: 0.75 }}>
          <Typography variant="caption" sx={{ color: AP.accent, fontFamily: 'monospace', fontSize: '0.63rem', flex: 1, wordBreak: 'break-all', lineHeight: 1.5 }}>
            {value}
          </Typography>
          <Tooltip title={wasCopied ? 'Copied!' : 'Copy'}>
            <IconButton size="small" onClick={() => copyField(fieldKey, value)} sx={{ color: wasCopied ? AP.live : AP.muted, flexShrink: 0, p: 0.25 }}>
              <ContentCopyIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    )
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 520, bgcolor: '#13192b', borderLeft: '2px solid rgba(99,102,241,0.5)', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, minHeight: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <LiveTvIcon sx={{ color: AP.accent, fontSize: 20 }} />
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', flex: 1 }}>
            Create Live Stream
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: AP.muted }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5, pr: 2.5, pb: 3, scrollbarGutter: 'stable' }}>
          {error && <Alert severity="error" sx={{ fontSize: '0.8rem' }}>{error}</Alert>}

          {!result ? (
            <>
              {/* ── Channel Type ─────────────────────────────── */}
              <Box>
                <Typography sx={sectionLabel}>CHANNEL TYPE</Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {[
                    { value: 'live_event', icon: <EventIcon />, title: 'Live Event', desc: 'Scheduled start & end time' },
                    { value: 'always_on',  icon: <AllInclusiveIcon />, title: '24/7 Channel', desc: 'Continuous, always-on stream' },
                  ].map(opt => {
                    const sel = channelType === opt.value
                    return (
                      <Box
                        key={opt.value}
                        onClick={() => setChannelType(opt.value)}
                        sx={{
                          flex: 1, cursor: 'pointer', borderRadius: 2, p: 2,
                          border: `2px solid ${sel ? AP.accent : 'rgba(255,255,255,0.1)'}`,
                          bgcolor: sel ? AP.accentDim : 'rgba(255,255,255,0.02)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
                          transition: 'all 0.15s',
                          '&:hover': { borderColor: sel ? AP.accent : AP.accentBdr, bgcolor: sel ? AP.accentDim : 'rgba(255,255,255,0.04)' },
                        }}
                      >
                        <Box sx={{ color: sel ? AP.accent : AP.muted }}>
                          {React.cloneElement(opt.icon, { sx: { fontSize: 30 } })}
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: sel ? '#fff' : AP.muted, textAlign: 'center' }}>
                          {opt.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.67rem', color: sel ? AP.muted : 'rgba(148,163,184,0.5)', textAlign: 'center', lineHeight: 1.3 }}>
                          {opt.desc}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

              {/* ── Stream Name ────────────────────────────────── */}
              <TextField
                fullWidth size="small" label="Stream Name" autoFocus
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. RI Breakers — Day 1 Camera 1"
              />

              {/* ── Region + Ingest Format ─────────────────────── */}
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

              {/* ── Live Event time windows ─────────────────────── */}
              {channelType === 'live_event' && (
                <>
                  <Box>
                    <Typography sx={sectionLabel}>START ({tzLabel})</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <TextField type="date" size="small" fullWidth label="Date"
                        value={startDate} onChange={e => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField type="time" size="small" fullWidth label="Time"
                        value={startTime} onChange={e => setStartTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        error={tooSoon}
                        helperText={tooSoon
                          ? (minutesUntilStart < 0
                              ? `${Math.abs(Math.round(minutesUntilStart))} min in the past`
                              : `Only ${Math.round(minutesUntilStart)} min away — need 15+`)
                          : null
                        }
                      />
                    </Box>
                    {tooSoon && (
                      <Alert severity="warning" sx={{ mt: 1, fontSize: '0.78rem', py: 0.5 }}>
                        Start time must be at least 15 minutes from now.
                      </Alert>
                    )}
                  </Box>

                  <Box>
                    <Typography sx={sectionLabel}>END ({tzLabel})</Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <TextField type="date" size="small" fullWidth label="Date"
                        value={endDate} onChange={e => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        error={!!endNotAfterStart}
                      />
                      <TextField type="time" size="small" fullWidth label="Time"
                        value={endTime} onChange={e => setEndTime(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        error={!!endNotAfterStart}
                      />
                    </Box>
                    {endNotAfterStart && (
                      <Alert severity="warning" sx={{ mt: 1, fontSize: '0.78rem', py: 0.5 }}>
                        End time must be after the start time.
                      </Alert>
                    )}
                  </Box>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                </>
              )}

              {/* ── Ingest Point ───────────────────────────────── */}
              <Box>
                <Typography sx={sectionLabel}>INGEST POINT (optional)</Typography>
                <TextField
                  select fullWidth size="small" label="Ingest Point"
                  value={ingestPointId}
                  onChange={e => !loadingPoints && setIngestPointId(e.target.value)}
                  disabled={loadingPoints}
                  helperText={
                    loadingPoints
                      ? 'Checking availability…'
                      : startDate
                        ? 'Availability checked against your selected time window'
                        : 'Set start/end time to check availability'
                  }
                  InputProps={{
                    endAdornment: loadingPoints
                      ? <CircularProgress size={14} sx={{ color: AP.muted, mr: 2.5, flexShrink: 0 }} />
                      : undefined,
                  }}
                >
                  <MenuItem value="">— Auto-assign —</MenuItem>
                  {ingestPoints.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}{p.available ? ' ✓ available' : ' — in use'}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>


              {/* ── Downloadable Recording ─────────────────────── */}
              <Box
                onClick={() => setDownloadable(v => !v)}
                sx={{
                  border: `1px solid ${downloadable ? AP.liveBdr : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 1.5, p: 1.75,
                  bgcolor: downloadable ? AP.liveDim : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  '&:hover': { borderColor: downloadable ? AP.live : 'rgba(255,255,255,0.2)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DownloadIcon sx={{ color: downloadable ? AP.live : AP.muted, fontSize: 22, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: downloadable ? '#fff' : AP.muted, lineHeight: 1.2 }}>
                      Downloadable Recording
                    </Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: AP.muted, mt: 0.25 }}>
                      VOD asset saved 10 days · Auto-deleted after expiry
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {downloadable && (
                      <Chip label="+$5" size="small"
                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: 'rgba(16,185,129,0.15)', color: AP.live, border: `1px solid ${AP.liveBdr}` }}
                      />
                    )}
                    <Switch
                      checked={downloadable}
                      onChange={e => { e.stopPropagation(); setDownloadable(e.target.checked) }}
                      size="small"
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: AP.live },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: AP.live },
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              {/* ── Estimated Total ────────────────────────────── */}
              {(() => {
                const feedRate   = pricing?.feed_rate_per_hr ?? 15
                const startUtc   = channelType === 'live_event' ? toUtcIso(startDate, fromTimeInput(startTime)) : null
                const endUtc     = channelType === 'live_event' ? toUtcIso(endDate,   fromTimeInput(endTime))   : null
                const hours      = (startUtc && endUtc) ? Math.max(0, (new Date(endUtc) - new Date(startUtc)) / 3_600_000) : null
                const streamCost = hours != null ? hours * feedRate : null
                const vodCost    = downloadable ? 5 : 0
                const total      = streamCost != null ? streamCost + vodCost : (downloadable ? vodCost : null)

                return (
                  <Box sx={{ border: `1px solid ${AP.accentBdr}`, borderRadius: 1.5, bgcolor: AP.accentDim }}>
                    <Box sx={{ px: 1.75, py: 1.25, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {streamCost != null && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.72rem' }}>
                            Stream ({hours % 1 === 0 ? hours : hours.toFixed(1)} hr{hours !== 1 ? 's' : ''})
                          </Typography>
                          <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.72rem' }}>{fmtUSD(streamCost)}</Typography>
                        </Box>
                      )}
                      {downloadable && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.72rem' }}>Downloadable Recording</Typography>
                          <Typography variant="caption" sx={{ color: AP.live, fontSize: '0.72rem', fontWeight: 700 }}>+{fmtUSD(vodCost)}</Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.72rem' }}>CDN</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.72rem' }}>—</Typography>
                      </Box>
                      <Divider sx={{ borderColor: AP.accentBdr, my: 0.25 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.06em' }}>ESTIMATED TOTAL</Typography>
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: AP.accent }}>
                          {total != null ? fmtUSD(total) : streamCost == null ? '—' : fmtUSD(vodCost)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.25 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', mt: '2px', flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.4)', fontSize: '0.65rem', lineHeight: 1.4 }}>
                          CDN delivery cost is calculated after the stream ends based on actual viewer minutes.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )
              })()}
            </>
          ) : (
            /* ── Result card ─────────────────────────────────── */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Alert severity="success" sx={{ fontSize: '0.8rem' }}>
                <strong>{result.name}</strong> created successfully!
                {result.downloadable && (
                  <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', mt: 0.25, color: 'inherit', opacity: 0.85 }}>
                    Recording will be available for download for 10 days after the stream ends.
                  </Box>
                )}
              </Alert>

              {/* Connection Details */}
              <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', border: `1px solid ${AP.accentBdr}`, borderRadius: 1.5, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography sx={sectionLabel}>CONNECTION DETAILS</Typography>

                {(result.ingest_address || result.raw?.ingest_address) && (
                  <CopyRow
                    fieldKey="ingest"
                    label="INGEST URL"
                    value={result.ingest_address || result.raw?.ingest_address}
                    icon={<LinkIcon />}
                  />
                )}
                {(result.ingest_stream_key || result.raw?.connection_code) && (
                  <CopyRow
                    fieldKey="key"
                    label="STREAM KEY"
                    value={result.ingest_stream_key || result.raw?.connection_code}
                    icon={<VpnKeyIcon />}
                  />
                )}
                {result.stream_url && (
                  <CopyRow
                    fieldKey="playback"
                    label="PLAYBACK URL (HLS)"
                    value={result.stream_url}
                    icon={<PlayArrowIcon />}
                  />
                )}
              </Box>

              {/* Stream Info */}
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 1.5, p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography sx={sectionLabel}>STREAM INFO</Typography>
                {[
                  { label: 'STREAM ID',  value: result.id },
                  { label: 'SITE ID',    value: result.site_id || 'nowvcKsD' },
                  { label: 'TYPE',       value: result.stream_type || '—' },
                  { label: 'INGEST FORMAT', value: result.ingest_format || '—' },
                ].map(row => (
                  <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: AP.muted, fontWeight: 700, letterSpacing: '0.07em', fontSize: '0.6rem' }}>{row.label}</Typography>
                    <Typography variant="caption" sx={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.7rem' }}>{row.value}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ color: AP.muted, fontWeight: 700, letterSpacing: '0.07em', fontSize: '0.6rem' }}>STATUS</Typography>
                  <Chip
                    label={{ requested: 'Scheduled', scheduled: 'Scheduled', creating: 'Creating', active: 'Live', idle: 'Idle' }[result.status] || result.status || 'Creating'}
                    size="small"
                    sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.06)', color: AP.muted }}
                  />
                </Box>
                {result.warm_up_start && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: AP.muted, fontWeight: 700, letterSpacing: '0.07em', fontSize: '0.6rem' }}>WARM-UP STARTS</Typography>
                    <Typography variant="caption" sx={{ color: AP.warn, fontFamily: 'monospace', fontSize: '0.65rem' }}>
                      {new Date(result.warm_up_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>{/* end scrollable content */}

        {/* Footer */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
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
        </Box>
      </Box>{/* end outer Box */}
    </Drawer>
  )
}

// ─── Tournament card (with collapsible days table) ────────────────────────────

function TournamentCard({ tournament, channels, token, onRefresh, onAddDay, onEditDay, onDeleteDay, onOpenPicker, onEditTournament, onDeleteTournament }) { // eslint-disable-line no-unused-vars
  const [expanded, setExpanded] = useState(false)

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
          <Tooltip title="Add session">
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: '14px !important' }} />}
              variant="outlined"
              onClick={() => onAddDay(tournament)}
              sx={{ fontSize: '0.7rem', py: 0.3, px: 1, borderColor: AP.accentBdr, color: AP.accent, '&:hover': { borderColor: AP.accent } }}
            >
              Add Session
            </Button>
          </Tooltip>
          <Tooltip title="Edit event">
            <IconButton size="small" onClick={() => onEditTournament(tournament)} sx={{ color: '#a8bcd4', '&:hover': { color: '#fff' } }}>
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete event">
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
              No sessions scheduled. Click "+ Add Session" to get started.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { color: '#a8bcd4', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.05)' } }}>
                <TableCell>SESSION</TableCell>
                <TableCell>DATE</TableCell>
                <TableCell>STREAMS</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {tournament.days.map(day => {
                const dayStreams = getSessionStreams(day)
                return (
                <TableRow key={day.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 1.25 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{day.label}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, display: 'block', whiteSpace: 'nowrap' }}>{formatDate(day.date)}</Typography>
                    <Typography variant="caption" sx={{ color: '#a8bcd4', whiteSpace: 'nowrap' }}>{day.start_time} – {day.end_time} {/^E[DS]T$/.test(day.tz) ? 'ET' : (day.tz || 'ET')}</Typography>
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {dayStreams.length === 0 ? (
                        <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.4)', fontSize: '0.68rem', fontStyle: 'italic' }}>No streams assigned</Typography>
                      ) : dayStreams.map((st, idx) => (
                        <Box
                          key={st.id ?? idx}
                          onClick={() => onOpenPicker(idx, day, tournament.id)}
                          sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            cursor: 'pointer', px: 1, py: 0.4, borderRadius: 1,
                            border: '1px solid',
                            borderColor: st.url ? 'rgba(76,175,80,0.5)' : 'rgba(255,255,255,0.1)',
                            bgcolor: st.url ? 'rgba(76,175,80,0.07)' : 'transparent',
                            '&:hover': { borderColor: st.url ? '#4caf50' : AP.accent, bgcolor: st.url ? 'rgba(76,175,80,0.12)' : AP.accentDim },
                          }}
                        >
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: st.url ? '#4caf50' : 'rgba(168,188,212,0.3)', flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: st.url ? '#fff' : 'rgba(168,188,212,0.4)', fontWeight: st.url ? 700 : 400, fontSize: '0.68rem' }}>
                            {st.name || `Stream ${idx + 1}`}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit session">
                        <IconButton size="small" onClick={() => onEditDay(day, tournament)} sx={{ color: '#a8bcd4', '&:hover': { color: '#fff' } }}>
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete session">
                        <IconButton size="small" onClick={() => onDeleteDay(day, tournament)} sx={{ color: '#a8bcd4', '&:hover': { color: '#f44336' } }}>
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
      </Collapse>
    </Paper>
  )
}

// ─── Tournament cost card ─────────────────────────────────────────────────────

function TournamentCostCard({ tournament, cdnRecords = [] }) {
  const [expanded,     setExpanded]     = useState(true)
  const [expandedDays, setExpandedDays] = useState(new Set())
  const dateRange = getTournamentDateRange(tournament)
  const hasCost   = tournament.tournamentTotal > 0

  function fmtUSD(n) { return '$' + Number(n || 0).toFixed(2) }
  function fmtGB(n)  { return Number(n || 0).toFixed(2) + ' GB' }

  function toggleDay(date) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

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
              No sessions scheduled.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: '#a8bcd4', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', borderColor: 'rgba(255,255,255,0.05)', whiteSpace: 'nowrap' } }}>
                  <TableCell>SESSION</TableCell>
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
                  const dayOpen   = expandedDays.has(day.date)
                  const dayFeeds  = cdnRecords.filter(r => r.date === day.date && Number(r.tournament_id) === tournament.id)
                  const clickable = logged || pending || live

                  return (
                    <React.Fragment key={day.id || day.date}>
                      {/* ── Day summary row ── */}
                      <TableRow
                        onClick={() => clickable && toggleDay(day.date)}
                        sx={{
                          '& td': { borderColor: dayOpen ? 'transparent' : 'rgba(255,255,255,0.05)', py: 1.25 },
                          bgcolor: dayOpen ? 'rgba(99,102,241,0.04)' : 'transparent',
                          opacity: (none || scheduled) ? 0.5 : 1,
                          cursor: clickable ? 'pointer' : 'default',
                          '&:hover td': clickable ? { bgcolor: 'rgba(255,255,255,0.025)' } : {},
                        }}
                      >
                        <TableCell sx={{ pl: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {clickable && (
                              <Box sx={{ color: AP.muted, display: 'flex', alignItems: 'center', transition: 'transform 0.15s', transform: dayOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                <ChevronRightIcon sx={{ fontSize: 16 }} />
                              </Box>
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff', fontSize: '0.82rem' }}>{day.label}</Typography>
                          </Box>
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
                            {logged ? fmtUSD(day.cost_feed)
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

                      {/* ── Expanded feed rows (same columns as day row) ── */}
                      {dayOpen && (dayFeeds.length === 0 ? (
                        <TableRow sx={{ '& td': { borderColor: 'rgba(255,255,255,0.04)', bgcolor: 'rgba(0,0,0,0.15)' } }}>
                          <TableCell colSpan={8} sx={{ pl: 5, py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: AP.muted, fontStyle: 'italic', fontSize: '0.75rem' }}>
                              No feeds logged for this session yet.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : dayFeeds.map(f => (
                        <TableRow key={f.id} sx={{
                          '& td': { borderColor: 'rgba(255,255,255,0.04)', py: 1, bgcolor: 'rgba(0,0,0,0.15)' },
                          '&:last-child td': { borderBottom: '1px solid rgba(255,255,255,0.05)' },
                        }}>
                          {/* DAY col → feed name indented */}
                          <TableCell sx={{ pl: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 2, height: 28, bgcolor: AP.accentBdr, borderRadius: 1, flexShrink: 0 }} />
                              <Box>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: AP.text }}>{f.channel_name}</Typography>
                                <Typography sx={{ fontSize: '0.6rem', color: AP.muted, fontFamily: 'monospace' }}>{f.channel_id}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          {/* DATE col → same date as parent day */}
                          <TableCell>
                            <Typography sx={{ fontSize: '0.7rem', color: AP.muted, whiteSpace: 'nowrap' }}>
                              {formatDate(f.date)}
                            </Typography>
                          </TableCell>
                          {/* FEEDS col → empty */}
                          <TableCell />
                          {/* STREAM HRS */}
                          <TableCell sx={{ fontSize: '0.75rem', color: AP.muted }}>{Number(f.stream_hours).toFixed(2)}h</TableCell>
                          {/* GB DEL */}
                          <TableCell sx={{ fontSize: '0.75rem', color: AP.muted }}>{Number(f.minutes_delivered) > 0 ? fmtGB(f.gb_delivered) : '—'}</TableCell>
                          {/* FEED FEE */}
                          <TableCell sx={{ fontSize: '0.75rem', color: AP.muted }}>{fmtUSD(f.cost_feed)}</TableCell>
                          {/* CDN COST */}
                          <TableCell>
                            {Number(f.minutes_delivered) > 0
                              ? <Typography sx={{ fontSize: '0.75rem', color: AP.muted }}>{fmtUSD(f.cost_cdn)}</Typography>
                              : <Chip label="Pending" size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.4)' }} />
                            }
                          </TableCell>
                          {/* TOTAL */}
                          <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: AP.accent }}>{fmtUSD(f.cost_total)}</TableCell>
                        </TableRow>
                      )))}

                    </React.Fragment>
                  )
                })}
                {/* Subtotal */}
                {hasCost && (
                  <TableRow sx={{ '& td': { borderColor: 'rgba(255,255,255,0.07)', borderTop: '1px solid rgba(255,255,255,0.1)', py: 1 } }}>
                    <TableCell colSpan={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#a8bcd4', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.08em' }}>
                        EVENT TOTAL
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
              EVENT COSTS
            </Typography>
          </Box>
          {grandTotal > 0 && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ color: AP.accent, fontWeight: 700, fontSize: '1.1rem', fontFamily: "'Bayon', sans-serif", letterSpacing: '0.04em', lineHeight: 1 }}>
                {fmtUSD(grandTotal)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.62rem' }}>
                all events · feed fees + CDN
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 2 }}>
          {tournamentRollup.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'rgba(168,188,212,0.5)', textAlign: 'center', py: 2 }}>
              No events found.
            </Typography>
          ) : (
            tournamentRollup.map(t => (
              <TournamentCostCard key={t.id} tournament={t} cdnRecords={cdnRecords} />
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
          Rates: ${cdnPricing.feed_rate_per_hr}/hr per feed · ${cdnPricing.cdn_rate_per_gb}/GB CDN
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
          timezone: data.timezone || 'ET',
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
          <TextField size="small" label="Default Timezone" value={form.timezone || ''} onChange={e => setField('timezone', e.target.value)}
            placeholder="ET" helperText="Used on all sessions (e.g. ET, PT, CT)" sx={{ width: 220 }} />
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
  const [createStreamKey, setCreateStreamKey]   = useState(0)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dashboardView, setDashboardView] = useState('both')
  const [streamFilter, setStreamFilter] = useState('all')
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

  async function saveTournament({ sessions, ...eventForm }) {
    const isEdit = !!tournamentDialog.initial?.id
    const res = await fetch('/api/tournaments', {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeader(token),
      body: JSON.stringify(isEdit ? { id: tournamentDialog.initial.id, ...eventForm } : eventForm),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    // Save any inline sessions
    if (sessions?.length) {
      for (const sess of sessions) {
        const { _key, _existingId, ...sessData } = sess
        // Skip sessions with no label or date
        if (!sessData.label && !sessData.date) continue
        const streams = (sessData.streams || []).filter(s => s.url || s.name)
        const sessRes = await fetch('/api/tournament-days', {
          method: _existingId ? 'PUT' : 'POST',
          headers: authHeader(token),
          body: JSON.stringify({
            tournament_id: data.id,
            ...(_existingId ? { id: _existingId } : {}),
            ...sessData,
            streams,
          }),
        })
        if (!sessRes.ok) {
          const errData = await sessRes.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to save a session')
        }
      }
    }

    await fetchTournaments()
    showSnack(isEdit ? `Event "${data.name}" updated` : `Event "${data.name}" created`)
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

  async function saveDay(formWithStreams) {
    const { tournament } = dayDialog
    const isEdit = !!dayDialog.initial?.id
    const res = await fetch('/api/tournament-days', {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeader(token),
      body: JSON.stringify({
        tournament_id: tournament.id,
        ...(isEdit ? { id: dayDialog.initial.id } : {}),
        ...formWithStreams,
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

  // ── Stream assignment ─────────────────────────────────────────────────────────

  async function assignCamera(streamIndex, tournamentId, picked) {
    const { day } = pickerDialog
    if (!day) return
    const url  = picked?.url  ?? null
    const name = picked?.name ?? null
    setPickerDialog({ open: false, slot: null, day: null, tournamentId: null })
    try {
      // Build updated streams array from current session
      const existingStreams = getSessionStreams(day)
      let updatedStreams
      if (url === null) {
        // Clear — remove stream at index
        updatedStreams = existingStreams.filter((_, i) => i !== streamIndex)
      } else {
        // Assign — update or add stream at index
        updatedStreams = [...existingStreams]
        if (streamIndex < updatedStreams.length) {
          updatedStreams[streamIndex] = { ...updatedStreams[streamIndex], url, name: name || updatedStreams[streamIndex].name }
        } else {
          updatedStreams.push({ id: Date.now(), url, name: name || `Stream ${streamIndex + 1}` })
        }
      }
      const res = await fetch('/api/tournament-days', {
        method: 'PUT',
        headers: authHeader(token),
        body: JSON.stringify({
          tournament_id: tournamentId,
          id: day.id,
          streams: updatedStreams,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      await fetchTournaments()
      showSnack(picked ? `Stream ${streamIndex + 1} assigned to ${day.label}` : `Stream ${streamIndex + 1} cleared`, 'success')
    } catch (err) {
      showSnack(`Failed to save: ${err.message}`, 'error')
    }
  }

  function openPicker(streamIndex, day, tournamentId) {
    setPickerDialog({ open: true, slot: streamIndex, day, tournamentId })
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

  // ── Stats helpers ────────────────────────────────────────────────────────────
  const liveNow = channels.filter(ch => ch.status === 'active').length
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const sessionsToday = tournaments.reduce((sum, t) => sum + (t.days || []).filter(d => d.date === todayStr).length, 0)
  const totalCdnCost = cdnRecords.reduce((sum, r) => sum + (r.cost_total || 0), 0)

  const NAV_ITEMS = [
    { section: 'MANAGEMENT', items: [
      { label: 'Events',       tab: 'dashboard', view: 'events',  count: tournaments.length },
      { label: 'Live Streams', tab: 'dashboard', view: 'streams', count: channels.length },
    ]},
    { section: 'FINANCE', items: [
      { label: 'Costs', tab: 'costs', view: null },
    ]},
    { section: 'SYSTEM', items: [
      { label: 'Settings', tab: 'settings', view: null },
    ]},
  ]

  function navClick(tab, view) {
    setActiveTab(tab)
    if (view) setDashboardView(view)
  }

  function isNavActive(tab, view) {
    if (activeTab !== tab) return false
    if (view && tab === 'dashboard') return dashboardView === view
    return true
  }

  return (
    <Box height="100vh" display="flex" flexDirection="column" sx={{ bgcolor: 'background.default', overflow: 'hidden' }}>
      {/* Topbar */}
      <Box height={48} display="flex" alignItems="center" px={2} gap={1.5}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)', bgcolor: '#0a0f1a', flexShrink: 0, zIndex: 10 }}
      >
        {/* Topbar logo — B */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <svg width="26" height="26" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="22" r="18" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5"/>
            <circle cx="22" cy="22" r="12" stroke="rgba(99,102,241,0.55)" strokeWidth="1.5"/>
            <path d="M18 15.5l11 6.5-11 6.5V15.5z" fill="#6366f1"/>
          </svg>
          <Box sx={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.01em', color: '#fff', lineHeight: 1 }}>
            Event<Box component="span" sx={{ color: AP.accent }}>Hub</Box>
          </Box>
          <Box component="span" sx={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            bgcolor: '#ef4444', borderRadius: '3px', px: '5px', py: '1px',
            fontSize: '0.5rem', fontWeight: 800, letterSpacing: '0.1em', color: '#fff',
          }}>
            <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#fff',
              '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
              animation: 'pulse 1.4s ease-in-out infinite', flexShrink: 0,
            }}/>
            LIVE
          </Box>
        </Box>
        <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.7rem' }}>Admin</Typography>
        {liveNow > 0 && (
          <Chip label={`${liveNow} LIVE`} size="small"
            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: AP.liveDim, color: AP.live, border: `1px solid ${AP.liveBdr}` }} />
        )}
        <Box ml="auto" display="flex" gap={1} alignItems="center">
          <Tooltip title="Go to live site">
            <Button component="a" href="/" size="small" sx={{ color: '#a8bcd4', fontSize: '0.72rem' }}>Live Site</Button>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={onLogout} sx={{ color: '#a8bcd4' }} size="small">
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Layout */}
      <Box display="flex" flex={1} overflow="hidden">
        {/* Sidebar */}
        <Box width={200} sx={{ bgcolor: '#0a0f1a', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', py: 2, flexShrink: 0, overflow: 'auto' }}>
          {NAV_ITEMS.map(({ section, items }) => (
            <Box key={section} sx={{ mb: 2 }}>
              <Typography sx={{ px: 2, pb: 0.75, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase' }}>
                {section}
              </Typography>
              {items.map(item => {
                const active = isNavActive(item.tab, item.view)
                return (
                  <Box
                    key={item.label}
                    onClick={() => navClick(item.tab, item.view)}
                    sx={{
                      px: 2, py: 0.85, display: 'flex', alignItems: 'center', gap: 1,
                      cursor: 'pointer', borderRadius: '0 6px 6px 0', mr: 1,
                      bgcolor: active ? AP.accentDim : 'transparent',
                      borderLeft: active ? `2px solid ${AP.accent}` : '2px solid transparent',
                      '&:hover': { bgcolor: active ? AP.accentMid : 'rgba(255,255,255,0.04)' },
                    }}
                  >
                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: active ? AP.accent : 'rgba(148,163,184,0.4)', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: active ? 700 : 500, color: active ? '#e2e8f0' : '#94a3b8', flex: 1 }}>
                      {item.label}
                    </Typography>
                    {item.count != null && (
                      <Chip label={item.count} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.07)', color: '#64748b', minWidth: 20 }} />
                    )}
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>

        {/* Main content */}
        <Box flex={1} overflow="auto">
          {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

          {activeTab === 'dashboard' && (
            <>
              {/* Stats row */}
              <Box display="grid" sx={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 1.5, p: 2, pb: 0 }}>
                {[
                  { label: 'Live Now',       value: liveNow,        color: AP.live,    dim: AP.liveDim   },
                  { label: 'Sessions Today', value: sessionsToday,  color: AP.accent,  dim: AP.accentDim },
                  { label: 'Event Cost',     value: `$${totalCdnCost.toFixed(2)}`, color: AP.warn, dim: AP.warnDim },
                  { label: 'Total Streams',  value: channels.length, color: AP.slate,  dim: AP.slateDim  },
                ].map(({ label, value, color, dim }) => (
                  <Paper key={label} elevation={0} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, bgcolor: dim }}>
                    <Typography variant="caption" sx={{ color: AP.muted, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {label}
                    </Typography>
                    <Typography sx={{ color, fontWeight: 700, fontSize: '1.6rem', fontFamily: "'Bayon', sans-serif", lineHeight: 1.2, mt: 0.25 }}>
                      {value}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              {/* 2-col content grid */}
              <Box display="grid" sx={{ gridTemplateColumns: '1fr 1.6fr', gap: 2, p: 2 }}>

                {/* Events panel */}
                <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{
                    px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`,
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>
                        EVENTS
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
                        Add Event
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
                        <Typography variant="body2" sx={{ color: 'rgba(168,188,212,0.5)' }}>
                          No events yet. Click "Add Event" to create one.
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

                {/* Streams panel */}
                <Paper elevation={0} sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{
                    px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    background: `linear-gradient(90deg, ${AP.accentDim} 0%, transparent 60%)`,
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>
                        LIVE STREAMS
                      </Typography>
                      <Box component="select"
                        value={streamFilter}
                        onChange={e => setStreamFilter(e.target.value)}
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 1, color: AP.muted, fontSize: '0.7rem', px: 1, py: 0.4,
                          cursor: 'pointer', outline: 'none',
                          '&:hover': { borderColor: 'rgba(255,255,255,0.25)' },
                        }}
                      >
                        <option value="all">All</option>
                        <option value="live">Live</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="past">Past</option>
                      </Box>
                    </Box>
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
                        onClick={() => { setCreateStreamKey(k => k + 1); setCreateStreamOpen(true) }}
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
                      <TableCell>DATE</TableCell>
                      <TableCell>STREAM / INGEST</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      // ── Status label + color config ──────────────────────────
                      const STATUS_CFG = {
                        active:     { label: 'Live',      bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.4)'  },
                        requested:  { label: 'Scheduled', bg: 'rgba(99,102,241,0.15)',  color: '#818cf8', border: 'rgba(99,102,241,0.4)'  },
                        scheduled:  { label: 'Scheduled', bg: 'rgba(99,102,241,0.15)',  color: '#818cf8', border: 'rgba(99,102,241,0.4)'  },
                        creating:   { label: 'Creating',  bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', border: 'rgba(245,158,11,0.4)'  },
                        idle:       { label: 'Past',      bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.4)' },
                        stopping:   { label: 'Stopping',  bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.35)'  },
                        destroying: { label: 'Past',      bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.4)' },
                      }

                      // ── Sort helper (newest first) ───────────────────────────
                      const sortByStart = (a, b) => {
                        if (!a.stream_start && !b.stream_start) return (a.name || '').localeCompare(b.name || '')
                        if (!a.stream_start) return 1
                        if (!b.stream_start) return -1
                        const d = new Date(b.stream_start) - new Date(a.stream_start)
                        return d !== 0 ? d : (a.name || '').localeCompare(b.name || '')
                      }

                      // ── Enrich CDN-only channels with tournament day times ───
                      const jwIds = new Set(channels.map(ch => ch.id))
                      const cdnChannelMap = {}
                      cdnRecords.forEach(r => {
                        if (!r.channel_id || jwIds.has(r.channel_id)) return
                        const existing = cdnChannelMap[r.channel_id]
                        if (!existing || r.date > existing.date) cdnChannelMap[r.channel_id] = r
                      })

                      // Helper: parse "8:00 AM" → decimal hours
                      const parseHr = t => {
                        if (!t) return null
                        const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
                        if (!m) return null
                        let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = m[3].toUpperCase()
                        if (ap === 'PM' && h !== 12) h += 12
                        if (ap === 'AM' && h === 12) h = 0
                        return h + min / 60
                      }
                      // Helper: combine date string + time string into UTC ISO
                      const toIso = (date, timeStr) => {
                        const hr = parseHr(timeStr)
                        if (!date || hr === null) return null
                        const d = new Date(date + 'T00:00:00')
                        d.setHours(Math.floor(hr), Math.round((hr % 1) * 60))
                        return d.toISOString()
                      }

                      const syntheticPast = Object.values(cdnChannelMap).map(r => {
                        // Find the tournament day that matches this channel + date
                        let dayStart = null, dayEnd = null
                        for (const t of tournaments) {
                          for (const d of (t.days || [])) {
                            if (d.date !== r.date) continue
                            const urls = [d.camera1_url, d.camera2_url].filter(Boolean)
                            if (urls.some(u => u.includes(r.channel_id))) {
                              dayStart = toIso(d.date, d.start_time)
                              dayEnd   = toIso(d.date, d.end_time)
                              break
                            }
                          }
                          if (dayStart) break
                        }
                        return {
                          id:           r.channel_id,
                          name:         r.channel_name,
                          status:       'idle',
                          stream_type:  null,
                          stream_url:   null,
                          stream_start: dayStart || (r.date ? `${r.date}T00:00:00` : null),
                          stream_end:   dayEnd,
                          ingest_url:   null,
                          ingest_key:   null,
                          _fromCdn:     true,
                        }
                      })

                      // ── Build full list and apply filter ─────────────────────
                      const allChannels = [...channels, ...syntheticPast].sort(sortByStart)
                      const filterGroup = ch => {
                        const s = ch.status?.toLowerCase()
                        if (streamFilter === 'live')      return s === 'active'
                        if (streamFilter === 'scheduled') return ['requested','scheduled','creating'].includes(s)
                        if (streamFilter === 'past')      return ['idle','stopping','destroying'].includes(s)
                        return true
                      }
                      const visibleChannels = allChannels.filter(filterGroup)

                      // ── Format timestamps ────────────────────────────────────
                      const fmtTime = iso => {
                        if (!iso) return null
                        return new Date(iso).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          timeZone: 'America/New_York',
                        })
                      }
                      const fmtWindow = (startIso, endIso) => {
                        const s = fmtTime(startIso)
                        const e = fmtTime(endIso)
                        if (!s && !e) return '—'
                        // If same calendar day, show date once: "Apr 24 · 8:00 AM – 5:00 PM ET"
                        const sDate = startIso ? new Date(startIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }) : null
                        const eDate = endIso   ? new Date(endIso).toLocaleDateString('en-US',   { month: 'short', day: 'numeric', timeZone: 'America/New_York' }) : null
                        if (s && e && sDate === eDate) {
                          const sTime = s.replace(/^[A-Za-z]+ \d+,?\s*/, '')
                          const eTime = e.replace(/^[A-Za-z]+ \d+,?\s*/, '')
                          return { date: sDate, range: `${sTime} – ${eTime} ET` }
                        }
                        if (s && e) return { date: null, range: `${s} – ${e} ET` }
                        if (s)      return { date: null, range: `${s} ET` }
                        return       { date: null, range: `– ${e} ET` }
                      }

                      if (visibleChannels.length === 0) return (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                            <Typography variant="body2" sx={{ color: AP.muted, fontStyle: 'italic' }}>
                              No streams match the selected filter.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )

                      return visibleChannels.map(ch => {
                        const cfg          = STATUS_CFG[ch.status?.toLowerCase()] || STATUS_CFG.idle
                        const spinupStatus = getSpinupStatus(ch)
                        return (
                        <TableRow key={ch.id + (ch._fromCdn ? '-cdn' : '')} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)', py: 1.25 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>{ch.name}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontFamily: 'monospace', fontSize: '0.62rem' }}>
                              {ch.id}{ch.stream_type ? ` · ${ch.stream_type}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                              <Box sx={{
                                display: 'inline-flex', alignItems: 'center', px: '6px',
                                height: 18, borderRadius: '4px',
                                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em',
                                backgroundColor: cfg.bg, color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                lineHeight: 1,
                              }}>
                                {cfg.label}
                              </Box>
                              {spinupStatus === 'starting_soon' && (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', px: '6px', height: 16, borderRadius: '4px', fontSize: '0.57rem', fontWeight: 700, backgroundColor: AP.warnDim, color: AP.warn, border: `1px solid rgba(245,158,11,0.4)`, lineHeight: 1 }}>Starting Soon</Box>
                              )}
                              {spinupStatus === 'winding_down' && (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', px: '6px', height: 16, borderRadius: '4px', fontSize: '0.57rem', fontWeight: 700, backgroundColor: AP.slateDim, color: AP.slate, border: `1px solid rgba(100,116,139,0.4)`, lineHeight: 1 }}>Winding Down</Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const w = fmtWindow(ch.stream_start, ch.stream_end)
                              if (w === '—') return <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.3)', fontSize: '0.68rem' }}>—</Typography>
                              return (
                                <Box>
                                  {w.date && <Typography variant="caption" sx={{ color: '#fff', fontSize: '0.68rem', display: 'block', fontWeight: 600 }}>{w.date}</Typography>}
                                  <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>{w.range}</Typography>
                                </Box>
                              )
                            })()}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {ch.stream_url ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.4)', fontSize: '0.58rem', width: 26, flexShrink: 0 }}>URL</Typography>
                                  <Typography variant="caption" sx={{ color: '#a8bcd4', fontFamily: 'monospace', fontSize: '0.6rem', wordBreak: 'break-all' }}>{ch.stream_url}</Typography>
                                </Box>
                              ) : null}
                              {ch.ingest_url ? (
                                <>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.4)', fontSize: '0.58rem', width: 26, flexShrink: 0 }}>RTMP</Typography>
                                    <Typography variant="caption" sx={{ color: '#a8bcd4', fontFamily: 'monospace', fontSize: '0.6rem', wordBreak: 'break-all' }}>{ch.ingest_url}</Typography>
                                    <Tooltip title="Copy ingest URL">
                                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(ch.ingest_url)} sx={{ color: '#a8bcd4', flexShrink: 0, p: 0.25 }}>
                                        <ContentCopyIcon sx={{ fontSize: 11 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.4)', fontSize: '0.58rem', width: 26, flexShrink: 0 }}>KEY</Typography>
                                    <Typography variant="caption" sx={{ color: AP.accent, fontFamily: 'monospace', fontSize: '0.6rem' }}>{ch.ingest_key}</Typography>
                                    <Tooltip title="Copy stream key">
                                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(ch.ingest_key)} sx={{ color: '#a8bcd4', flexShrink: 0, p: 0.25 }}>
                                        <ContentCopyIcon sx={{ fontSize: 11 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </>
                              ) : null}
                              {!ch.stream_url && !ch.ingest_url && (
                                <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.3)', fontSize: '0.65rem' }}>—</Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {!ch._fromCdn && (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                                {/* VOD download badge — shown for recordings that are downloadable */}
                                {ch.enable_live_to_vod && (() => {
                                  const vodUrl = ch.vod_media_id
                                    ? `https://cdn.jwplayer.com/videos/${ch.vod_media_id}-720p.mp4`
                                    : null
                                  const expiresAt = ch.vod_expires_at ? new Date(ch.vod_expires_at) : null
                                  const daysLeft  = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000)) : null
                                  return (
                                    <Tooltip title={vodUrl ? `Download recording (${daysLeft ?? '?'} days left)` : 'Recording being processed…'}>
                                      <Box
                                        component={vodUrl ? 'a' : 'div'}
                                        href={vodUrl || undefined}
                                        download={vodUrl ? `${ch.name}.mp4` : undefined}
                                        sx={{
                                          display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                          px: 1, py: 0.4, borderRadius: 1,
                                          bgcolor: vodUrl ? AP.liveDim : 'rgba(255,255,255,0.04)',
                                          border: `1px solid ${vodUrl ? AP.liveBdr : 'rgba(255,255,255,0.1)'}`,
                                          color: vodUrl ? AP.live : AP.muted,
                                          cursor: vodUrl ? 'pointer' : 'default',
                                          textDecoration: 'none',
                                          '&:hover': vodUrl ? { bgcolor: 'rgba(16,185,129,0.25)' } : {},
                                        }}
                                      >
                                        <DownloadIcon sx={{ fontSize: 11 }} />
                                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700 }}>
                                          {vodUrl
                                            ? (daysLeft !== null ? `${daysLeft}d left` : 'Download')
                                            : 'Processing…'
                                          }
                                        </Typography>
                                      </Box>
                                    </Tooltip>
                                  )
                                })()}
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                      })
                    })()}
                  </TableBody>
                </Table>
              )}
                </Paper>
              </Box>
            </>
          )}

          {activeTab === 'costs' && (
            <Box sx={{ p: 2 }}>
              <CostsPage
                tournaments={tournaments}
                channels={channels}
                cdnRecords={cdnRecords}
                cdnPricing={cdnPricing}
              />
            </Box>
          )}

          {activeTab === 'settings' && (
            <Box sx={{ p: 2 }}>
              <TenantSettingsPanel token={token} />
            </Box>
          )}

        </Box>
      </Box>

      {/* ── Dialogs / Drawers ─────────────────────────────────── */}
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
      <EventDrawer
        open={tournamentDialog.open}
        initial={tournamentDialog.initial}
        onClose={() => setTournamentDialog({ open: false, initial: null })}
        onSave={saveTournament}
      />
      <SessionDrawer
        open={dayDialog.open}
        initial={dayDialog.initial}
        tournament={dayDialog.tournament}
        channels={channels}
        onClose={() => setDayDialog({ open: false, initial: null, tournament: null })}
        onSaved={saveDay}
        onOpenPicker={openPicker}
      />
      <ChannelPickerDialog
        open={pickerDialog.open}
        slot={pickerDialog.slot}
        day={pickerDialog.day}
        channels={channels}
        onClose={() => setPickerDialog({ open: false, slot: null, day: null, tournamentId: null })}
        onPick={picked => assignCamera(pickerDialog.slot, pickerDialog.tournamentId, picked)}
      />
      <CreateStreamDrawer
        key={createStreamKey}
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
