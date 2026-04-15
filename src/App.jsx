import React, { useState } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, Typography } from '@mui/material'
import theme from './theme/theme'
import Header from './components/Header'
import VideoPlayer from './components/VideoPlayer'
import CameraSelector from './components/CameraSelector'
import CommandCenter from './components/CommandCenter'
import EventSchedule from './components/EventSchedule'

const HEADER_H = 67 // px — matches AppBar minHeight

export default function App() {
  const [selectedCamera, setSelectedCamera] = useState(0)

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

        {/* ── Scrollable body ── */}
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Event banner */}
          <Box
            sx={{
              mx: { xs: 1.5, sm: 2, md: 3 },
              mt: { xs: 1.5, sm: 2 },
              px: 2,
              py: 0.75,
              borderRadius: 1.5,
              bgcolor: 'rgba(10,32,90,0.5)',
              border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <Typography variant="caption" sx={{ color: '#e65d2c', fontWeight: 700, letterSpacing: '0.1em', fontSize: '0.65rem' }}>
              SPORT FISHING CHAMPIONSHIP 2026
            </Typography>
            <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(168,188,212,0.5)', display: { xs: 'none', sm: 'block' } }} />
            <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.65rem' }}>
              Apr 16–19 &nbsp;·&nbsp; Watch Rhode Island Breakers compete live
            </Typography>
          </Box>

          {/* ── Top row: Video + Schedule ── */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 1.5, md: 2 },
              px: { xs: 1.5, sm: 2, md: 3 },
              pt: { xs: 1.5, sm: 2 },
              flex: { lg: '0 0 auto' },
              flexShrink: 0,
              flexDirection: { xs: 'column', lg: 'row' },
              // Cap top section on large screens so Command Center always has room
              maxHeight: { lg: 'calc(55vh - 40px)' },
              overflow: { lg: 'hidden' },
            }}
          >
            {/* Video column */}
            <Box sx={{ flex: { lg: '0 0 66.666%' }, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0, overflow: 'hidden' }}>
              <VideoPlayer cameraIndex={selectedCamera} />
              <CameraSelector selected={selectedCamera} onChange={setSelectedCamera} />
            </Box>

            {/* Schedule column */}
            <Box sx={{ flex: { lg: 1 } }}>
              <EventSchedule />
            </Box>
          </Box>

          {/* ── Command Center — fills all remaining height ── */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              px: { xs: 1.5, sm: 2, md: 3 },
              pt: { xs: 1.5, sm: 2 },
              pb: { xs: 1.5, sm: 2 },
              minHeight: 0,
            }}
          >
            <CommandCenter />
          </Box>

          {/* Footer */}
          <Box
            sx={{
              px: { xs: 1.5, sm: 2, md: 3 },
              pb: 1.5,
              pt: 0.5,
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
      </Box>
    </ThemeProvider>
  )
}
