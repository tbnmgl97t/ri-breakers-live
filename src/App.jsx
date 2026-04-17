import React, { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import {
  Box, Container, Grid, Typography,
  Button, Dialog, DialogContent, DialogTitle,
  IconButton, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CloseIcon from '@mui/icons-material/Close'
import theme from './theme/theme'
import Header from './components/Header'
import VideoPlayer from './components/VideoPlayer'
import CameraSelector from './components/CameraSelector'
import CommandCenter from './components/CommandCenter'
import EventSchedule from './components/EventSchedule'
import PreShowScreen, { isAnyEventLive, parseEventWindow, EVENTS as FALLBACK_EVENTS } from './components/PreShowScreen'
import Admin from './components/Admin'

function ScheduleModal({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 2,
          m: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(90deg, rgba(230,93,44,0.08) 0%, transparent 60%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarTodayIcon sx={{ color: '#e65d2c', fontSize: 18 }} />
          <Typography
            sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem', color: '#fff' }}
          >
            EVENT SCHEDULE
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#a8bcd4', '&:hover': { color: '#fff' } }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <EventSchedule flat />
      </DialogContent>
    </Dialog>
  )
}

// Converts DB row format to the shape PreShowScreen / EventSchedule expect
function dbRowToEvent(row) {
  return {
    date: row.date,
    label: row.label,
    start: row.start_time,
    end: row.end_time,
    tz: row.tz || 'EDT',
    camera1_url: row.camera1_url || null,
    camera2_url: row.camera2_url || null,
  }
}

function LiveFeed() {
  const [selectedCamera, setSelectedCamera] = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [now, setNow] = useState(new Date())
  const [events, setEvents] = useState(FALLBACK_EVENTS)
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'))
  const live = isAnyEventLive(now, events)

  // Fetch schedule from DB; fall back to hardcoded if unavailable
  useEffect(() => {
    fetch('/api/schedule')
      .then(r => r.ok ? r.json() : null)
      .then(rows => {
        if (rows && rows.length > 0) setEvents(rows.map(dbRowToEvent))
      })
      .catch(() => {}) // silently use fallback
  }, [])

  // Derive camera URLs from the currently live event (fall back to hardcoded)
  const FALLBACK_CAMERAS = [
    'https://cdn.jwplayer.com/live/broadcast/die1qpMr.m3u8',
    'https://cdn.jwplayer.com/live/broadcast/CpOw7syq.m3u8',
  ]
  const liveEvent = events.find(ev => {
    const { start, end } = parseEventWindow(ev)
    return now >= start && now <= end
  })
  const cameraUrls = [
    (liveEvent?.camera1_url) || FALLBACK_CAMERAS[0],
    (liveEvent?.camera2_url) || FALLBACK_CAMERAS[1],
  ]

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(10,32,90,0.6) 0%, transparent 70%)',
        }}
      >
        <Header live={live} />

        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 2, md: 3 } }}>

          {/* Event banner */}
          <Box
            sx={{
              mb: 2,
              px: 2,
              py: 1,
              borderRadius: 1.5,
              bgcolor: 'rgba(10,32,90,0.5)',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="caption" sx={{ color: '#e65d2c', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.65rem' }}>
              THE CATCH PRO-AM 2026
            </Typography>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(168,188,212,0.5)', display: { xs: 'none', sm: 'block' } }} />
            <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.65rem' }}>
              Apr 16–19 &nbsp;·&nbsp; Watch Rhode Island Breakers at The Catch Pro-Am
            </Typography>

            {/* Mobile schedule button — in banner on mobile */}
            {isMobile && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<CalendarTodayIcon sx={{ fontSize: '14px !important' }} />}
                onClick={() => setScheduleOpen(true)}
                sx={{
                  ml: 'auto',
                  py: 0.25,
                  px: 1.25,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#e65d2c',
                  borderColor: 'rgba(230,93,44,0.4)',
                  '&:hover': { borderColor: '#e65d2c', bgcolor: 'rgba(230,93,44,0.08)' },
                }}
              >
                SCHEDULE
              </Button>
            )}
          </Box>

          <Grid container spacing={{ xs: 2, md: 3 }}>
            {/* Video + Camera */}
            <Grid item xs={12} lg={8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {live ? (
                  <>
                    <VideoPlayer cameraUrl={cameraUrls[selectedCamera]} cameraIndex={selectedCamera} />
                    <CameraSelector selected={selectedCamera} onChange={setSelectedCamera} />
                  </>
                ) : (
                  <PreShowScreen />
                )}
              </Box>
            </Grid>

            {/* Event Schedule — desktop sidebar only */}
            <Grid item lg={4} sx={{ display: { xs: 'none', lg: 'block' } }}>
              <EventSchedule />
            </Grid>

            {/* Command Center — full width */}
            <Grid item xs={12}>
              <CommandCenter />
            </Grid>
          </Grid>

          {/* Footer */}
          <Box
            sx={{
              mt: 4,
              pt: 2,
              borderTop: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.65rem' }}>
              © 2026 Rhode Island Breakers · The Catch Pro-Am
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.65rem' }}>
              All times Eastern (EST)
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Mobile schedule modal */}
      <ScheduleModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<LiveFeed />} />
    </Routes>
  )
}
