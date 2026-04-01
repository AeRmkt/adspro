import type { FastifyInstance } from 'fastify'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { metaApiService } from '../services/metaApi.js'
import { encrypt, decrypt } from '../services/crypto.js'
import type { ConnectMetaRequest } from '@adspro/types'

const META_API_VERSION = 'v19.0'
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`

function signState(payload: string): string {
  return createHmac('sha256', process.env.APP_SECRET!).update(payload).digest('hex')
}

function buildState(userId: string): string {
  const payload = `${userId}:${Date.now()}`
  const sig = signState(payload)
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

function verifyState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString()
    const parts = decoded.split(':')
    if (parts.length !== 3) return null
    const [userId, ts, sig] = parts
    // Estado expira em 10 minutos
    if (Date.now() - Number(ts) > 10 * 60 * 1000) return null
    const expected = signState(`${userId}:${ts}`)
    const expectedBuf = Buffer.from(expected)
    const sigBuf = Buffer.from(sig)
    if (expectedBuf.length !== sigBuf.length) return null
    if (!timingSafeEqual(expectedBuf, sigBuf)) return null
    return userId
  } catch {
    return null
  }
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ─── Manual: conectar conta via token ──────────────────────────────────────
  app.post<{ Body: ConnectMetaRequest }>(
    '/connect-meta',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { accessToken, adAccountId } = request.body

      if (!accessToken || !adAccountId) {
        return reply.status(400).send({ error: 'accessToken e adAccountId são obrigatórios' })
      }

      const cleanAccountId = adAccountId.replace(/^act_/, '')
      const { valid, accountName } = await metaApiService.validateToken(accessToken, cleanAccountId)

      if (!valid) {
        return reply.status(400).send({
          error: 'Token de acesso inválido ou conta não encontrada. Verifique suas credenciais.',
        })
      }

      const encryptedToken = encrypt(accessToken)

      await app.prisma.adAccount.upsert({
        where: { userId_metaAccountId: { userId: request.userId, metaAccountId: cleanAccountId } },
        create: { userId: request.userId, metaAccountId: cleanAccountId, metaAccessToken: encryptedToken, accountName, isActive: true },
        update: { metaAccessToken: encryptedToken, accountName, isActive: true, lastSyncAt: null },
      })

      return reply.send({ success: true, accountName })
    }
  )

  // ─── OAuth: gerar URL de autorização ───────────────────────────────────────
  app.get(
    '/meta/url',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const appId = process.env.META_APP_ID
      const callbackUrl = process.env.META_CALLBACK_URL

      if (!appId || !callbackUrl) {
        return reply.status(500).send({ error: 'Meta OAuth não configurado no servidor.' })
      }

      const state = buildState(request.userId)
      const scopes = [
        'ads_management',
        'ads_read',
        'business_management',
        'pages_read_engagement',
      ].join(',')

      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: callbackUrl,
        scope: scopes,
        response_type: 'code',
        state,
      })

      const url = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params}`
      return reply.send({ url })
    }
  )

  // ─── OAuth: callback do Facebook ───────────────────────────────────────────
  app.get<{ Querystring: { code?: string; state?: string; error?: string; error_description?: string } }>(
    '/meta/callback',
    async (request, reply) => {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
      const { code, state, error } = request.query

      if (error || !code || !state) {
        const reason = request.query.error_description || error || 'Acesso negado'
        return reply.redirect(`${frontendUrl}/auth/meta/callback?error=${encodeURIComponent(reason)}`)
      }

      const userId = verifyState(state)
      if (!userId) {
        return reply.redirect(`${frontendUrl}/auth/meta/callback?error=${encodeURIComponent('Estado inválido ou expirado')}`)
      }

      const appId = process.env.META_APP_ID!
      const appSecret = process.env.META_APP_SECRET!
      const callbackUrl = process.env.META_CALLBACK_URL!

      try {
        // 1. Trocar code por short-lived token
        const tokenRes = await fetch(
          `${META_GRAPH_URL}/oauth/access_token?` +
          new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: callbackUrl, code })
        )
        const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } }

        if (!tokenData.access_token) {
          const msg = tokenData.error?.message || 'Falha ao trocar código por token'
          return reply.redirect(`${frontendUrl}/auth/meta/callback?error=${encodeURIComponent(msg)}`)
        }

        // 2. Trocar por long-lived token (60 dias)
        const longRes = await fetch(
          `${META_GRAPH_URL}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: tokenData.access_token,
          })
        )
        const longData = await longRes.json() as {
          access_token?: string
          expires_in?: number
          error?: { message: string }
        }

        if (!longData.access_token) {
          const msg = longData.error?.message || 'Falha ao obter token de longa duração'
          return reply.redirect(`${frontendUrl}/auth/meta/callback?error=${encodeURIComponent(msg)}`)
        }

        const expiresIn = longData.expires_in ?? 60 * 24 * 60 * 60 // padrão: 60 dias
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000)

        // 3. Obter perfil do usuário Meta
        const meRes = await fetch(
          `${META_GRAPH_URL}/me?fields=id,name,email&access_token=${longData.access_token}`
        )
        const meData = await meRes.json() as {
          id?: string
          name?: string
          email?: string
          error?: { message: string }
        }

        if (!meData.id) {
          const msg = meData.error?.message || 'Falha ao obter dados do usuário Meta'
          return reply.redirect(`${frontendUrl}/auth/meta/callback?error=${encodeURIComponent(msg)}`)
        }

        // 4. Salvar no banco
        const encryptedToken = encrypt(longData.access_token)

        await app.prisma.facebookConnection.upsert({
          where: { userId },
          create: {
            userId,
            fbUserId: meData.id,
            fbUserName: meData.name ?? 'Usuário Meta',
            fbUserEmail: meData.email ?? null,
            accessToken: encryptedToken,
            tokenExpiresAt,
            tokenInvalid: false,
          },
          update: {
            fbUserId: meData.id,
            fbUserName: meData.name ?? 'Usuário Meta',
            fbUserEmail: meData.email ?? null,
            accessToken: encryptedToken,
            tokenExpiresAt,
            tokenInvalid: false,
          },
        })

        return reply.redirect(`${frontendUrl}/auth/meta/callback?success=true&name=${encodeURIComponent(meData.name ?? '')}`)
      } catch (err) {
        app.log.error(err, 'Erro no callback OAuth Meta')
        return reply.redirect(`${frontendUrl}/auth/meta/callback?error=${encodeURIComponent('Erro interno. Tente novamente.')}`)
      }
    }
  )

  // ─── OAuth: status da conexão ───────────────────────────────────────────────
  app.get(
    '/meta/status',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const connection = await app.prisma.facebookConnection.findUnique({
        where: { userId: request.userId },
        select: {
          id: true,
          userId: true,
          fbUserId: true,
          fbUserName: true,
          fbUserEmail: true,
          tokenExpiresAt: true,
          tokenInvalid: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return reply.send({
        connected: !!connection,
        connection: connection
          ? {
              ...connection,
              tokenExpiresAt: connection.tokenExpiresAt.toISOString(),
              createdAt: connection.createdAt.toISOString(),
              updatedAt: connection.updatedAt.toISOString(),
            }
          : null,
      })
    }
  )

  // ─── OAuth: desconectar ─────────────────────────────────────────────────────
  app.delete(
    '/meta',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const connection = await app.prisma.facebookConnection.findUnique({
        where: { userId: request.userId },
      })

      if (!connection) {
        return reply.status(404).send({ error: 'Nenhuma conexão Meta encontrada.' })
      }

      await app.prisma.facebookConnection.delete({
        where: { userId: request.userId },
      })

      return reply.send({ success: true })
    }
  )
}
