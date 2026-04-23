/**
 * Shared helpers for reading / writing the `tenant` Edge Config key.
 *
 * Tenant config shape:
 * {
 *   id: string,
 *   title: string,
 *   subtitle: string,
 *   logo_url: string,
 *   colors: { primary, secondary, background, paper },
 *   components: {
 *     video_player, camera_selector, event_schedule,
 *     command_center, pre_show_screen
 *   }
 * }
 */

const EC_ID        = process.env.EDGE_CONFIG_ID
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN

export const DEFAULT_TENANT = {
  id:       'eventhub-live',
  title:    'EventHub Live',
  subtitle: 'Live Event Streaming Platform',
  logo_url: '',
  timezone: 'ET',
  colors: {
    primary:    '#e65d2c',
    secondary:  '#0a205a',
    background: '#060e24',
    paper:      '#0d1e42',
  },
  components: {
    video_player:    true,
    camera_selector: true,
    event_schedule:  true,
    command_center:  true,
    pre_show_screen: true,
  },
}

export async function readTenant() {
  if (!EC_ID || !VERCEL_TOKEN) return { ...DEFAULT_TENANT }
  try {
    const res = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/item/tenant`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    if (res.ok) {
      const item = await res.json()
      if (item?.value) {
        // Deep-merge colors and components so partial configs still work
        return {
          ...DEFAULT_TENANT,
          ...item.value,
          colors:     { ...DEFAULT_TENANT.colors,     ...(item.value.colors     || {}) },
          components: { ...DEFAULT_TENANT.components, ...(item.value.components || {}) },
        }
      }
    }
    // First run — seed defaults so admin can edit them
    writeTenant(DEFAULT_TENANT).catch(err => console.error('[tenant] seed failed:', err.message))
    return { ...DEFAULT_TENANT }
  } catch (err) {
    console.error('[tenant] read error:', err.message)
    return { ...DEFAULT_TENANT }
  }
}

export async function writeTenant(tenant) {
  const res = await fetch(
    `https://api.vercel.com/v1/edge-config/${EC_ID}/items`,
    {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items: [{ operation: 'upsert', key: 'tenant', value: tenant }] }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Write failed: ${res.status} — ${text}`)
  }
}
