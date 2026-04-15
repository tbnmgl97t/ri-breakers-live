import React, { useState } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, Typography, ButtonBase } from '@mui/material'
import VideocamIcon from '@mui/icons-material/Videocam'
import RadarIcon from '@mui/icons-material/Radar'
import theme from './theme/theme'
import Header from './components/Header'
import VideoPlayer from './components/VideoPlayer'
import CameraSelector from './components/CameraSelector'
import CommandCenter from './components/CommandCenter'
import EventSchedule from './components/EventSchedule'

const VIEWS = [
  { id: 'live',    label: 'Live Feed',       icon: <VideocamIcon sx={{ fontSize: 16 }} /> },
  { id: 'command', label: 'Command Center',  icon: <RadarIcon    sx={{ fontSize: 16 }} /> },
]

export default function App() {
  const [selectedCamera, setSelectedCamera] = useState(0)
  const [activeView, setActiveView] = useState('live')

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(10,32,90,0.6) 0%, transparent 70%)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <Header />

        {/* ── View toggle bar ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            px: { xs: 1.5, sm: 2, md: 3 },
            pt: 1,
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Event info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 'auto', flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: '#e65d2c', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.65rem' }}>
              SFC 2026
            </Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'rgba(168,188,212,0.4)' }} />
            <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.65rem' }}>
              Apr 16–19
            </Typography>
          </Box>

          {/* View tabs */}
          {VIEWS.map(v => {
            const active = activeView === v.id
            return (
              <ButtonBase
                key={v.id}
                onClick={() => setActiveView(v.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 2,
                  py: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: "'Poppins', sans-serif",
                  letterSpacing: '0.04em',
                  color: active ? '#e65d2c' : '#a8bcd4',
                  borderBottom: active ? '2px solid #e65d2c' : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                  '&:hover': { color: active ? '#e65d2c' : '#fff' },
                }}
              >
                {v.icon}
                {v.label}
              </ButtonBase>
            )
          })}
        </Box>

        {/* ── Content area — fills all remaining height ── */}
        <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>

          {/* ── LIVE FEED VIEW ── */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: activeView === 'live' ? 'flex' : 'none',
              flexDirection: 'column',
              overflow: 'auto',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flex: 1,
                gap: { xs: 1.5, md: 2 },
                px: { xs: 1.5, sm: 2, md: 3 },
                pt: { xs: 1.5, sm: 2 },
                pb: { xs: 1.5, sm: 2 },
                flexDirection: { xs: 'column', lg: 'row' },
                minHeight: 0,
              }}
            >
              {/* Video column — takes available height */}
              <Box sx={{ flex: { xs: 'none', lg: '0 0 65%' }, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <VideoPlayer cameraIndex={selectedCamera} />
                <CameraSelector selected={selectedCamera} onChange={setSelectedCamera} />
              </Box>

              {/* Schedule column */}
              <Box sx={{ flex: 1 }}>
                <EventSchedule />
              </Box>
            </Box>
          </Box>

          {/* ── COMMAND CENTER VIEW ── */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: activeView === 'command' ? 'flex' : 'none',
              flexDirection: 'column',
              px: { xs: 1.5, sm: 2, md: 3 },
              pt: { xs: 1.5, sm: 2 },
              pb: { xs: 1.5, sm: 2 },
            }}
          >
            <CommandCenter />
          </Box>

        </Box>

        {/* ── Footer ── */}
        <Box
          sx={{
            px: { xs: 1.5, sm: 2, md: 3 },
            py: 0.75,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.65rem' }}>
            © 2026 Rhode Island Breakers · Sport Fishing Championship
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.65rem' }}>
            All times Eastern (EST)
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
