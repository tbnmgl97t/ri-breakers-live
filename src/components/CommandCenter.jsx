import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Paper, Tabs, Tab, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { ShipWheel, Map, BellRing, Radar } from 'lucide-react'

const API_BASE = 'https://api.seawardautomation.com'
const API_KEY = import.meta.env.VITE_SEAWARD_API_KEY

const TABS = [
  {
    label: 'Cruising',
    icon: <ShipWheel size={16} />,
    url: `${API_BASE}/cruising`,
    description: 'Live vessel speed & heading data',
  },
  {
    label: 'Chart',
    icon: <Map size={16} />,
    url: `${API_BASE}/chart`,
    description: 'Live position chart',
  },
  {
    label: 'Omni-Sonar',
    icon: <Radar size={16} />,
    url: `${API_BASE}/omni-sonar`,
    description: '360° sonar fish detection',
  },
  {
    label: 'Alarms',
    icon: <BellRing size={16} />,
    url: `${API_BASE}/alarms`,
    description: 'Live vessel alarms & alerts',
  },
]

// Re-auth 5 minutes before the session expires
const REAUTH_BUFFER_MS = 5 * 60 * 1000

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState(0)
  const [authStatus, setAuthStatus] = useState('idle') // 'idle' | 'loading' | 'authed' | 'error'
  const [iframeKey, setIframeKey] = useState(0) // bump to force iframe reload after re-auth
  const reauthTimerRef = useRef(null)

  const authenticate = useCallback(async () => {
    setAuthStatus('loading')
    try {
      const res = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_KEY }),
      })

      if (!res.ok) throw new Error(`Auth failed: ${res.status}`)

      const data = await res.json()
      setAuthStatus('authed')

      // Schedule silent re-auth before the session expires
      if (data.expiresAt) {
        const msUntilReauth = new Date(data.expiresAt) - Date.now() - REAUTH_BUFFER_MS
        if (reauthTimerRef.current) clearTimeout(reauthTimerRef.current)
        reauthTimerRef.current = setTimeout(() => {
          silentReauth()
        }, Math.max(msUntilReauth, 0))
      }
    } catch (err) {
      console.error('[CommandCenter] Auth error:', err)
      setAuthStatus('error')
    }
  }, [])

  // Silent re-auth: refresh the cookie without showing a loading state,
  // then bump the iframe key so the frames reload with the fresh session.
  const silentReauth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: API_KEY }),
      })
      if (!res.ok) throw new Error(`Silent re-auth failed: ${res.status}`)

      const data = await res.json()
      setIframeKey(k => k + 1)

      if (data.expiresAt) {
        const msUntilReauth = new Date(data.expiresAt) - Date.now() - REAUTH_BUFFER_MS
        if (reauthTimerRef.current) clearTimeout(reauthTimerRef.current)
        reauthTimerRef.current = setTimeout(() => {
          silentReauth()
        }, Math.max(msUntilReauth, 0))
      }
    } catch (err) {
      console.error('[CommandCenter] Silent re-auth error:', err)
      setAuthStatus('error')
    }
  }, [])

  // Authenticate on mount
  useEffect(() => {
    authenticate()
    return () => {
      if (reauthTimerRef.current) clearTimeout(reauthTimerRef.current)
    }
  }, [authenticate])

  // Re-auth when the tab becomes visible again (handles 30-min idle expiry)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && authStatus === 'authed') {
        silentReauth()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [authStatus, silentReauth])

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
            <ShipWheel size={18} color="#e65d2c" />
            <Typography
              variant="h6"
              sx={{ fontFamily: "'Bayon', sans-serif", letterSpacing: '0.06em', fontSize: '1rem' }}
            >
              COMMAND CENTER
            </Typography>
            {/* Auth status indicator */}
            {authStatus === 'loading' && (
              <CircularProgress size={12} sx={{ color: '#a8bcd4', ml: 0.5 }} />
            )}
            {authStatus === 'authed' && (
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4caf50', ml: 0.5, boxShadow: '0 0 6px #4caf50' }} />
            )}
            {authStatus === 'error' && (
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#f44336', ml: 0.5 }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {authStatus === 'error' && (
              <Tooltip title="Retry connection">
                <IconButton size="small" onClick={authenticate} sx={{ color: '#f44336', '&:hover': { color: '#e65d2c' } }}>
                  <RefreshIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          textColor="inherit"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          TabIndicatorProps={{ style: { backgroundColor: '#e65d2c', height: 3 } }}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': { minHeight: 36, py: 0.5, color: '#a8bcd4' },
            '& .Mui-selected': { color: '#e65d2c' },
            '& .MuiTabScrollButton-root': { color: '#a8bcd4' },
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

      {/* Content */}
      <Box sx={{ width: '100%', height: { xs: 1900, sm: '110vw', md: '70vw', lg: 920 }, minHeight: { xs: 1900, sm: 720, md: 800 }, position: 'relative', overflow: 'hidden' }}>

        {/* Loading overlay */}
        {authStatus === 'loading' && (
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'background.paper', gap: 2,
          }}>
            <CircularProgress size={32} sx={{ color: '#e65d2c' }} />
            <Typography variant="caption" sx={{ color: '#a8bcd4', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
              CONNECTING TO COMMAND CENTER…
            </Typography>
          </Box>
        )}

        {/* Error overlay */}
        {authStatus === 'error' && (
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'background.paper', gap: 1.5,
          }}>
            <RadarIcon sx={{ color: 'rgba(168,188,212,0.3)', fontSize: 40 }} />
            <Typography variant="body2" sx={{ color: '#a8bcd4', fontWeight: 600 }}>
              Unable to connect
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(168,188,212,0.5)', fontSize: '0.7rem', textAlign: 'center', maxWidth: 280 }}>
              Could not authenticate with the Command Center. Check your connection and try again.
            </Typography>
          </Box>
        )}

        {/* Iframes — only rendered once authed */}
        {authStatus === 'authed' && TABS.map((tab, i) => (
          <Box
            key={`${i}-${iframeKey}`}
            component="iframe"
            src={tab.url}
            title={tab.label}
            allow="fullscreen; clipboard-read; clipboard-write"
            scrolling="no"
            referrerPolicy="strict-origin-when-cross-origin"
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
