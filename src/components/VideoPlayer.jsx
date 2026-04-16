import React, { useEffect, useRef, useCallback } from 'react'
import { Box, Paper, Typography } from '@mui/material'

const JW_PLAYER_LIB = 'https://cdn.jwplayer.com/libraries/xJKVL03e.js'

const CAMERAS = [
  'https://cdn.jwplayer.com/live/broadcast/ycdpLdyf.m3u8',
  'https://cdn.jwplayer.com/live/broadcast/L0ak6C6G.m3u8',
]

function loadJWPlayerScript() {
  return new Promise((resolve, reject) => {
    if (window.jwplayer) {
      resolve(window.jwplayer)
      return
    }
    const existing = document.querySelector(`script[src="${JW_PLAYER_LIB}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.jwplayer))
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.src = JW_PLAYER_LIB
    script.async = true
    script.onload = () => resolve(window.jwplayer)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function VideoPlayer({ cameraIndex = 0 }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const playerDivId = 'jw-player-main'

  const initPlayer = useCallback(async () => {
    try {
      await loadJWPlayerScript()
      if (!containerRef.current || !window.jwplayer) return

      // Destroy previous instance if it exists
      if (playerRef.current) {
        try { playerRef.current.remove() } catch (_) {}
      }

      playerRef.current = window.jwplayer(playerDivId).setup({
        file: CAMERAS[cameraIndex] ?? CAMERAS[0],
        width: '100%',
        aspectratio: '16:9',
      })
    } catch (err) {
      console.error('JW Player failed to load:', err)
    }
  }, [cameraIndex])

  useEffect(() => {
    initPlayer()
    return () => {
      if (playerRef.current) {
        try { playerRef.current.remove() } catch (_) {}
        playerRef.current = null
      }
    }
  }, [initPlayer, cameraIndex])

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        bgcolor: '#000',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(230,93,44,0.3)',
        boxShadow: '0 0 30px rgba(230,93,44,0.1)',
        position: 'relative',
      }}
    >
      {/* Camera label overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          bgcolor: 'rgba(6,14,36,0.8)',
          border: '1px solid rgba(230,93,44,0.5)',
          borderRadius: 1,
          px: 1,
          py: 0.25,
          pointerEvents: 'none',
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: '#e65d2c', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.65rem' }}
        >
          CAM {cameraIndex + 1}
        </Typography>
      </Box>

      <div id={playerDivId} ref={containerRef} style={{ width: '100%' }} />
    </Paper>
  )
}
