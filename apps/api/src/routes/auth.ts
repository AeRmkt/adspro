import type { FastifyInstance } from 'fastify'
import { metaApiService } from '../services/metaApi.js'
import { encrypt } from '../services/crypto.js'
import type { ConnectMetaRequest } from '@adspro/types'

export async function authRoutes(app: FastifyInstance): Promise<void> {
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
}
