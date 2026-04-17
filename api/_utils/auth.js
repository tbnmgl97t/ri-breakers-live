import { createHmac } from 'crypto'

export function generateToken() {
  return createHmac('sha256', process.env.ADMIN_SECRET || 'ri-breakers-fallback')
    .update('admin-session-v1')
    .digest('hex')
}

export function verifyToken(authHeader) {
  const token = (authHeader || '').replace('Bearer ', '').trim()
  return token.length > 0 && token === generateToken()
}
