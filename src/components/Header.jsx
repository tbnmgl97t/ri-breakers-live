import React from 'react'
import { AppBar, Toolbar, Box, Typography, Chip } from '@mui/material'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

export default function Header({ live = false }) {
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
            component="img"
            src="https://ribreakersac.com/cdn/shop/files/RI-Breakers-Logo-WHITE.png?v=1774997726&width=200"
            alt="Rhode Island Breakers"
            sx={{
              width: { xs: 44, sm: 54 },
              height: { xs: 44, sm: 54 },
              objectFit: 'contain',
              flexShrink: 0,
              filter: 'drop-shadow(0 0 6px rgba(230,93,44,0.35))',
            }}
          />
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
              KEY WEST CLASSIC
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#a8bcd4', fontSize: { xs: '0.6rem', sm: '0.7rem' }, letterSpacing: '0.08em' }}
            >
              RHODE ISLAND BREAKERS
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
                ...(live && {
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                  },
                }),
              }}
            />
          }
          label={live ? 'LIVE' : 'OFFLINE'}
          size="small"
          sx={{
            background: live ? '#e65d2c' : 'rgba(168,188,212,0.2)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            height: 26,
            fontFamily: "'Poppins', sans-serif",
            border: live ? 'none' : '1px solid rgba(168,188,212,0.3)',
          }}
        />
      </Toolbar>
    </AppBar>
  )
}
