import { ImageResponse } from 'next/og'
import { lightTheme } from '@/theme'

// App icon rendered from code: the logo's isotype (a tilted forest tile with a lime dot)
// centered on the page background. One URL per size, generated at build time:
//   /pwa-icon/180  iOS "add to home screen"
//   /pwa-icon/192  Android / notifications
//   /pwa-icon/512  favicon, splash and maskable
const SIZES = [180, 192, 512] as const

export function generateStaticParams() {
  return SIZES.map(size => ({ size: String(size) }))
}

export const dynamic = 'force-static'

// Proportions of the Logo component (32px tile, 10px radius, 12px dot)
// Largest tile whose rounded, tilted corners still fit the 80% circular "safe zone" of maskable
// icons (corner reach ≈ 0.393 of the icon, limit 0.40), so Android never crops it.
const TILE_RATIO = 0.68
const RADIUS_RATIO = 10 / 32
const DOT_RATIO = 12 / 32

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params
  const size = Number(raw)
  if (!SIZES.includes(size as (typeof SIZES)[number])) {
    return new Response('Not found', { status: 404 })
  }

  const tile = Math.round(size * TILE_RATIO)
  const dot = Math.round(tile * DOT_RATIO)

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: lightTheme.colors.background,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: tile,
            height: tile,
            borderRadius: Math.round(tile * RADIUS_RATIO),
            background: lightTheme.colors.forest,
            transform: 'rotate(-7deg)',
          }}
        >
          <div
            style={{
              width: dot,
              height: dot,
              borderRadius: '50%',
              background: lightTheme.colors.lime,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
