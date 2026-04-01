import type { FastifyInstance } from 'fastify'
import { metaApiService, MetaTokenInvalidError } from '../services/metaApi.js'
import { decrypt, encrypt } from '../services/crypto.js'

export async function metaRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/meta/ad-accounts
  // Busca as contas de anúncio disponíveis via token OAuth, sincroniza com o banco e retorna a lista
  app.get(
    '/ad-accounts',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      // 1. Buscar conexão OAuth do usuário
      const connection = await app.prisma.facebookConnection.findUnique({
        where: { userId: request.userId },
      })

      if (!connection) {
        return reply.status(404).send({ error: 'Conta Meta não conectada. Conecte sua conta primeiro.' })
      }

      if (connection.tokenInvalid) {
        return reply.status(401).send({
          error: 'Token expirado. Reconecte sua conta Meta.',
          code: 'TOKEN_INVALID',
        })
      }

      // 2. Descriptografar token
      let accessToken: string
      try {
        accessToken = decrypt(connection.accessToken)
      } catch {
        return reply.status(500).send({ error: 'Erro ao processar credenciais Meta.' })
      }

      // 3. Buscar contas de anúncio na Meta API
      let rawAccounts
      try {
        rawAccounts = await metaApiService.getAdAccounts(accessToken)
      } catch (err) {
        if (err instanceof MetaTokenInvalidError) {
          // Marcar token como inválido no banco
          await app.prisma.facebookConnection.update({
            where: { userId: request.userId },
            data: { tokenInvalid: true },
          })
          return reply.status(401).send({
            error: 'Token expirado. Reconecte sua conta Meta.',
            code: 'TOKEN_INVALID',
          })
        }
        app.log.error(err, 'Erro ao buscar ad accounts da Meta API')
        return reply.status(502).send({ error: 'Erro ao comunicar com a Meta API. Tente novamente.' })
      }

      if (rawAccounts.length === 0) {
        return reply.send({ data: [] })
      }

      // 4. Upsert no banco — cada conta de anúncio (source='oauth')
      const encryptedToken = encrypt(accessToken)
      const now = new Date()

      const upserted = await Promise.all(
        rawAccounts.map(async (raw) => {
          // Meta retorna id como "act_XXXXXXXX" — armazenamos sem o prefixo
          const metaAccountId = raw.id.replace(/^act_/, '')

          return app.prisma.adAccount.upsert({
            where: { userId_metaAccountId: { userId: request.userId, metaAccountId } },
            create: {
              userId: request.userId,
              metaAccountId,
              metaAccessToken: encryptedToken,
              accountName: raw.name,
              accountStatus: raw.account_status,
              currency: raw.currency,
              timezone: raw.timezone_name,
              isActive: raw.account_status === 1,
              source: 'oauth',
              lastSyncAt: now,
            },
            update: {
              metaAccessToken: encryptedToken,
              accountName: raw.name,
              accountStatus: raw.account_status,
              currency: raw.currency,
              timezone: raw.timezone_name,
              isActive: raw.account_status === 1,
              lastSyncAt: now,
            },
            select: {
              id: true,
              metaAccountId: true,
              accountName: true,
              accountStatus: true,
              currency: true,
              timezone: true,
              isActive: true,
              source: true,
              connectedAt: true,
              lastSyncAt: true,
            },
          })
        })
      )

      return reply.send({ data: upserted })
    }
  )
}
