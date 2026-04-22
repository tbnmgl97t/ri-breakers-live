import React, { useState, useEffect, useCallback } from 'react'
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  Alert, IconButton, Chip, Tooltip, Snackbar, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow,
  AppBar, Toolbar, Tabs, Tab, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, Stack,
} from '@mui/material'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material'
import AddIcon            from '@mui/icons-material/Add'
import DeleteIcon         from '@mui/icons-material/Delete'
import EditIcon           from '@mui/icons-material/Edit'
import LogoutIcon         from '@mui/icons-material/Logout'
import RefreshIcon        from '@mui/icons-material/Refresh'
import SaveIcon           from '@mui/icons-material/Save'
import AttachMoneyIcon    from '@mui/icons-material/AttachMoney'
import CloudIcon          from '@mui/icons-material/Cloud'
import TuneIcon           from '@mui/icons-material/Tune'
import BarChartIcon       from '@mui/icons-material/BarChart'
import BuildIcon          from '@mui/icons-material/Build'

const SESSION_KEY = 'ri_td_admin_token'

// ─── TD Admin palette (teal accent to distinguish from tenant admin) ──────────

const TP = {
  accent:    '#0ea5e9',
  accentHov: '#0284c7',
  accentDim: 'rgba(14,165,233,0.08)',
  accentMid: 'rgba(14,165,233,0.15)',
  accentBdr: 'rgba(14,165,233,0.3)',
  accentBdr2:'rgba(14,165,233,0.5)',
  success:   '#10b981',
  warn:      '#f59e0b',
  danger:    '#ef4444',
  bg:        '#0a0f1e',
  paper:     '#111827',
  border:    'rgba(255,255,255,0.08)',
  muted:     '#94a3b8',
  text:      '#e2e8f0',
}

const tdTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: TP.accent, contrastText: '#fff' },
    background: { default: TP.bg, paper: TP.paper },
    text:       { primary: TP.text, secondary: TP.muted },
    divider:    TP.border,
  },
  typography: { fontFamily: "'Poppins', sans-serif" },
  shape:      { borderRadius: 8 },
  components: {
    MuiButton:  { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiPaper:   { styleOverrides: { root: { backgroundImage: 'none', border: `1px solid ${TP.border}` } } },
    MuiTab:     { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: TP.border } } },
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tdAuthHeader(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function fmtUSD(n) {
  if (n == null || isNaN(n)) return '—'
  return '$' + Number(n).toFixed(2)
}

function fmtGB(n) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toFixed(3) + ' GB'
}

