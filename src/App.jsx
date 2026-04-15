import React, { useState } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, Container, Grid, Typography } from '@mui/material'
import theme from './theme/theme'
import Header from './components/Header'
import VideoPlayer from './components/VideoPlayer'
import CameraSelector from './components/CameraSelector'
import CommandCenter from './components/CommandCenter'
import EventSchedule from './components/EventSchedule'

export default function App() {
  const [selectedCamera, setSelectedCamera] = useState(0)

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
          </Box>

          <Grid container spacing={{ xs: 2, md: 3 }}>
            {/* Video + Camera */}
            <Grid item xs={12} lg={8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <VideoPlayer cameraIndex={selectedCamera} />
                <CameraSelector selected={selectedCamera} onChange={setSelectedCamera} />
              </Box>
            </Grid>

            {/* Event Schedule */}
            <Grid item xs={12} lg={4}>
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
    </ThemeProvider>
  )
}
