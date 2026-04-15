import React from 'react'
import { AppBar, Toolbar, Box, Typography, Chip } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

export default function Header() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(90deg, #060e24 0%, #0a205a 60%, #060e24 100%)',
        borderBottom: '2px solid #e65d2c',
      }}
    >
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 56, sm: 64 } }}>
        {/* Logo / Team Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
          <Box
            sx={{
              width: { xs: 36, sm: 44 },
              height: { xs: 36, sm: 44 },
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e65d2c, #c94a1e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Bayon', sans-serif",
              fontSize: { xs: 14, sm: 16 },
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '0.05em',
              flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            RIB
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "'Bayon', sans-serif",
                letterSpacing: '0.06em',
                fontSize: { xs: '1rem', sm: '1.25rem' },
                lineHeight: 1.1,
                color: '#fff',
              }}
            >
              RHODE ISLAND BREAKERS
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#a8bcd4', fontSize: { xs: '0.6rem', sm: '0.7rem' }, letterSpacing: '0.08em' }}
            >
              SPORT FISHING CHAMPIONSHIP
            </Typography>
          </Box>
        </Box>

        {/* Live Badge */}
        <Chip
          icon={
            <FiberManualRecordIcon
              sx={{
                fontSize: '10px !important',
                color: '#fff !important',
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                },
              }}
            />
          }
          label="LIVE"
          size="small"
          sx={{
            background: '#e65d2c',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            height: 26,
            fontFamily: "'Poppins', sans-serif",
          }}
        />
      </Toolbar>
    </AppBar>
  )
}
