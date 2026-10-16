import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
  deleteEq: vi.fn(),
  after: vi.fn(),
  subs: [] as { id: string; endpoint: string; p256dh: string; auth: string }[],
  afterTask: undefined as Promise<unknown> | undefined,
}))

vi.mock('web-push', () => ({ default: { sendNotification: mocks.sendNotification, setVapidDetails: mocks.setVapidDetails } }))
vi.mock('next/server', () => ({ after: mocks.after }))
vi.mock('@/utils/supabase/admin', () => ({
  getAdminClient: () => ({
    from: () => ({
      select: () => ({ in: async () => ({ data: mocks.subs }) }),
      delete: () => ({ eq: mocks.deleteEq }),
    }),
  }),
}))

import { sendPushAfterResponse, sendPushToUsers } from './push'

const APPLE_OK = 'https://web.push.apple.com/secret-device-ok'
const APPLE_GONE = 'https://web.push.apple.com/secret-device-gone'
const GOOGLE_BAD = 'https://fcm.googleapis.com/fcm/send/secret-device-bad'
const payload = { title: 'Nuevo partido', body: 'Falta 1 jugador' }
const sub = (id: string, endpoint: string) => ({ id, endpoint, p256dh: 'p', auth: 'a' })

describe('sendPushToUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.subs = []
    mocks.deleteEq.mockResolvedValue({})
    mocks.after.mockImplementation((task: () => Promise<unknown>) => {
      mocks.afterTask = task()
    })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('sin claves VAPID no envía nada y no rompe', async () => {
    mocks.subs = [sub('1', APPLE_OK)]
    const result = await sendPushToUsers(['u1'], payload)
    expect(result.devices).toBe(0)
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  describe('con las claves configuradas', () => {
    beforeEach(() => {
      vi.stubEnv('VAPID_SUBJECT', 'mailto:test@example.com')
      vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'public')
      vi.stubEnv('VAPID_PRIVATE_KEY', 'private')
    })

    it('cuenta enviados, caducados y fallidos por servicio, y borra solo los caducados', async () => {
      mocks.subs = [sub('ok', APPLE_OK), sub('gone', APPLE_GONE), sub('bad', GOOGLE_BAD)]
      mocks.sendNotification.mockImplementation(async (target: { endpoint: string }) => {
        if (target.endpoint === APPLE_GONE) throw Object.assign(new Error('gone'), { statusCode: 410 })
        if (target.endpoint === GOOGLE_BAD) throw Object.assign(new Error('forbidden'), { statusCode: 403, body: 'BadJwtToken' })
      })

      const result = await sendPushToUsers(['u1', 'u2'], payload)

      expect(result).toEqual({
        devices: 3,
        sent: 1,
        removed: 1,
        failed: 1,
        services: { apple: 2, google: 1 },
        errors: { 'apple:410': 1, 'google:403': 1 },
      })
      expect(mocks.deleteEq).toHaveBeenCalledTimes(1)
      expect(mocks.deleteEq).toHaveBeenCalledWith('id', 'gone')
    })

    it('registra una sola línea y no deja ninguna dirección de dispositivo en el log', async () => {
      mocks.subs = [sub('ok', APPLE_OK), sub('bad', GOOGLE_BAD)]
      mocks.sendNotification.mockImplementation(async (target: { endpoint: string }) => {
        if (target.endpoint === GOOGLE_BAD) throw Object.assign(new Error('forbidden'), { statusCode: 403, body: 'BadJwtToken' })
      })

      await sendPushToUsers(['u1'], payload)

      expect(console.log).toHaveBeenCalledTimes(1)
      const logged = [...vi.mocked(console.log).mock.calls, ...vi.mocked(console.error).mock.calls].flat().join(' ')
      expect(logged).toContain('[push]')
      expect(logged).toContain('BadJwtToken')
      expect(logged).not.toContain('secret-device')
    })

    it('un dispositivo que falla sin código no impide avisar a los demás', async () => {
      mocks.subs = [sub('a', APPLE_OK), sub('b', GOOGLE_BAD)]
      mocks.sendNotification.mockImplementation(async (target: { endpoint: string }) => {
        if (target.endpoint === GOOGLE_BAD) throw new Error('network down')
      })
      const result = await sendPushToUsers(['u1'], payload)
      expect(result.sent).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toEqual({ 'google:sin-código': 1 })
      expect(mocks.deleteEq).not.toHaveBeenCalled()
    })

    it('no hace nada sin destinatarios ni con PUSH_DISABLED', async () => {
      mocks.subs = [sub('a', APPLE_OK)]
      expect((await sendPushToUsers([], payload)).devices).toBe(0)
      vi.stubEnv('PUSH_DISABLED', 'true')
      expect((await sendPushToUsers(['u1'], payload)).devices).toBe(0)
      expect(mocks.sendNotification).not.toHaveBeenCalled()
    })

    it('sendPushAfterResponse entrega el envío a after() para que la función no se congele a medias', async () => {
      mocks.subs = [sub('a', APPLE_OK)]
      sendPushAfterResponse(['u1'], payload)

      expect(mocks.after).toHaveBeenCalledTimes(1)
      await mocks.afterTask
      expect(mocks.sendNotification).toHaveBeenCalledTimes(1)
    })
  })
})
