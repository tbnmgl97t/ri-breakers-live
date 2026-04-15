import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import VideocamIcon from '@mui/icons-material/Videocam'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'

const cameras = [
  { label: 'Camera 1', description: 'Cockpit View' },
  { label: 'Camera 2', description: 'Outrigger View' },
]

export default function CameraSelector({ selected, onChange }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
        <VideocamIcon sx={{ color: '#a8bcd4', fontSize: 18 }} />
        <Typography variant="caption" sx={{ color: '#a8bcd4', fontWeight: 600, letterSpacing: '0.06em' }}>
          CAMERAS
        </Typography>
      </Box>

      {cameras.map((cam, i) => {
        const isActive = selected === i
        return (
          <Button
            key={i}
            variant={isActive ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onChange(i)}
            startIcon={
              <FiberManualRecordIcon
                sx={{
                  fontSize: '8px !important',
                  color: isActive ? '#fff' : '#e65d2c',
                  animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                  },
                }}
              />
            }
            sx={{
              px: 2,
              py: 0.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              bgcolor: isActive ? '#e65d2c' : 'transparent',
              borderColor: isActive ? '#e65d2c' : 'rgba(230,93,44,0.4)',
              color: isActive ? '#fff' : '#e65d2c',
              '&:hover': {
                bgcolor: isActive ? '#c94a1e' : 'rgba(230,93,44,0.1)',
                borderColor: '#e65d2c',
              },
            }}
          >
            {cam.label}
          </Button>
        )
      })}
    </Box>
  )
}
