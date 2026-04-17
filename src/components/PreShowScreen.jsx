import React, { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'

export const EVENTS = [
  { date: '2026-04-16', label: 'Pro/Am', start: '8:00 AM', end: '3:00 PM', tz: 'EST' },
  { date: '2026-04-17', label: 'Day 1', start: '8:00 AM', end: '5:00 PM', tz: 'EST' },
  { date: '2026-04-18', label: 'Day 2', start: '8:00 AM', end: '5:00 PM', tz: 'EST' },
  { date: '2026-04-19', label: 'Day 3', start: '8:00 AM', end: '5:00 PM', tz: 'EST' },
]

export function parseEventWindow(dateStr, startTime, endTime) {
  // Build an absolute UTC timestamp using the Eastern offset for each date.
  // Apr 16-19 fall during EDT (UTC-4). Using setHours() would apply the
  // viewer's local timezone instead, causing the window to be off for anyone
  // not in Eastern time.
  const toDate = (date, time) => {
    const [h, mAP] = time.split(':')
    const [min, ap] = mAP.split(' ')
    let hours = parseInt(h)
    if (ap === 'PM' && hours !== 12) hours += 12
    if (ap === 'AM' && hours === 12) hours = 0
    const hh = String(hours).padStart(2, '0')
    const mm = String(parseInt(min)).padStart(2, '0')
    // Determine Eastern offset: EDT (UTC-4) Mar–Nov, EST (UTC-5) Nov–Mar
    const d = new Date(date)
    const month = d.getUTCMonth() + 1 // 1-12
    const easternOffset = (month >= 3 && month <= 11) ? '-04:00' : '-05:00'
    return new Date(`${date}T${hh}:${mm}:00${easternOffset}`)
  }
  return { start: toDate(dateStr, startTime), end: toDate(dateStr, endTime) }
}

export function isAnyEventLive(now) {
  return EVENTS.some(ev => {
    const { start, end } = parseEventWindow(ev.date, ev.start, ev.end)
    return now >= start && now <= end
  })
}

export function getNextEvent(now) {
  return EVENTS.find(ev => {
    const { end } = parseEventWindow(ev.date, ev.start, ev.end)
    return end > now
  })
}

function CountdownUnit({ value, label }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: { xs: 0.5, sm: 0.75 } }}>
      <Box
        sx={{
          position: 'relative',
          width: { xs: 56, sm: 72, md: 84 },
          height: { xs: 56, sm: 72, md: 84 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1.5,
          background: 'linear-gradient(145deg, rgba(10,32,90,0.9) 0%, rgba(6,14,36,0.95) 100%)',
          border: '1px solid rgba(230,93,44,0.35)',
          boxShadow: '0 0 18px rgba(230,93,44,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1,
          },
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Bayon', sans-serif",
            fontSize: { xs: '1.7rem', sm: '2.2rem', md: '2.6rem' },
            lineHeight: 1,
            color: '#fff',
            letterSpacing: '-0.02em',
            zIndex: 2,
            textShadow: '0 0 20px rgba(230,93,44,0.5)',
          }}
        >
          {String(value).padStart(2, '0')}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontSize: { xs: '0.55rem', sm: '0.62rem' },
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: 'rgba(168,188,212,0.7)',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