function fmtDate(ds) {
  if (!ds) return '—'
  return new Date(ds + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function monthKey(dateStr) {
  return dateStr?.slice(0, 7) ?? ''
}

function monthLabel(yyyymm) {
  if (!yyyymm) return ''
  const [y, m] = yyyymm.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, action }) {
  return (
    <Box sx={{
      px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid ${TP.border}`,
      background: `linear-gradient(90deg, ${TP.accentDim} 0%, transparent 60%)`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {React.cloneElement(icon, { sx: { color: TP.accent, fontSize: 18 } })}
        <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <Paper elevation={0} sx={{ p: 2, flex: 1, minWidth: 140 }}>
      <Typography variant="caption" sx={{ color: TP.muted, letterSpacing: '0.08em', fontSize: '0.65rem', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: TP.accent, lineHeight: 1.2, mt: 0.5 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" sx={{ color: TP.muted, fontSize: '0.68rem' }}>
          {sub}
        </Typography>
      )}
    </Paper>
  )
}

// ─── CDN Record dialog ────────────────────────────────────────────────────────

const EMPTY_CDN = {
  date: '', label: '', tournament_id: '',
  channel_id: '', channel_name: '',
  gb_ingested: '', gb_delivered: '', gb_stored: '',
}

function CdnRecordDialog({ open, initial, tournaments, onClose, onSave }) {
  const [form, setForm]   = useState(EMPTY_CDN)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        date:          initial.date,
        label:         initial.label,
        tournament_id: initial.tournament_id ?? '',
        channel_id:    initial.channel_id,
        channel_name:  initial.channel_name,
        gb_ingested:   initial.gb_ingested,
        gb_delivered:  initial.gb_delivered,
        gb_stored:     initial.gb_stored,
      } : EMPTY_CDN)
    }
  }, [open, initial])

  const set = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ ...form, id: initial?.id })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const isValid = form.date && form.label && form.channel_id && form.channel_name &&
    form.gb_ingested !== '' && form.gb_delivered !== '' && form.gb_stored !== ''

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: TP.paper, border: `1px solid ${TP.border}` } }}>
      <DialogTitle sx={{ borderBottom: `1px solid ${TP.border}`, py: 1.5, px: 2, fontSize: '0.95rem', fontWeight: 700 }}>
        {initial ? 'Edit CDN Record' : 'Add CDN Record'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2, pb: 1, display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Date" type="date" value={form.date} onChange={set('date')}
            size="small" fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Label" value={form.label} onChange={set('label')} size="small" fullWidth
            placeholder="KWC 2026 Day 3" />
        </Box>
        <TextField label="Tournament (optional)" select value={form.tournament_id} onChange={set('tournament_id')}
          size="small" fullWidth>
          <MenuItem value="">— None —</MenuItem>
          {tournaments.map(t => (
            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Channel ID" value={form.channel_id} onChange={set('channel_id')}
            size="small" fullWidth placeholder="die1qpMr" />
          <TextField label="Channel Name" value={form.channel_name} onChange={set('channel_name')}
            size="small" fullWidth placeholder="Main Deck" />
        </Box>
        <Divider />
        <Typography variant="caption" sx={{ color: TP.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          CDN Usage (GB)
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Ingested" type="number" value={form.gb_ingested} onChange={set('gb_ingested')}
            size="small" fullWidth inputProps={{ step: '0.001', min: 0 }} />
          <TextField label="Delivered" type="number" value={form.gb_delivered} onChange={set('gb_delivered')}
            size="small" fullWidth inputProps={{ step: '0.001', min: 0 }} />
          <TextField label="Stored" type="number" value={form.gb_stored} onChange={set('gb_stored')}
            size="small" fullWidth inputProps={{ step: '0.001', min: 0 }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} size="small" sx={{ color: TP.muted }}>Cancel</Button>
        <Button
          variant="contained" size="small" startIcon={<SaveIcon />}
          onClick={handleSave} disabled={!isValid || saving}
          sx={{ bgcolor: TP.accent, '&:hover': { bgcolor: TP.accentHov } }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ records, pricing, tournaments }) {
  const grandTotal    = records.reduce((s, r) => s + (r.cost_total  || 0), 0)
  const totalDelivered = records.reduce((s, r) => s + (r.gb_delivered || 0), 0)
  const totalIngested  = records.reduce((s, r) => s + (r.gb_ingested  || 0), 0)
  const totalStored    = records.reduce((s, r) => s + (r.gb_stored    || 0), 0)

  // Per-tournament rollup
  const byTournament = tournaments.map(t => {
    const tRecs = records.filter(r => Number(r.tournament_id) === t.id)
    return {
      ...t,
      feeds:        tRecs.length,
      gb_delivered: tRecs.reduce((s, r) => s + (r.gb_delivered || 0), 0),
      gb_ingested:  tRecs.reduce((s, r) => s + (r.gb_ingested  || 0), 0),
      gb_stored:    tRecs.reduce((s, r) => s + (r.gb_stored    || 0), 0),
      cost_total:   tRecs.reduce((s, r) => s + (r.cost_total   || 0), 0),
    }
  }).filter(t => t.feeds > 0)

  // Unattributed records (no tournament_id)
  const unattributed = records.filter(r => !r.tournament_id)
  if (unattributed.length > 0) {
    byTournament.push({
      id: null, name: 'Unattributed', location: '—',
      feeds:        unattributed.length,
      gb_delivered: unattributed.reduce((s, r) => s + (r.gb_delivered || 0), 0),
      gb_ingested:  unattributed.reduce((s, r) => s + (r.gb_ingested  || 0), 0),
      gb_stored:    unattributed.reduce((s, r) => s + (r.gb_stored    || 0), 0),
      cost_total:   unattributed.reduce((s, r) => s + (r.cost_total   || 0), 0),
    })
  }

  // Monthly rollup
  const monthMap = {}
  records.forEach(r => {
    const mk = monthKey(r.date)
    if (!monthMap[mk]) monthMap[mk] = { feeds: 0, gb_delivered: 0, cost_total: 0 }
    monthMap[mk].feeds++
    monthMap[mk].gb_delivered += r.gb_delivered || 0
    monthMap[mk].cost_total   += r.cost_total   || 0
  })
  const months = Object.entries(monthMap).sort(([a], [b]) => b.localeCompare(a))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Stat cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard label="Total CDN Cost"      value={fmtUSD(grandTotal)}    sub={`${records.length} feed records`} />
        <StatCard label="Total Delivered"     value={fmtGB(totalDelivered)} sub="playout / egress" />
        <StatCard label="Total Ingested"      value={fmtGB(totalIngested)}  sub="encoding input" />
        <StatCard label="Total Stored"        value={fmtGB(totalStored)}    sub="VOD storage" />
      </Box>

      {/* Per-tournament */}
      {byTournament.length > 0 && (
        <Paper elevation={0}>
          <SectionHeader icon={<BarChartIcon />} title="BY TOURNAMENT" />
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Tournament', 'Feeds', 'GB Delivered', 'GB Ingested', 'GB Stored', 'Total Cost'].map(h => (
                    <TableCell key={h} sx={{ color: TP.muted, fontSize: '0.7rem', fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {byTournament.map(t => (
                  <TableRow key={t.id ?? 'unattr'} hover>
                    <TableCell sx={{ fontSize: '0.8rem' }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{t.name}</Typography>
                      {t.location !== '—' && (
                        <Typography sx={{ fontSize: '0.68rem', color: TP.muted }}>{t.location}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{t.feeds}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{fmtGB(t.gb_delivered)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{fmtGB(t.gb_ingested)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{fmtGB(t.gb_stored)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700, color: TP.accent }}>{fmtUSD(t.cost_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Monthly rollup */}
      {months.length > 0 && (
        <Paper elevation={0}>
          <SectionHeader icon={<BarChartIcon />} title="MONTHLY ROLLUP" />
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Month', 'Feeds', 'GB Delivered', 'Total Cost'].map(h => (
                    <TableCell key={h} sx={{ color: TP.muted, fontSize: '0.7rem', fontWeight: 600 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {months.map(([mk, m]) => (
                  <TableRow key={mk} hover>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{monthLabel(mk)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{m.feeds}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{fmtGB(m.gb_delivered)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700, color: TP.accent }}>{fmtUSD(m.cost_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {records.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CloudIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.1)', mb: 1 }} />
          <Typography sx={{ color: TP.muted }}>No CDN records yet.</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(148,163,184,0.5)' }}>
            Add records in the CDN Records tab after pulling reports from JW.
          </Typography>
        </Box>
      )}
    </Box>
  )
}

// ─── CDN Records tab ──────────────────────────────────────────────────────────

function CdnRecordsTab({ records, tournaments, token, onRefresh, showSnack }) {
  const [dialog, setDialog]   = useState({ open: false, initial: null })
  const [monthFilter, setMonthFilter] = useState('all')
  const [deleting, setDeleting] = useState(null)

  // Build month options from existing records
  const months = [...new Set(records.map(r => monthKey(r.date)).filter(Boolean))].sort().reverse()

  const filtered = monthFilter === 'all'
    ? records
    : records.filter(r => monthKey(r.date) === monthFilter)

  async function handleSave(form) {
    const isEdit = !!form.id
    const url    = '/api/cdn-records'
    const method = isEdit ? 'PUT' : 'POST'
    const body   = {
      ...form,
      tournament_id: form.tournament_id !== '' ? Number(form.tournament_id) : null,
    }
    const res = await fetch(url, { method, headers: tdAuthHeader(token), body: JSON.stringify(body) })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || 'Save failed')
    }
    showSnack(isEdit ? 'Record updated' : 'Record added')
    onRefresh()
  }

  async function handleDelete(id) {
    setDeleting(id)
    try {
      const res = await fetch('/api/cdn-records', {
        method: 'DELETE',
        headers: tdAuthHeader(token),
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Delete failed')
      showSnack('Record deleted', 'info')
      onRefresh()
    } catch (err) {
      showSnack(err.message, 'error')
    } finally {
      setDeleting(null)
    }
  }

  const subtotal = filtered.reduce((s, r) => s + (r.cost_total || 0), 0)

  return (
    <>
      <Paper elevation={0}>
        <SectionHeader
          icon={<CloudIcon />}
          title="CDN RECORDS"
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                select size="small" value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                sx={{ minWidth: 160, '& .MuiInputBase-root': { fontSize: '0.75rem', height: 30 } }}
              >
                <MenuItem value="all">All months</MenuItem>
                {months.map(mk => (
                  <MenuItem key={mk} value={mk}>{monthLabel(mk)}</MenuItem>
                ))}
              </TextField>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={onRefresh} sx={{ color: TP.muted }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Button
                size="small" variant="outlined" startIcon={<AddIcon />}
                onClick={() => setDialog({ open: true, initial: null })}
                sx={{ fontSize: '0.72rem', borderColor: TP.accentBdr, color: TP.accent, '&:hover': { borderColor: TP.accent } }}
              >
                Add Record
              </Button>
            </Box>
          }
        />

        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" sx={{ color: TP.muted }}>No records for this period.</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Date', 'Label', 'Channel', 'GB Ing.', 'GB Del.', 'GB Stor.', 'Cost', ''].map(h => (
                    <TableCell key={h} sx={{ color: TP.muted, fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{r.label}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{r.channel_name}</Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: TP.muted, fontFamily: 'monospace' }}>{r.channel_id}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{fmtGB(r.gb_ingested)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{fmtGB(r.gb_delivered)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{fmtGB(r.gb_stored)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: TP.accent }}>{fmtUSD(r.cost_total)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => setDialog({ open: true, initial: r })} sx={{ color: TP.muted, '&:hover': { color: TP.accent } }}>
                            <EditIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" disabled={deleting === r.id}
                            onClick={() => handleDelete(r.id)}
                            sx={{ color: TP.muted, '&:hover': { color: TP.danger } }}>
                            {deleting === r.id
                              ? <CircularProgress size={13} />
                              : <DeleteIcon sx={{ fontSize: 15 }} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Subtotal row */}
                <TableRow sx={{ bgcolor: TP.accentDim }}>
                  <TableCell colSpan={6} sx={{ fontSize: '0.75rem', fontWeight: 700, color: TP.muted }}>
                    {monthFilter === 'all' ? 'Grand Total' : `${monthLabel(monthFilter)} Total`}
                    {' '}({filtered.length} records)
                  </TableCell>
                  <TableCell colSpan={2} sx={{ fontSize: '0.85rem', fontWeight: 800, color: TP.accent }}>
                    {fmtUSD(subtotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <CdnRecordDialog
        open={dialog.open}
        initial={dialog.initial}
        tournaments={tournaments}
        onClose={() => setDialog({ open: false, initial: null })}
        onSave={handleSave}
      />
    </>
  )
}

// ─── Pricing tab ──────────────────────────────────────────────────────────────

function PricingTab({ pricing, token, onRefresh, showSnack }) {
  const [rates, setRates]   = useState({ ingestion_per_gb: '', storage_per_gb: '', playout_per_gb: '' })
  const [overrides, setOverrides] = useState({})
  const [savingRates, setSavingRates]   = useState(false)
  const [newOverride, setNewOverride] = useState({ channel_id: '', name: '', ingestion_per_gb: '', storage_per_gb: '', playout_per_gb: '' })

  useEffect(() => {
    if (pricing) {
      setRates({
        ingestion_per_gb: pricing.ingestion_per_gb ?? '',
        storage_per_gb:   pricing.storage_per_gb   ?? '',
        playout_per_gb:   pricing.playout_per_gb   ?? '',
      })
      setOverrides(pricing.channel_overrides || {})
    }
  }, [pricing])

  async function saveRates() {
    setSavingRates(true)
    try {
      const res = await fetch('/api/pricing', {
        method: 'PUT',
        headers: tdAuthHeader(token),
        body: JSON.stringify({
          ingestion_per_gb: Number(rates.ingestion_per_gb),
          storage_per_gb:   Number(rates.storage_per_gb),
          playout_per_gb:   Number(rates.playout_per_gb),
          channel_overrides: overrides,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      showSnack('Pricing saved')
      onRefresh()
    } catch (err) {
      showSnack(err.message, 'error')
    } finally {
      setSavingRates(false)
    }
  }

  function addOverride() {
    if (!newOverride.channel_id) return
    const entry = {}
    if (newOverride.name)             entry.name             = newOverride.name
    if (newOverride.ingestion_per_gb) entry.ingestion_per_gb = Number(newOverride.ingestion_per_gb)
    if (newOverride.storage_per_gb)   entry.storage_per_gb   = Number(newOverride.storage_per_gb)
    if (newOverride.playout_per_gb)   entry.playout_per_gb   = Number(newOverride.playout_per_gb)
    setOverrides(o => ({ ...o, [newOverride.channel_id]: entry }))
    setNewOverride({ channel_id: '', name: '', ingestion_per_gb: '', storage_per_gb: '', playout_per_gb: '' })
  }

  function removeOverride(cid) {
    setOverrides(o => { const n = { ...o }; delete n[cid]; return n })
  }

  const rateField = (label, field) => (
    <TextField
      label={label}
      type="number"
      value={rates[field]}
      onChange={e => setRates(r => ({ ...r, [field]: e.target.value }))}
      size="small"
      inputProps={{ step: '0.001', min: 0 }}
      InputProps={{ startAdornment: <Typography sx={{ color: TP.muted, mr: 0.5, fontSize: '0.85rem' }}>$</Typography> }}
      helperText="per GB"
      sx={{ flex: 1 }}
    />
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* Global rates */}
      <Paper elevation={0}>
        <SectionHeader icon={<AttachMoneyIcon />} title="GLOBAL RATES" />
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {rateField('Ingestion',  'ingestion_per_gb')}
            {rateField('Storage',    'storage_per_gb')}
            {rateField('Playout',    'playout_per_gb')}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained" size="small" startIcon={<SaveIcon />}
              onClick={saveRates} disabled={savingRates}
              sx={{ bgcolor: TP.accent, '&:hover': { bgcolor: TP.accentHov } }}
            >
              {savingRates ? 'Saving…' : 'Save Rates'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Per-channel overrides */}
      <Paper elevation={0}>
        <SectionHeader icon={<TuneIcon />} title="PER-CHANNEL OVERRIDES" />
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="caption" sx={{ color: TP.muted }}>
            Override global rates for specific JW channel IDs. Leave a rate blank to inherit the global value.
          </Typography>

          {Object.keys(overrides).length > 0 && (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Channel ID', 'Name', 'Ingestion', 'Storage', 'Playout', ''].map(h => (
                      <TableCell key={h} sx={{ color: TP.muted, fontSize: '0.7rem', fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(overrides).map(([cid, ov]) => (
                    <TableRow key={cid} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{cid}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{ov.name || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{ov.ingestion_per_gb != null ? `$${ov.ingestion_per_gb}/GB` : '(global)'}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{ov.storage_per_gb   != null ? `$${ov.storage_per_gb}/GB`   : '(global)'}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{ov.playout_per_gb   != null ? `$${ov.playout_per_gb}/GB`   : '(global)'}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => removeOverride(cid)} sx={{ color: TP.muted, '&:hover': { color: TP.danger } }}>
                          <DeleteIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Add override row */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField label="Channel ID" value={newOverride.channel_id}
              onChange={e => setNewOverride(o => ({ ...o, channel_id: e.target.value }))}
              size="small" sx={{ width: 120 }} placeholder="die1qpMr" />
            <TextField label="Name" value={newOverride.name}
              onChange={e => setNewOverride(o => ({ ...o, name: e.target.value }))}
              size="small" sx={{ width: 120 }} placeholder="Main Deck" />
            <TextField label="Ingestion $/GB" type="number" value={newOverride.ingestion_per_gb}
              onChange={e => setNewOverride(o => ({ ...o, ingestion_per_gb: e.target.value }))}
              size="small" sx={{ width: 120 }} inputProps={{ step: '0.001' }} />
            <TextField label="Storage $/GB" type="number" value={newOverride.storage_per_gb}
              onChange={e => setNewOverride(o => ({ ...o, storage_per_gb: e.target.value }))}
              size="small" sx={{ width: 120 }} inputProps={{ step: '0.001' }} />
            <TextField label="Playout $/GB" type="number" value={newOverride.playout_per_gb}
              onChange={e => setNewOverride(o => ({ ...o, playout_per_gb: e.target.value }))}
              size="small" sx={{ width: 120 }} inputProps={{ step: '0.001' }} />
            <Button
              variant="outlined" size="small" startIcon={<AddIcon />}
              onClick={addOverride} disabled={!newOverride.channel_id}
              sx={{ borderColor: TP.accentBdr, color: TP.accent, '&:hover': { borderColor: TP.accent } }}
            >
              Add
            </Button>
          </Box>

          {Object.keys(overrides).length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained" size="small" startIcon={<SaveIcon />}
                onClick={saveRates} disabled={savingRates}
                sx={{ bgcolor: TP.accent, '&:hover': { bgcolor: TP.accentHov } }}
              >
                {savingRates ? 'Saving…' : 'Save Overrides'}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function TdDashboard({ token, onLogout }) {
  const [activeTab,    setActiveTab]    = useState('overview')
  const [cdnRecords,   setCdnRecords]   = useState([])
  const [pricing,      setPricing]      = useState(null)
  const [tournaments,  setTournaments]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [snack,        setSnack]        = useState({ open: false, message: '', severity: 'success' })

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cRes, pRes, tRes] = await Promise.all([
        fetch('/api/cdn-records'),
        fetch('/api/pricing'),
        fetch('/api/tournaments'),
      ])
      if (cRes.ok) setCdnRecords(await cRes.json())
      if (pRes.ok) setPricing(await pRes.json())
      if (tRes.ok) setTournaments(await tRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}
        sx={{ bgcolor: TP.paper, borderBottom: `2px solid ${TP.accent}` }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <BuildIcon sx={{ color: TP.accent, fontSize: 22 }} />
          <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.08em', fontSize: '1.1rem', flexGrow: 1 }}>
            TD ADMIN
          </Typography>
          <Chip label="TRILOGY DIGITAL" size="small"
            sx={{ bgcolor: TP.accentDim, color: TP.accent, border: `1px solid ${TP.accentBdr}`, fontSize: '0.65rem', letterSpacing: '0.08em' }} />
          <Tooltip title="Logout">
            <IconButton size="small" onClick={onLogout} sx={{ color: TP.muted, '&:hover': { color: '#fff' } }}>
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Tabs */}
      <Box sx={{ bgcolor: TP.paper, borderBottom: `1px solid ${TP.border}` }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 } }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: TP.accent, height: 3 } }}
            sx={{
              minHeight: 44,
              '& .MuiTab-root': { minHeight: 44, color: TP.muted },
              '& .Mui-selected': { color: TP.accent },
            }}
          >
            <Tab value="overview" label="Overview"    icon={<BarChartIcon sx={{ fontSize: 15 }} />} iconPosition="start" />
            <Tab value="records"  label="CDN Records" icon={<CloudIcon     sx={{ fontSize: 15 }} />} iconPosition="start" />
            <Tab value="pricing"  label="Pricing"     icon={<TuneIcon      sx={{ fontSize: 15 }} />} iconPosition="start" />
          </Tabs>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: TP.accent }} />
          </Box>
        ) : activeTab === 'overview' ? (
          <OverviewTab records={cdnRecords} pricing={pricing} tournaments={tournaments} />
        ) : activeTab === 'records' ? (
          <CdnRecordsTab
            records={cdnRecords}
            tournaments={tournaments}
            token={token}
            onRefresh={fetchAll}
            showSnack={showSnack}
          />
        ) : (
          <PricingTab
            pricing={pricing}
            token={token}
            onRefresh={fetchAll}
            showSnack={showSnack}
          />
        )}
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function TdLoginScreen({ onLogin }) {
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/td-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      onLogin(data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: TP.bg, backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.08) 0%, transparent 60%)',
    }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 360, p: 4, border: `1px solid ${TP.border}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <BuildIcon sx={{ color: TP.accent, fontSize: 28 }} />
          <Box>
            <Typography sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.08em', fontSize: '1.2rem', lineHeight: 1 }}>
              TD ADMIN
            </Typography>
            <Typography variant="caption" sx={{ color: TP.muted, fontSize: '0.65rem' }}>
              TRILOGY DIGITAL · INTERNAL USE ONLY
            </Typography>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>{error}</Alert>}

        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
            size="small"
            autoFocus
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={!password || loading}
            sx={{ bgcolor: TP.accent, '&:hover': { bgcolor: TP.accentHov }, fontWeight: 700 }}
          >
            {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const TD_SESSION_KEY = 'ri_td_admin_token'

export default function TdAdmin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TD_SESSION_KEY) || '')

  function handleLogin(t) {
    sessionStorage.setItem(TD_SESSION_KEY, t)
    setToken(t)
  }

  function handleLogout() {
    sessionStorage.removeItem(TD_SESSION_KEY)
    setToken('')
  }

  return (
    <ThemeProvider theme={tdTheme}>
      <CssBaseline />
      {token ? (
        <TdDashboard token={token} onLogout={handleLogout} />
      ) : (
        <TdLoginScreen onLogin={handleLogin} />
      )}
    </ThemeProvider>
  )
}
