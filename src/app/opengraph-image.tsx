import { ImageResponse } from 'next/og'
import { lightTheme } from '@/theme'

// Image shown when a link to the app is shared (WhatsApp, social networks, link previews).
// Same brand as the splash: the tilted forest tile with the lime dot, the name and the tagline.
export const alt = 'starpoint · Tu app de Pádel'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const dynamic = 'force-static'

const { colors } = lightTheme

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
          background: colors.background,
          color: colors.ink,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 200,
            height: 200,
            borderRadius: 62,
            background: colors.forest,
            transform: 'rotate(-7deg)',
          }}
        >
          <div style={{ width: 78, height: 78, borderRadius: '50%', background: colors.lime }} />
        </div>
        <div style={{ display: 'flex', fontSize: 132, fontWeight: 700, letterSpacing: -8, lineHeight: 1 }}>starpoint</div>
        <div style={{ display: 'flex', fontSize: 44, color: colors.muted }}>Tu app de Pádel</div>
      </div>
    ),
    size
  )
}