export default function PreShowScreen() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const nextEvent = getNextEvent(now)

  // Countdown values
  let d = 0, h = 0, m = 0, s = 0
  let eventDateStr = ''
  if (nextEvent) {
    const { start } = parseEventWindow(nextEvent.date, nextEvent.start, nextEvent.end)
    const totalSec = Math.max(0, Math.floor((start - now) / 1000))
    d = Math.floor(totalSec / 86400)
    h = Math.floor((totalSec % 86400) / 3600)
    m = Math.floor((totalSec % 3600) / 60)
    s = totalSec % 60
    const dateObj = new Date(nextEvent.date + 'T12:00:00')
    eventDateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '16 / 9',
        minHeight: { xs: 220, sm: 300 },
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid rgba(230,93,44,0.3)',
        boxShadow: '0 0 40px rgba(230,93,44,0.08)',
        background: '#060e24',
      }}
    >
      {/* Base radial glow */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 55%, rgba(14,40,110,0.85) 0%, rgba(6,14,36,0.98) 68%)',
        zIndex: 1,
      }} />

      {/* Diagonal stripe texture */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 2,
        backgroundImage: 'repeating-linear-gradient(55deg, rgba(230,93,44,0.025) 0px, rgba(230,93,44,0.025) 1px, transparent 1px, transparent 48px)',
      }} />

      {/* Top-left orange accent bar */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0,
        width: { xs: '38%', sm: '30%' }, height: '3px',
        background: 'linear-gradient(90deg, #e65d2c 0%, transparent 100%)',
        zIndex: 3,
      }} />
      {/* Bottom-right orange accent bar */}
      <Box sx={{
        position: 'absolute', bottom: 0, right: 0,
        width: { xs: '38%', sm: '30%' }, height: '3px',
        background: 'linear-gradient(270deg, #e65d2c 0%, transparent 100%)',
        zIndex: 3,
      }} />

      {/* Left vertical accent */}
      <Box sx={{
        position: 'absolute', top: '15%', bottom: '15%', left: 0,
        width: '3px',
        background: 'linear-gradient(180deg, transparent, #e65d2c 40%, #e65d2c 60%, transparent)',
        zIndex: 3,
      }} />
      {/* Right vertical accent */}
      <Box sx={{
        position: 'absolute', top: '15%', bottom: '15%', right: 0,
        width: '3px',
        background: 'linear-gradient(180deg, transparent, rgba(230,93,44,0.4) 40%, rgba(230,93,44,0.4) 60%, transparent)',
        zIndex: 3,
      }} />

      {/* Centered content */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 4,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: { xs: 1.5, sm: 2, md: 2.5 },
        px: 2,
      }}>

        {/* Logo */}
        <Box
          component="img"
          src="https://ribreakersac.com/cdn/shop/files/RI-Breakers-Logo-WHITE.png?v=1774997726&width=200"
          alt="Rhode Island Breakers"
          sx={{
            width: { xs: 64, sm: 88, md: 108 },
            height: { xs: 64, sm: 88, md: 108 },
            objectFit: 'contain',
            filter: 'drop-shadow(0 0 18px rgba(230,93,44,0.55)) drop-shadow(0 0 40px rgba(230,93,44,0.2))',
          }}
        />

        {/* Title block */}
        <Box sx={{ textAlign: 'center', lineHeight: 1 }}>
          <Typography
            sx={{
              fontFamily: "'Bayon', sans-serif",
              fontSize: { xs: '1.15rem', sm: '1.6rem', md: '2rem' },
              letterSpacing: '0.1em',
              color: '#fff',
              lineHeight: 1.1,
              textShadow: '0 2px 12px rgba(0,0,0,0.7)',
            }}
          >
            RHODE ISLAND BREAKERS
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.75rem' },
              letterSpacing: '0.22em',
              color: '#e65d2c',
              fontWeight: 700,
              fontFamily: "'Poppins', sans-serif",
              mt: 0.5,
            }}
          >
            THE CATCH PRO-AM 2026
          </Typography>
        </Box>

        {/* Divider */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', maxWidth: 360 }}>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(230,93,44,0.5))' }} />
          <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#a8bcd4', fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
            GOING LIVE IN
          </Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(270deg, transparent, rgba(230,93,44,0.5))' }} />
        </Box>

        {/* Countdown */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, sm: 1.5, md: 2 } }}>
          <CountdownUnit value={d} label="DAYS" />
          <Typography sx={{ color: '#e65d2c', fontSize: { xs: '1.6rem', sm: '2rem' }, fontFamily: "'Bayon', sans-serif", mt: { xs: '8px', sm: '10px' }, lineHeight: 1 }}>:</Typography>
          <CountdownUnit value={h} label="HRS" />
          <Typography sx={{ color: '#e65d2c', fontSize: { xs: '1.6rem', sm: '2rem' }, fontFamily: "'Bayon', sans-serif", mt: { xs: '8px', sm: '10px' }, lineHeight: 1 }}>:</Typography>
          <CountdownUnit value={m} label="MIN" />
          <Typography sx={{ color: '#e65d2c', fontSize: { xs: '1.6rem', sm: '2rem' }, fontFamily: "'Bayon', sans-serif", mt: { xs: '8px', sm: '10px' }, lineHeight: 1 }}>:</Typography>
          <CountdownUnit value={s} label="SEC" />
        </Box>

        {/* Event info */}
        {nextEvent && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: { xs: '0.65rem', sm: '0.72rem' }, color: 'rgba(168,188,212,0.8)', letterSpacing: '0.08em', fontFamily: "'Poppins', sans-serif" }}>
              {nextEvent.label}&nbsp;&nbsp;·&nbsp;&nbsp;{eventDateStr}&nbsp;&nbsp;·&nbsp;&nbsp;{nextEvent.start} {nextEvent.tz}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
