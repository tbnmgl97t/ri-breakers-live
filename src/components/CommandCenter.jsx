import React, { useState } from 'react'
import { Box, Paper, Tabs, Tab, Typography, IconButton, Tooltip } from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RadarIcon from '@mui/icons-material/Radar'
import MapIcon from '@mui/icons-material/Map'
import SurroundSoundIcon from '@mui/icons-material/SurroundSound'

const TABS = [
  {
    label: 'Cruising',
    icon: <RadarIcon sx={{ fontSize: 16 }} />,
    url: 'https://sfc-command-demo.seawardautomation.com/cruising',
    description: 'Live vessel speed & heading data',
  },
  {
    label: 'Omni-Sonar',
    icon: <SurroundSoundIcon sx={{ fontSize: 16 }} />,
    url: 'https://sfc-command-demo.seawardautomation.com/omni-sonar',
    description: '360° sonar fish detection',
  },
  {
    label: 'Chart',
    icon: <MapIcon sx={{ fontSize: 16 }} />,
    url: 'https://sfc-command-demo.seawardautomation.com/chart',
    description: 'Live position chart',
  },
]

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          pb: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(90deg, rgba(230,93,44,0.08) 0%, transparent 60%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RadarIcon sx={{ color: '#e65d2c', fontSize: 18 }} />
            <Typography
              variant="h6"
              sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}
            >
              COMMAND CENTER
            </Typography>
          </Box>
          <Tooltip title="Open in new tab">
            <IconButton
              size="small"
              href={TABS[activeTab].url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: '#a8bcd4', '&:hover': { color: '#e65d2c' } }}
            >
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: '#e65d2c', height: 3 } }}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': { minHeight: 36, py: 0.5, color: '#a8bcd4' },
            '& .Mui-selected': { color: '#e65d2c' },
          }}
        >
          {TABS.map((tab, i) => (
            <Tab
              key={i}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{ gap: 0.5, minHeight: 36 }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Description */}
      <Box sx={{ px: 2, py: 0.75, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Typography variant="caption" sx={{ color: '#a8bcd4', fontSize: '0.7rem' }}>
          {TABS[activeTab].description}
        </Typography>
      </Box>

      {/* iFrame */}
      <Box sx={{ width: '100%', height: 720, position: 'relative' }}>
        {TABS.map((tab, i) => (
          <Box
            key={i}
            component="iframe"
            src={tab.url}
            title={tab.label}
            allow="fullscreen"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              display: activeTab === i ? 'block' : 'none',
              bgcolor: '#000',
            }}
          />
        ))}
      </Box>
    </Paper>
  )
}
