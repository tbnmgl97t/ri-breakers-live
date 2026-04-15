import React, { useState, useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import {
  Box, Container, Grid, Typography,
  Button, Dialog, DialogContent, DialogTitle,
  IconButton, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CloseIcon from '@mui/icons-material/Close'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import theme from './theme/theme'
import Header from './components/Header'
import VideoPlayer from './components/VideoPlayer'
import CameraSelector from './components/CameraSelector'
import CommandCenter from './components/CommandCenter'
import EventSchedule from './components/EventSchedule'
import PreShowScreen, { isAnyEventLive } from './components/PreShowScreen'

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

export default function App() {
  const [selectedCamera, setSelectedCamera] = useState(0)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [simulateLive, setSimulateLive] = useState(false)
  const [now, setNow] = useState(new Date())
  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('lg'))
  const live = simulateLive || isAnyEventLive(now)

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
        <Header />

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
              SPORT FISHING CHAMPIONSHIP 2026
            </Typography>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(168,188,212,0.5)', display: { xs: 'none', sm: 'block' } }} />
            <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.65rem' }}>
              Apr 16–19 &nbsp;·&nbsp; Watch Rhode Island Breakers compete live
            </Typography>

            {/* Simulate Live toggle — dev preview */}
            <Button
              size="small"
              variant={simulateLive ? 'contained' : 'outlined'}
              startIcon={
                simulateLive
                  ? <StopCircleOutlinedIcon sx={{ fontSize: '14px !important' }} />
                  : <PlayCircleOutlineIcon sx={{ fontSize: '14px !important' }} />
              }
              onClick={() => setSimulateLive(v => !v)}
              sx={{
                ml: isMobile ? 'auto' : 'auto',
                py: 0.25,
                px: 1.25,
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                ...(simulateLive
                  ? {
                      bgcolor: '#e65d2c',
                      color: '#fff',
                      borderColor: '#e65d2c',
                      '&:hover': { bgcolor: '#c94e24' },
                    }
                  : {
                      color: 'rgba(168,188,212,0.7)',
                      borderColor: 'rgba(168,188,212,0.25)',
                      '&:hover': { borderColor: 'rgba(168,188,212,0.5)', bgcolor: 'rgba(168,188,212,0.05)' },
                    }),
              }}
            >
              {simulateLive ? 'STOP PREVIEW' : 'SIMULATE LIVE'}
            </Button>

            {/* Mobile schedule button — in banner on mobile */}
            {isMobile && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<CalendarTodayIcon sx={{ fontSize: '14px !important' }} />}
                onClick={() => setScheduleOpen(true)}
                sx={{
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
                    <VideoPlayer cameraIndex={selectedCamera} />
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
              © 2026 Rhode Island Breakers · Sport Fishing Championship
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
