import { createHmac } from 'crypto'

const SECRET  = () => process.env.ADMIN_SECRET || 'ri-breakers-fallback'
const TTL_MS  = 24 * 60 * 60 * 1000 // 24 hours

// Round down to the current 24-hour window so tokens stay valid for the whole day
function currentWindow() {
  return Math.floor(Date.now() / TTL_MS)
}

function sign(window) {
  return createHmac('sha256', SECRET())
    .update(`admin-session-v1:${window}`)
    .digest('hex')
}

export function generateToken() {
  return `${currentWindow()}.${sign(currentWindow())}`
}

export function verifyToken(authHeader) {
  const raw = (authHeader || '').replace(/^Bearer\s+/i, '').trim()
  if (!raw) return false

  const [windowStr, sig] = raw.split('.')
  if (!windowStr || !sig) return false

  const window = parseInt(windowStr, 10)
  if (isNaN(window)) return false

  // Accept current window and the previous one (handles tokens issued near midnight)
  const now = currentWindow()
  if (window !== now && window !== now - 1) return false

  return sig === sign(window)
}
